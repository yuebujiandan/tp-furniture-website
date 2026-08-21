import { HashRouter } from "react-router-dom";
import AdminRouter from "./router";

/**
 * 后台应用根组件
 * 功能说明：使用 HashRouter（后台以静态资源部署在 Nginx /admin 下，
 * hash 路由避免刷新时 404 问题；技术文档 §10.3 SPA 回退）。
 */
export default function App() {
  return (
    <HashRouter>
      <AdminRouter />
    </HashRouter>
  );
}
