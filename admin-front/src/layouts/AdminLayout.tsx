import { useEffect, useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Layout, Menu, Badge } from "antd";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../store";
import { logout } from "../store/authSlice";
import { filterMenus } from "../router/menu";
import { getAdminMe } from "../api/auth";
import { setStaff } from "../store/authSlice";

const { Sider, Header, Content } = Layout;

/**
 * 后台框架布局（技术文档 §8.1：侧栏 240px + 顶栏 60px + 内容 24px padding）
 * 功能说明：
 * - 侧栏：菜单树按权限码过滤（filterMenus），激活项金色高亮 + 左侧金竖条（技术文档 §8.2.1）；
 * - 顶栏：品牌 + 当前管理员昵称 + 登出；
 * - 页面刷新时调用 GET /admin/auth/me 恢复登录态与权限。
 */
export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { staff, perms, refreshToken } = useSelector((s: RootState) => s.auth);

  // 页面刷新恢复登录态（PRD 6.7.3 后台侧）
  useEffect(() => {
    if (refreshToken && !staff) {
      getAdminMe()
        .then((s) => dispatch(setStaff(s)))
        .catch(() => dispatch(logout()));
    }
  }, [refreshToken, staff, dispatch]);

  // 按权限过滤菜单（无权限菜单不展示，PRD 7.0）
  const menus = useMemo(() => filterMenus(perms), [perms]);

  // 当前选中菜单 key（基于路径）
  const selectedKey = location.pathname.split("/").filter(Boolean).slice(1).join("/") || "dashboard";
  const selectedTop = selectedKey.split("/")[0];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* 侧栏：forest-0 底（AntD Menu dark 主题） */}
      <Sider width={240} theme="dark" style={{ background: "#081A10", borderRight: "1px solid rgba(212,175,55,.28)" }}>
        {/* 品牌区 */}
        <div className="flex items-center gap-3 px-5 h-[60px] border-b" style={{ borderColor: "rgba(212,175,55,.28)" }}>
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E8CE8A] to-[#A8862A] text-[#1B2A20] font-extrabold flex items-center justify-center text-xs">
            TP
          </span>
          <span className="text-cream font-serif-title tracking-[2px] text-sm">后台管理</span>
        </div>
        {/* 权限菜单：items 由配置树转换（icon + 标题 + 子项） */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedTop]}
          defaultOpenKeys={[selectedTop]}
          style={{ background: "transparent", borderInlineEnd: "none" }}
          items={menus.map((m) => ({
            key: m.key,
            icon: m.icon,
            label: m.title,
            children: m.children?.map((c) => ({ key: c.key, label: c.title })),
          }))}
          onClick={({ key }) => navigate(`/admin/${key}`)}
        />
      </Sider>

      <Layout>
        {/* 顶栏 60px：当前管理员 + 登出 */}
        <Header
          style={{
            height: 60, lineHeight: "60px", padding: "0 24px",
            background: "#123526", borderBottom: "1px solid rgba(212,175,55,.28)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="text-cream-2 text-sm">
              {staff?.role?.role_name && (
                <Badge color="#D4AF37" text={<span className="text-gold-soft text-xs">{staff.role.role_name}</span>} />
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-cream text-sm">{staff?.nickname || staff?.name || staff?.username}</span>
              <button
                onClick={() => dispatch(logout()) || navigate("/admin/login")}
                className="text-xs text-cream-3 hover:text-coral transition-colors"
              >
                退出
              </button>
            </div>
          </div>
        </Header>

        {/* 内容区：padding 24px（技术文档 §8.1） */}
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
