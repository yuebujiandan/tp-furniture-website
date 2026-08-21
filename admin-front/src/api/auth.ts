import { request } from "./client";

/**
 * 后台认证 API（对应 /api/v1/admin/auth/*，技术文档 §6.6.1）
 * 功能说明：登录 / me（含角色权限码）/ 刷新。
 */

/** 后台角色信息 */
export interface StaffRole {
  id: number | null;
  code: string | null;
  role_name: string | null;
  permissions: string[];
}

/** 当前员工信息 */
export interface StaffInfo {
  id: number;
  username: string;
  name: string | null;
  nickname: string | null;
  role: StaffRole;
}

/** 登录响应 */
export interface StaffLoginResult {
  access_token: string;
  refresh_token: string;
  staff: StaffInfo;
}

/** 账号密码登录 */
export function adminLogin(username: string, password: string) {
  return request<StaffLoginResult>({ url: "/admin/auth/login", method: "POST", data: { username, password } });
}

/** 当前管理员 + 角色 + 权限码（权限菜单渲染依据） */
export function getAdminMe() {
  return request<StaffInfo>({ url: "/admin/auth/me", method: "GET" });
}
