import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/auth";

/**
 * 前台顶部导航（UIUX §5.1：固定吸顶 80px 深色毛玻璃 + 五主菜单 + 工具区）
 * 功能说明：
 * - 滚动后加深背景（rgba(8,24,15,.88)）+ 金色底边线（电影光影）；
 * - 激活菜单项金色文字 + 底部金色渐变细线；
 * - 工具区：搜索 / 预约到店（金按钮）/ 登录或用户中心；
 * - ≤768px 隐藏菜单与登录，显示汉堡按钮（Drawer 在 P2 完善）。
 */

/** 主导航菜单项（对应 PRD §6 路由） */
const NAV_ITEMS = [
  { label: "首页", to: "/" },
  { label: "产品中心", to: "/products" },
  { label: "实景案例", to: "/cases" },
  { label: "新闻资讯", to: "/news" },
  { label: "招聘", to: "/recruit" },
  { label: "关于我们", to: "/about" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const { isLoggedIn, user, logout } = useAuthStore();

  // 监听滚动：超过 10px 加深导航背景（UIUX §5.1 scrolled 态）
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "fixed top-0 left-0 right-0 z-[100] transition-all duration-300",
        // 默认毛玻璃（rgba(10,30,20,.55) + blur）→ 滚动加深（UIUX §5.1）
        scrolled ? "bg-[rgba(8,24,15,.88)] shadow-md" : "bg-[rgba(10,30,20,.55)] backdrop-blur-md",
      ].join(" ")}
    >
      {/* 滚动后底部金色细线（电影光影） */}
      {scrolled && <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />}

      <nav className="max-w-[1280px] mx-auto px-6 h-[80px] flex items-center justify-between">
        {/* Logo：金色渐变方形徽标 + 衬线品牌名（UIUX §5.1） */}
        <Link to="/" className="flex items-center gap-3" aria-label="TP全屋家居 首页">
          <span className="w-[46px] h-[46px] rounded-xl bg-gradient-to-br from-[#E8CE8A] via-[#C9A227] to-[#A8862A] text-[#1B2A20] font-extrabold flex items-center justify-center shadow-gold">
            TP
          </span>
          <span className="font-serif-title text-lg tracking-[3px] text-cream">TP全屋家居</span>
        </Link>

        {/* 桌面菜单（≤768px 隐藏） */}
        <div className="hidden lg:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                [
                  "px-4 py-2.5 rounded-[10px] text-sm tracking-wider transition-colors",
                  // 激活态：金色文字 + 底部金色渐变细线（UIUX §5.1 active）
                  isActive
                    ? "text-gold-soft border-b-2 border-gold"
                    : "text-cream-2 hover:text-gold-soft hover:bg-gold/10",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* 工具区：联系我们 + 登录/用户（≤768px 隐藏） */}
        <div className="hidden lg:flex items-center gap-3">
          <button
            onClick={() => navigate("/contact")}
            className="px-6 py-2.5 rounded-full bg-gradient-to-br from-[#E8CE8A] via-[#C9A227] to-[#A8862A] text-[#1B2A20] font-semibold text-sm shadow-gold hover:-translate-y-0.5 transition-all"
          >
            联系我们
          </button>
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <Link to="/user/profile" className="text-sm text-cream-2 hover:text-gold-soft">
                {user?.nickname || user?.phone}
              </Link>
              <button onClick={logout} className="text-xs text-cream-3 hover:text-coral transition-colors">
                退出
              </button>
            </div>
          ) : (
            <Link to="/login" className="text-sm text-cream-2 hover:text-gold-soft transition-colors">
              登录
            </Link>
          )}
        </div>

        {/* 移动端汉堡（≤768px 显示） */}
        <button
          className="lg:hidden w-[42px] h-[42px] rounded-[10px] border border-line-gold text-cream"
          onClick={() => setDrawerOpen((v) => !v)}
          aria-label="打开菜单"
        >
          ☰
        </button>
      </nav>

      {/* 移动端抽屉（简化版：P2 完善 Drawer 组件规格） */}
      {drawerOpen && (
        <div className="lg:hidden bg-forest-2 border-t border-line-gold px-6 py-4 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setDrawerOpen(false)}
              className="py-2.5 text-sm text-cream-2 hover:text-gold-soft"
            >
              {item.label}
            </NavLink>
          ))}
          <div className="mt-2 pt-3 border-t border-line-gold flex gap-3">
            {isLoggedIn ? (
              <button onClick={logout} className="text-sm text-coral">
                退出登录
              </button>
            ) : (
              <Link to="/login" onClick={() => setDrawerOpen(false)} className="text-sm text-gold-soft">
                登录 / 注册
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
