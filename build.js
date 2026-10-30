/**
 * Unified Build Script for School Management Platform
 * 
 * Builds all components for production deployment:
 *   1. Admin Portal (Vite -> frontend/dist)
 *   2. Teacher Portal (TypeScript & Vite -> School-Teacher-Portal-main/.../dist)
 *   3. Spring Boot Backend (Maven -> backend/target/*.jar)
 * 
 * Usage:
 *   node build.js
 */

import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isWindows = process.platform === "win32";

// Configure default JDK 21 on Windows if not set
const defaultJdk21 = "C:\\Program Files\\Java\\jdk-21";
if (isWindows && !process.env.JAVA_HOME && fs.existsSync(defaultJdk21)) {
  process.env.JAVA_HOME = defaultJdk21;
}

function runStep(title, command, args, cwd) {
  return new Promise((resolve, reject) => {
    console.log(`\n=======================================================`);
    console.log(`🔨 [BUILD] ${title}`);
    console.log(`   Running: ${command} ${args.join(" ")} in ${path.relative(__dirname, cwd)}`);
    console.log(`=======================================================`);

    const child = spawn(command, args, {
      cwd,
      shell: true,
      stdio: "inherit",
      env: { ...process.env, FORCE_COLOR: "1" },
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log(`✅ [BUILD] ${title} completed successfully.`);
        resolve();
      } else {
        reject(new Error(`${title} failed with exit code ${code}`));
      }
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}

async function buildAll() {
  const startTime = Date.now();
  console.log("🚀 Starting unified platform build...");

  try {
    // 1. Build Admin Frontend
    const adminDir = path.join(__dirname, "frontend");
    await runStep("Admin Portal Frontend", "npm", ["run", "build"], adminDir);

    // 2. Build Teacher Portal
    const teacherDir = path.join(__dirname, "School-Teacher-Portal-main", "School-Teacher-Portal-main");
    await runStep("Teacher Portal Frontend", "npm", ["run", "build"], teacherDir);

    // 3. Build Backend JAR
    const backendDir = path.join(__dirname, "backend");
    const mvnwCmd = isWindows ? ".\\mvnw.cmd" : "./mvnw";
    await runStep("Spring Boot Backend JAR", mvnwCmd, ["clean", "package", "-DskipTests"], backendDir);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n🎉 =======================================================`);
    console.log(`   ALL BUILDS SUCCEEDED in ${duration}s!`);
    console.log(`   - Admin:   frontend/dist`);
    console.log(`   - Teacher: School-Teacher-Portal-main/School-Teacher-Portal-main/dist`);
    console.log(`   - Backend: backend/target/*.jar`);
    console.log(`=======================================================`);
  } catch (error) {
    console.error(`\n❌ BUILD FAILED: ${error.message}`);
    process.exit(1);
  }
}

buildAll();

