import {
  AppstoreOutlined,
  BankOutlined,
  DashboardOutlined,
  FileTextOutlined,
  SettingOutlined,
  ShoppingOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";

/**
 * 后台菜单配置（技术文档 §8.2.2 权限码 → 菜单/路由，配置驱动 PRD 9.5）
 * 功能说明：
 * - 每个菜单项声明所需权限码 perm，登录后按角色权限过滤（无权限菜单不展示）；
 * - key 对应路由路径（/admin/<key>）；icon 为 AntD 图标组件；
 * - V1 固定 5 角色 + 菜单/API 权限码（附录 C-2 权限矩阵）。
 */

export interface MenuConfigItem {
  key: string;                          // 菜单 key（对应路由路径段）
  title: string;                        // 菜单标题
  icon?: ReactNode;                     // 图标
  perm?: string;                        // 所需权限码（不填=需登录即可见）
  children?: MenuConfigItem[];          // 二级菜单
}

/** 菜单配置树（9 大模块，PRD §7 / 技术文档 §8.4） */
export const menuConfig: MenuConfigItem[] = [
  { key: "dashboard", title: "总览看板", icon: <DashboardOutlined />, perm: "dashboard:view" },
  {
    key: "products", title: "产品管理", icon: <ShoppingOutlined />, perm: "product:view",
    children: [
      { key: "series", title: "系列管理", perm: "product:view" },
      { key: "spaces", title: "空间分类", perm: "product:view" },
      { key: "product-list", title: "产品列表", perm: "product:view" },
    ],
  },
  {
    key: "content", title: "内容管理", icon: <FileTextOutlined />, perm: "content:view",
    children: [
      { key: "news", title: "新闻管理", perm: "content:view" },
      { key: "cases", title: "案例管理", perm: "content:view" },
      { key: "banners", title: "Banner 管理", perm: "content:view" },
      { key: "jobs", title: "招聘岗位", perm: "recruit:view" },
      { key: "resumes", title: "简历管理", perm: "resume:view" },
      { key: "stores", title: "门店管理", perm: "content:view" },
      { key: "about", title: "关于品牌", perm: "content:view" },
    ],
  },
  {
    key: "users", title: "用户与咨询", icon: <UserOutlined />, perm: "user:view",
    children: [
      { key: "user-list", title: "用户管理", perm: "user:view" },
      { key: "dealers", title: "经销商审核", perm: "dealer:view" },
      { key: "messages", title: "留言咨询", perm: "message:handle" },
      { key: "appointments", title: "预约管理", perm: "appointment:view" },
    ],
  },
  {
    key: "contracts", title: "签单管理", icon: <BankOutlined />, perm: "contract:view",
    children: [
      { key: "contract-list", title: "签单列表", perm: "contract:view" },
      { key: "dealer-intents", title: "经销商意向", perm: "biz:view" },
    ],
  },
  {
    key: "biz", title: "B 端业务", icon: <AppstoreOutlined />, perm: "biz:view",
    children: [
      { key: "franchise", title: "加盟申请", perm: "biz:view" },
      { key: "inquiries", title: "批量询价", perm: "biz:view" },
      { key: "engineering", title: "工程定制", perm: "biz:view" },
    ],
  },
  { key: "statistics", title: "数据统计", icon: <TeamOutlined />, perm: "stat:view" },
  {
    key: "system", title: "系统管理", icon: <SettingOutlined />, perm: "system:admin",
    children: [
      { key: "admins", title: "管理员", perm: "system:admin" },
      { key: "roles", title: "角色权限", perm: "system:role" },
      { key: "logs", title: "操作日志", perm: "log:view" },
      { key: "configs", title: "系统配置", perm: "system:config" },
    ],
  },
];

/**
 * 按权限码过滤菜单树（无权限菜单不展示，PRD 7.0）
 * @param perms 当前角色权限码集合；超级管理员（含全部权限）直接全量返回
 */
export function filterMenus(perms: string[]): MenuConfigItem[] {
  const isSuper = perms.includes("system:admin"); // 简化：超管拥有 system:admin 视为全量
  return menuConfig
    .map((item) => {
      // 无权限要求 → 保留；有权限要求 → 校验
      if (item.perm && !isSuper && !perms.includes(item.perm)) return null;
      // 子菜单同样过滤
      let children: MenuConfigItem[] | undefined;
      if (item.children) {
        children = item.children.filter((c) => !c.perm || isSuper || perms.includes(c.perm));
        if (children.length === 0) return null; // 子菜单全无权限则隐藏父级
      }
      return { ...item, children };
    })
    .filter(Boolean) as MenuConfigItem[];
}
