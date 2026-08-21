import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../stores/auth";
import { useUiStore } from "../stores/ui";

/**
 * Axios 实例与拦截器（技术文档 §7.5.2）
 * 功能说明：
 * 1. 请求拦截：自动注入 Bearer token；
 * 2. 响应拦截：code!==0 → Toast 提示；401 系列（40100/40101/40102）→ 静默刷新后重放
 *    （单飞队列防并发）→ 刷新失败登出并跳转登录页（携带 redirect 回跳，PRD 6.7.3）；
 * 3. 统一业务响应类型 ApiResponse<T>。
 */

/** 后端统一响应结构（技术文档 §6.0） */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/** 分页结构（列表接口统一） */
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  page_size: number;
}

/** 创建 axios 实例：baseURL 走 /api/v1（Vite 代理到 8000） */
const client = axios.create({
  baseURL: "/api/v1",
  timeout: 15000,
});

// ---- 401 静默刷新重放（单飞队列防并发，PRD 6.7.3）----
let refreshing: Promise<string | null> | null = null;

/** 刷新 access token：使用 refresh token 调 /auth/refresh；失败返回 null */
async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, login } = useAuthStore.getState();
  if (!refreshToken) return null;
  try {
    const res = await axios.post<ApiResponse<{ access_token: string; refresh_token: string }>>(
      "/api/v1/auth/refresh",
      { refresh_token: refreshToken }
    );
    const data = res.data.data;
    if (res.data.code !== 0 || !data) return null;
    login(data.access_token, data.refresh_token); // 更新双 token
    return data.access_token;
  } catch {
    return null;
  }
}

// ---- 请求拦截：注入 Bearer token ----
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ---- 响应拦截：业务码判断 + 401 刷新重放 ----
client.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse;
    if (body && typeof body.code === "number" && body.code !== 0) {
      // 业务错误统一 Toast（PRD 9.4 可用性）
      useUiStore.getState().showToast(body.message || "操作失败");
      return Promise.reject(new Error(body.message));
    }
    return response;
  },
  async (error: AxiosError<ApiResponse>) => {
    const status = error.response?.status;
    const bizCode = error.response?.data?.code;

    // 401 类错误（未认证 / token 失效）：尝试静默刷新后重放原请求
    if (status === 401 || bizCode === 40100 || bizCode === 40101 || bizCode === 40102) {
      const original = error.config as InternalAxiosRequestConfig | undefined;
      if (original && !original.headers._retried) {
        original.headers._retried = true;
        refreshing = refreshing || refreshAccessToken();
        const newToken = await refreshing;
        refreshing = null;
        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`;
          return client(original); // 重放原请求
        }
      }
      // 刷新失败：登出并跳转登录页（保留回跳地址）
      const { logout } = useAuthStore.getState();
      logout();
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?redirect=${redirect}`;
      return Promise.reject(error);
    }
    // 网络异常统一提示
    useUiStore.getState().showToast(error.response?.data?.message || "网络异常，请稍后重试");
    return Promise.reject(error);
  }
);

/** 类型化请求封装：直接返回业务 data */
export async function request<T>(config: Parameters<typeof client.request>[0]): Promise<T> {
  const res = await client.request<ApiResponse<T>>(config);
  return res.data.data;
}

export default client;
