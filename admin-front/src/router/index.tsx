import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import AdminLayout from "../layouts/AdminLayout";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Placeholder from "../pages/Placeholder";
import Series from "../pages/Series";
import Spaces from "../pages/Spaces";
import ProductList from "../pages/ProductList";
import News from "../pages/News";
import Cases from "../pages/Cases";
import Banners from "../pages/Banners";
import Stores from "../pages/Stores";
import Messages from "../pages/Messages";
import Appointments from "../pages/Appointments";
import Contracts from "../pages/Contracts";
import UserList from "../pages/UserList";
import BizManagement from "../pages/BizManagement";
import RecruitManage from "../pages/RecruitManage";
import Dealers from "../pages/Dealers";
import Announcements from "../pages/Announcements";
import Statistics from "../pages/Statistics";
import Admins from "../pages/Admins";
import Roles from "../pages/Roles";
import Logs from "../pages/Logs";
import Configs from "../pages/Configs";

/**
 * 后台路由（技术文档 §8.2.2：路由守卫未登录跳 /login，PRD 7.0）
 * 实现说明：
 * - /admin 前缀整体为后台应用（HashRouter）；
 * - 登录页独立；其余页面在 AdminLayout（侧栏+顶栏）内渲染；
 * - P2 已接入：产品管理（系列/空间/产品）、内容管理（新闻/案例/Banner/门店）、留言管理；
 * - 其余模块 P3-P5 交付，当前占位。
 */
function RequireAdmin({ children }: { children: JSX.Element }) {
  const isLoggedIn = useSelector((s: RootState) => s.auth.isLoggedIn);
  const location = useLocation();
  if (!isLoggedIn) {
    return <Navigate to={`/admin/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return children;
}

export default function AdminRouter() {
  return (
    <Routes>
      {/* 登录页（独立，无布局） */}
      <Route path="/admin/login" element={<Login />} />

      {/* 受保护布局 */}
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        {/* 默认重定向到总览看板 */}
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        {/* ---- P2 产品管理 ---- */}
        <Route path="series" element={<Series />} />
        <Route path="spaces" element={<Spaces />} />
        <Route path="product-list" element={<ProductList />} />
        {/* ---- P2 内容管理 ---- */}
        <Route path="news" element={<News />} />
        <Route path="cases" element={<Cases />} />
        <Route path="banners" element={<Banners />} />
        <Route path="stores" element={<Stores />} />
        {/* ---- P2 用户与咨询：留言 ---- */}
        <Route path="messages" element={<Messages />} />
        {/* ---- P3 用户与预约/签单 ---- */}
        <Route path="user-list" element={<UserList />} />
        <Route path="dealers" element={<Dealers />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="contract-list" element={<Contracts />} />
        {/* ---- P4 B 端与招聘/公告 ---- */}
        <Route path="franchise" element={<BizManagement />} />
        <Route path="inquiries" element={<BizManagement />} />
        <Route path="engineering" element={<BizManagement />} />
        <Route path="jobs" element={<RecruitManage />} />
        <Route path="resumes" element={<RecruitManage />} />
        <Route path="announcements" element={<Announcements />} />
        {/* ---- P5 统计与系统管理 ---- */}
        <Route path="statistics" element={<Statistics />} />
        <Route path="admins" element={<Admins />} />
        <Route path="roles" element={<Roles />} />
        <Route path="logs" element={<Logs />} />
        <Route path="configs" element={<Configs />} />
        {/* ---- 待后续补充 ---- */}
        {["about", "dealer-intents"].map((k) => (
          <Route key={k} path={k} element={<Placeholder title={k} />} />
        ))}
      </Route>

      {/* 其他路径 → 后台根 */}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
