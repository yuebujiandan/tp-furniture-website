import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * 前台工程 Vite 配置（技术文档 §7.1）
 * 功能说明：开发期将 /api 与 /static 请求代理到后端 8000 端口（零 CORS，生产由 Nginx 同源转发）。
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // API 请求代理到 FastAPI 后端
      "/api": { target: "http://localhost:8000", changeOrigin: true },
      // 静态上传文件代理（图片/附件访问）
      "/static": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
});
