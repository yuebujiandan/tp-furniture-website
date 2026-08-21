import { NavLink, Outlet } from "react-router-dom";

/**
 * 用户中心布局（PRD 6.7.2）
 * 实现说明：左侧竖导航（个人资料/我的预约/我的签单/我的收藏/我的留言）+ 右侧内容区；
 * 激活项金色高亮（与全局导航一致）。
 */
const MENUS = [
  { to: "/user/profile", label: "个人资料" },
  { to: "/user/appointments", label: "我的预约" },
  { to: "/user/contracts", label: "我的签单" },
  { to: "/user/favorites", label: "我的收藏" },
  { to: "/user/messages", label: "我的留言" },
];

export default function UserLayout() {
  return (
    <div className="max-w-[1100px] mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
      {/* 左侧竖导航 */}
      <aside>
        <h2 className="font-serif-title text-lg tracking-[2px] text-cream mb-6">个人中心</h2>
        <nav className="flex md:flex-col gap-2 overflow-x-auto">
          {MENUS.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              className={({ isActive }) =>
                [
                  "px-4 py-2.5 rounded-[12px] text-sm whitespace-nowrap transition-all",
                  isActive
                    ? "bg-gradient-to-br from-[#E8CE8A] to-[#A8862A] text-[#1B2A20] font-semibold"
                    : "border border-line-gold text-cream-2 hover:border-gold hover:text-gold-soft",
                ].join(" ")
              }
            >
              {m.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* 右侧内容区 */}
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
