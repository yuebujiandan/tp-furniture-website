import { create } from "zustand";
import { getMe } from "../api/auth";

/**
 * 前台认证状态（Zustand，技术文档 §7.5.1）
 * 功能说明：
 * - access/refresh token 与用户信息全局管理；refreshToken 持久化 localStorage（登录态保持 30 天）；
 * - 页面刷新后调用 init() 通过 GET /auth/me 恢复登录态；
 * - 登录/登出方法供登录页与导航调用。
 */

interface AuthState {
  /** 访问令牌（内存） */
  accessToken: string | null;
  /** 刷新令牌（持久化 localStorage，30d 有效） */
  refreshToken: string | null;
  /** 当前用户信息 */
  user: import("../api/auth").UserInfo | null;
  /** 是否已登录 */
  isLoggedIn: boolean;
  /** 登录态是否已初始化完成（刷新恢复） */
  initialized: boolean;
  /** 保存双 token + 用户（登录成功后调用） */
  login: (access: string, refresh: string, user?: import("../api/auth").UserInfo) => void;
  /** 登出：清空状态与 localStorage */
  logout: () => void;
  /** 页面刷新时恢复登录态（失败则静默登出） */
  init: () => Promise<void>;
}

const REFRESH_KEY = "tp_refresh_token";

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: localStorage.getItem(REFRESH_KEY),
  user: null,
  isLoggedIn: false,
  initialized: false,

  login: (access, refresh, user) => {
    localStorage.setItem(REFRESH_KEY, refresh);
    set({ accessToken: access, refreshToken: refresh, user: user ?? null, isLoggedIn: true, initialized: true });
  },

  logout: () => {
    localStorage.removeItem(REFRESH_KEY);
    set({ accessToken: null, refreshToken: null, user: null, isLoggedIn: false });
  },

  init: async () => {
    const refresh = get().refreshToken;
    if (!refresh) {
      set({ initialized: true });
      return;
    }
    try {
      const user = await getMe(); // 若 access 失效，拦截器会自动刷新
      set({ user, isLoggedIn: true, initialized: true });
    } catch {
      get().logout();
      set({ initialized: true });
    }
  },
}));
