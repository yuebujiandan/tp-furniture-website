import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { StaffInfo } from "../api/auth";

/**
 * 后台认证状态（Redux Toolkit，技术文档 §8.1 store/auth）
 * 功能说明：
 * - access/refresh token + 当前员工信息 + 权限码（菜单过滤依据，PRD 9.5）；
 * - refreshToken 持久化 localStorage（刷新页面保持登录）；
 * - setTokens / setStaff / logout 三个 action。
 */

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  staff: StaffInfo | null;
  /** 权限码集合（由 staff.role.permissions 派生，菜单过滤用） */
  perms: string[];
  isLoggedIn: boolean;
}

const REFRESH_KEY = "tp_admin_refresh_token";

const initialState: AuthState = {
  accessToken: null,
  refreshToken: localStorage.getItem(REFRESH_KEY),
  staff: null,
  perms: [],
  isLoggedIn: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /** 登录成功：保存双 token + 员工信息 */
    setLogin(state, action: PayloadAction<{ access_token: string; refresh_token: string; staff: StaffInfo }>) {
      state.accessToken = action.payload.access_token;
      state.refreshToken = action.payload.refresh_token;
      state.staff = action.payload.staff;
      state.perms = action.payload.staff.role.permissions || [];
      state.isLoggedIn = true;
      localStorage.setItem(REFRESH_KEY, action.payload.refresh_token);
    },
    /** 刷新成功：仅更新双 token */
    setTokens(state, action: PayloadAction<{ access_token: string; refresh_token: string }>) {
      state.accessToken = action.payload.access_token;
      state.refreshToken = action.payload.refresh_token;
      localStorage.setItem(REFRESH_KEY, action.payload.refresh_token);
    },
    /** 恢复登录态：设置员工信息（页面刷新后 GET /me） */
    setStaff(state, action: PayloadAction<StaffInfo>) {
      state.staff = action.payload;
      state.perms = action.payload.role.permissions || [];
      state.isLoggedIn = true;
    },
    /** 登出：清空状态与 localStorage */
    logout(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.staff = null;
      state.perms = [];
      state.isLoggedIn = false;
      localStorage.removeItem(REFRESH_KEY);
    },
  },
});

export const { setLogin, setTokens, setStaff, logout } = authSlice.actions;
export default authSlice.reducer;
