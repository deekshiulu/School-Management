import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/school-managemnet/",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": "http://localhost:8080",
      "/v3": "http://localhost:8080",
      "/swagger-ui": "http://localhost:8080"
    },
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      ".trycloudflare.com"
    ]
  },
  preview: {
    host: "0.0.0.0",
    port: 4173
  }
});
