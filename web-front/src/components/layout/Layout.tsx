import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Nav from "./Nav";
import Footer from "./Footer";
import FloatingPanel from "./FloatingPanel";
import ToastContainer from "../Toast";
import { useAuthStore } from "../../stores/auth";

/**
 * 前台布局骨架（技术文档 §7.1：Nav + 内容 + Footer + FloatingPanel）
 * 功能说明：
 * - 统一加载导航/页脚/全局 Toast/咨询浮窗；
 * - 首次挂载时恢复登录态（init：GET /auth/me，PRD 6.7.3）；
 * - 内容区上边距 80px 避让吸顶导航。
 */
export default function Layout() {
  const init = useAuthStore((s) => s.init);

  // 应用启动时恢复登录态（页面刷新保持登录 30 天）
  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      {/* 主内容区：pt-[80px] 避让吸顶导航 */}
      <main className="flex-1 pt-[80px]">
        <Outlet />
      </main>
      <Footer />
      {/* 右侧咨询浮窗 + 返回顶部（UIUX §4.1 z-150） */}
      <FloatingPanel />
      <ToastContainer />
    </div>
  );
}
