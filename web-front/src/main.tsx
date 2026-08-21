import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";

/**
 * 前台应用入口
 * 功能说明：挂载 React 根节点并渲染 App；生产环境禁止 React DevTools 提示（PRD 9.5）。
 */
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
