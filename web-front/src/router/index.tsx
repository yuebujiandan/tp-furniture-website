import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Layout from "../components/layout/Layout";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Placeholder from "../pages/Placeholder";
import ProductList from "../pages/ProductList";
import ProductDetail from "../pages/ProductDetail";
import CaseList from "../pages/CaseList";
import CaseDetail from "../pages/CaseDetail";
import NewsList from "../pages/NewsList";
import NewsDetail from "../pages/NewsDetail";
import About from "../pages/About";
import Contact from "../pages/Contact";
import UserLayout from "../pages/user/UserLayout";
import Profile from "../pages/user/Profile";
import MyAppointments from "../pages/user/MyAppointments";
import MyContracts from "../pages/user/MyContracts";
import MyFavorites from "../pages/user/MyFavorites";
import MyMessages from "../pages/user/MyMessages";
import Franchise from "../pages/Franchise";
import Engineering from "../pages/Engineering";
import Inquiry from "../pages/Inquiry";
import Recruit from "../pages/Recruit";
import RecruitDetail from "../pages/RecruitDetail";
import RecruitQuery from "../pages/RecruitQuery";
import DealerPortal from "../pages/dealer/DealerPortal";
import { useAuthStore } from "../stores/auth";

/**
 * 前台路由表（P3：用户中心 5 个子页面接入真实组件）
 * 实现说明：
 * - 公开页：首页/产品/案例/新闻/关于/联系；
 * - 用户中心 /user/*：未登录 → 跳 /login 携带 redirect 回跳（PRD 6.7.3）；
 *   UserLayout 侧栏 + 子路由（资料/预约/签单/收藏/留言）；
 * - 经销商门户 /dealer/*：非 dealer 引导认证（PRD 6.9.5，P4 完善）；
 * - 加盟/工程/招聘页面 P4 交付，当前占位。
 */

/** 登录守卫：未登录跳转登录页（携带回跳地址） */
function RequireAuth({ children }: { children: JSX.Element }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const location = useLocation();
  if (!isLoggedIn) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return children;
}

export default function AppRouter() {
  return (
    <Routes>
      {/* 全局布局：Nav + Footer + Toast + 浮窗 */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        {/* 产品中心（列表 + 详情） */}
        <Route path="products" element={<ProductList />} />
        <Route path="products/:id" element={<ProductDetail />} />
        {/* 实景案例（列表 + 详情） */}
        <Route path="cases" element={<CaseList />} />
        <Route path="cases/:id" element={<CaseDetail />} />
        {/* 新闻资讯（列表 + 详情） */}
        <Route path="news" element={<NewsList />} />
        <Route path="news/:id" element={<NewsDetail />} />
        {/* 关于我们 / 联系我们 */}
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        {/* ---- P4 B 端业务与招聘 ---- */}
        <Route path="franchise" element={<Franchise />} />
        <Route path="engineering" element={<Engineering />} />
        <Route path="inquiry" element={<Inquiry />} />
        <Route path="recruit" element={<Recruit />} />
        <Route path="recruit/:id" element={<RecruitDetail />} />
        <Route path="recruit/query" element={<RecruitQuery />} />

        {/* 用户中心（需登录，P3 交付 5 个子页面） */}
        <Route
          path="user"
          element={
            <RequireAuth>
              <UserLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/user/profile" replace />} />
          <Route path="profile" element={<Profile />} />
          <Route path="appointments" element={<MyAppointments />} />
          <Route path="contracts" element={<MyContracts />} />
          <Route path="favorites" element={<MyFavorites />} />
          <Route path="messages" element={<MyMessages />} />
        </Route>

        {/* 经销商门户（需登录；未认证展示认证申请表单，PRD 6.9.5） */}
        <Route
          path="dealer"
          element={
            <RequireAuth>
              <DealerPortal />
            </RequireAuth>
          }
        />
      </Route>

      {/* 登录页（独立于布局，全屏） */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Placeholder title="注册" />} />
      <Route path="*" element={<Placeholder title="页面不存在" />} />
    </Routes>
  );
}
