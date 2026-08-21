import { BrowserRouter } from "react-router-dom";
import AppRouter from "./router";

/**
 * 前台应用根组件
 * 功能说明：使用 BrowserRouter 包裹路由（SPA 客户端路由），路由表见 src/router/index.tsx。
 */
export default function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
