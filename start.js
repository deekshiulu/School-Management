/**
 * Unified Process Orchestrator for School Management Platform
 * 
 * Runs all services concurrently from a single command:
 *   - Spring Boot Backend (Port 8080)
 *   - Admin Portal (Port 5173)
 *   - Teacher Portal (Port 5174)
 * 
 * Usage:
 *   npm start                   -> Starts Backend + Admin + Teacher
 *   npm run dev                 -> Starts Backend + Admin + Teacher
 *   npm run dev:frontends       -> Starts Admin + Teacher only
 *   npm run prod                -> Starts production builds
 */

import { spawn, execSync } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import net from "net";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWindows = process.platform === "win32";
const args = process.argv.slice(2);
const frontendsOnly = args.includes("--frontends") || args.includes("--no-backend");
const isProd = args.includes("--prod");

// Color codes for readable unified output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  backend: "\x1b[36m",  // Cyan
  admin: "\x1b[32m",    // Green
  teacher: "\x1b[35m",  // Magenta
  system: "\x1b[33m",   // Yellow
  error: "\x1b[31m",    // Red
};

function logSystem(msg) {
  console.log(`${colors.system}${colors.bright}[SYSTEM]${colors.reset} ${msg}`);
}

function logError(msg) {
  console.error(`${colors.error}${colors.bright}[ERROR]${colors.reset} ${msg}`);
}

// Check if a port is open
function checkPortInUse(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once("error", (err) => {
        if (err.code === "EADDRINUSE") resolve(true);
        else resolve(false);
      })
      .once("listening", () => {
        tester.once("close", () => resolve(false)).close();
      })
      .listen(port);
  });
}

const processes = [];

function registerProcess(name, color, commandStr, cwd) {
  logSystem(`Starting ${colors.bright}${name}${colors.reset} in ${path.relative(__dirname, cwd) || "."}...`);
  
  const child = spawn(commandStr, {
    cwd,
    shell: true,
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  processes.push({ name, child });

  const prefix = `${color}${colors.bright}[${name}]${colors.reset} `;

  child.stdout?.on("data", (data) => {
    const lines = data.toString().split(/\r?\n/);
    for (const line of lines) {
      if (line.trim().length > 0) {
        process.stdout.write(prefix + line + "\n");
      }
    }
  });

  child.stderr?.on("data", (data) => {
    const lines = data.toString().split(/\r?\n/);
    for (const line of lines) {
      if (line.trim().length > 0) {
        process.stderr.write(prefix + line + "\n");
      }
    }
  });

  child.on("close", (code) => {
    logSystem(`${name} process exited with code ${code}`);
  });

  child.on("error", (err) => {
    logError(`${name} failed to start: ${err.message}`);
  });

  return child;
}

// Graceful cleanup of all processes on termination
function cleanup() {
  logSystem("Shutting down running services...");
  for (const { name, child } of processes) {
    if (child && !child.killed) {
      if (isWindows && child.pid) {
        try {
          execSync(`taskkill /pid ${child.pid} /t /f`, { stdio: "ignore" });
        } catch {
          try { child.kill("SIGTERM"); } catch {}
        }
      } else {
        try { child.kill("SIGTERM"); } catch {}
      }
    }
  }
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

async function main() {
  console.log(`
${colors.bright}=======================================================
   🏫 School Management Platform - Unified Runner
=======================================================${colors.reset}
  Mode: ${isProd ? "PRODUCTION" : "DEVELOPMENT"}
  Target Services: ${frontendsOnly ? "Frontends Only" : "Full Stack (Backend + Admin + Teacher)"}
`);

  // Check port availability
  const portChecks = [
    { name: "Backend", port: 8080, active: !frontendsOnly },
    { name: "Admin Portal", port: 5173, active: true },
    { name: "Teacher Portal", port: 5174, active: true },
  ];

  for (const check of portChecks) {
    if (check.active) {
      const inUse = await checkPortInUse(check.port);
      if (inUse) {
        logSystem(`Notice: Port ${check.port} (${check.name}) is currently in use.`);
      }
    }
  }

  // 1. Start Backend (if not skipped)
  if (!frontendsOnly) {
    const backendDir = path.join(__dirname, "backend");
    const mvnwCmd = isWindows ? ".\\mvnw.cmd" : "./mvnw";
    
    // Look for built JAR first if in prod mode
    const targetDir = path.join(backendDir, "target");
    let jarFile = null;
    if (isProd && fs.existsSync(targetDir)) {
      const files = fs.readdirSync(targetDir);
      jarFile = files.find((f) => f.endsWith(".jar") && !f.endsWith(".original"));
    }

    if (jarFile) {
      logSystem(`Found pre-built JAR: ${jarFile}`);
      registerProcess(
        "BACKEND",
        colors.backend,
        `java -Dspring.profiles.active=dev -jar ${path.join("target", jarFile)}`,
        backendDir
      );
    } else {
      const defaultJdk21 = "C:\\Program Files\\Java\\jdk-21";
      if (isWindows && !process.env.JAVA_HOME && fs.existsSync(defaultJdk21)) {
        process.env.JAVA_HOME = defaultJdk21;
      }
      
      registerProcess(
        "BACKEND",
        colors.backend,
        `${mvnwCmd} spring-boot:run -Dspring-boot.run.profiles=dev`,
        backendDir
      );
    }
  }

  // 2. Start Admin Frontend (Port 5173)
  const adminDir = path.join(__dirname, "frontend");
  if (fs.existsSync(adminDir)) {
    const adminCmd = isProd ? "npm run preview" : "npm run dev";
    registerProcess("ADMIN  ", colors.admin, adminCmd, adminDir);
  } else {
    logError("frontend directory not found!");
  }

  // 3. Start Teacher Portal (Port 5174)
  const teacherDir = path.join(__dirname, "School-Teacher-Portal-main", "School-Teacher-Portal-main");
  if (fs.existsSync(teacherDir)) {
    const teacherCmd = isProd ? "npm run preview" : "npm run dev";
    registerProcess("TEACHER", colors.teacher, teacherCmd, teacherDir);
  } else {
    logError("School-Teacher-Portal-main directory not found!");
  }

  logSystem("All services initiated. Press Ctrl+C at any time to gracefully terminate all processes.");
}

main();
