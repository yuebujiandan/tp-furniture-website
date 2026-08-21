import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * 后台工程 Vite 配置（技术文档 §8.1）
 * 功能说明：开发端口 5174；/api 与 /static 代理到后端 8000（生产由 Nginx 转发）。
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": { target: "http://localhost:8000", changeOrigin: true },
      "/static": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
});
