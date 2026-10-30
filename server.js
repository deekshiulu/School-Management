/**
 * Production Gateway & Static File Server for School Management Platform
 * 
 * In production / deployment:
 *   - Serves Admin Portal (frontend/dist) at http://localhost:3000/
 *   - Serves Teacher Portal (School-Teacher-Portal-main/.../dist) at http://localhost:3000/teacher/
 *   - Transparently reverse-proxies /api/* to Spring Boot Backend (http://localhost:8080)
 * 
 * Usage:
 *   node server.js
 */

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

const adminDist = path.join(__dirname, "frontend", "dist");
const teacherDist = path.join(__dirname, "School-Teacher-Portal-main", "School-Teacher-Portal-main", "dist");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

function serveStatic(req, res, baseDir, relativePath, fallbackFile) {
  let safePath = path.normalize(decodeURIComponent(relativePath)).replace(/^(\.\.[\/\\])+/, "");
  let filePath = path.join(baseDir, safePath);

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        // SPA Fallback
        if (fallbackFile && fs.existsSync(fallbackFile)) {
          fs.readFile(fallbackFile, (fallbackErr, fallbackContent) => {
            if (fallbackErr) {
              res.writeHead(404, { "Content-Type": "text/plain" });
              res.end("Not Found");
            } else {
              res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
              res.end(fallbackContent);
            }
          });
          return;
        }
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    });
  });
}

// Reverse proxy for backend APIs
function proxyRequest(req, res) {
  const targetUrl = new URL(req.url, BACKEND_URL);

  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || 8080,
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers: {
      ...req.headers,
      host: targetUrl.host,
      "x-forwarded-for": req.socket.remoteAddress,
      "x-forwarded-proto": req.headers["x-forwarded-proto"] || "http",
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", (err) => {
    console.error(`[PROXY ERROR] Failed to connect to Backend at ${BACKEND_URL}: ${err.message}`);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      success: false,
      message: `Cannot reach backend API server at ${BACKEND_URL}. Ensure Spring Boot is running.`,
    }));
  });

  req.pipe(proxyReq, { end: true });
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;

  // 1. Health check
  if (pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "UP", timestamp: new Date().toISOString() }));
    return;
  }

  // 2. API Proxy
  if (pathname.startsWith("/api/") || pathname.startsWith("/v3/api-docs") || pathname.startsWith("/swagger-ui")) {
    proxyRequest(req, res);
    return;
  }

  // 3. Teacher Portal (at /teacher or /School-Teacher-Portal)
  if (pathname.startsWith("/teacher") || pathname.startsWith("/School-Teacher-Portal")) {
    const subPath = pathname.replace(/^\/(teacher|School-Teacher-Portal)\/?/, "");
    serveStatic(req, res, teacherDist, subPath, path.join(teacherDist, "index.html"));
    return;
  }

  // 4. Admin Portal (default at /)
  serveStatic(req, res, adminDist, pathname, path.join(adminDist, "index.html"));
});

server.listen(PORT, () => {
  console.log(`
=======================================================
   🚀 School Management Platform - Production Server
=======================================================
   Listening on:       http://localhost:${PORT}
   Admin Portal:       http://localhost:${PORT}/
   Teacher Portal:     http://localhost:${PORT}/teacher/
   Backend API Target: ${BACKEND_URL}
=======================================================
  `);
});

