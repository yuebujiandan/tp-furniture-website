import { request } from "./client";

/**
 * 前台认证 API（对应后端 /api/v1/auth/*，技术文档 §6.2）
 * 功能说明：注册 / 密码登录 / 验证码登录 / 发送验证码 / 刷新 / 当前用户。
 */

/** 用户信息结构 */
export interface UserInfo {
  id: number;
  phone: string;
  nickname: string | null;
  role: "user" | "dealer";
  avatar: string | null;
  dealer_discount: number | null;
}

/** 登录/注册响应：双 token + 用户信息 */
export interface AuthResult {
  access_token: string;
  refresh_token: string;
  user: UserInfo;
}

/** 发送短信验证码（开发环境返回 mock_code 便于联调） */
export function sendSmsCode(phone: string) {
  return request<{ sent: boolean; mock_code: string | null }>({
    url: "/auth/sms-code",
    method: "POST",
    data: { phone },
  });
}

/** 手机号+密码注册 */
export function register(phone: string, password: string, nickname?: string) {
  return request<{ id: number; phone: string; nickname: string | null }>({
    url: "/auth/register",
    method: "POST",
    data: { phone, password, nickname },
  });
}

/** 密码登录 */
export function login(phone: string, password: string) {
  return request<AuthResult>({ url: "/auth/login", method: "POST", data: { phone, password } });
}

/** 验证码登录（未注册手机号自动注册） */
export function loginBySms(phone: string, code: string) {
  return request<AuthResult>({ url: "/auth/login-sms", method: "POST", data: { phone, code } });
}

/** 刷新双 token */
export function refreshToken(refresh_token: string) {
  return request<{ access_token: string; refresh_token: string }>({
    url: "/auth/refresh",
    method: "POST",
    data: { refresh_token },
  });
}

/** 当前登录用户（页面刷新恢复登录态） */
export function getMe() {
  return request<UserInfo>({ url: "/auth/me", method: "GET" });
}
