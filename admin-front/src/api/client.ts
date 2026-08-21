import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { message } from "antd";
import { store } from "../store";

/**
 * 后台 Axios 实例（技术文档 §8.1：admin 域，403 处理）
 * 功能说明：
 * - 请求注入 Bearer token（从 Redux store 读取）；
 * - 401 → 静默刷新重放；刷新失败回登录页；
 * - 40300 无权限 → 统一提示（PRD 7.7.2）；
 * - 业务 code!==0 → antd message 提示。
 */

/** 后端统一响应结构 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

const client = axios.create({ baseURL: "/api/v1", timeout: 15000 });

// ---- 401 静默刷新（单飞队列）----
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const state = store.getState().auth;
  if (!state.refreshToken) return null;
  try {
    const res = await axios.post<ApiResponse<{ access_token: string; refresh_token: string }>>(
      "/api/v1/admin/auth/refresh",
      { refresh_token: state.refreshToken }
    );
    if (res.data.code !== 0 || !res.data.data) return null;
    store.dispatch({ type: "auth/setTokens", payload: res.data.data });
    return res.data.data.access_token;
  } catch {
    return null;
  }
}

// 请求拦截：注入 Bearer
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = store.getState().auth.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 响应拦截：业务码 + 401 刷新重放 + 403 提示
client.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse;
    if (body && typeof body.code === "number" && body.code !== 0) {
      message.error(body.message || "操作失败");
      return Promise.reject(new Error(body.message));
    }
    return response;
  },
  async (error: AxiosError<ApiResponse>) => {
    const bizCode = error.response?.data?.code;
    // 403 无权限：统一提示（PRD 7.7.2）
    if (bizCode === 40300) {
      message.error("无权限执行该操作");
      return Promise.reject(error);
    }
    // 401 类：静默刷新重放
    if (error.response?.status === 401 || bizCode === 40100 || bizCode === 40101 || bizCode === 40102) {
      const original = error.config as InternalAxiosRequestConfig | undefined;
      if (original && !original.headers._retried) {
        original.headers._retried = true;
        refreshing = refreshing || refreshAccessToken();
        const newToken = await refreshing;
        refreshing = null;
        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`;
          return client(original);
        }
      }
      // 刷新失败：登出回登录页
      store.dispatch({ type: "auth/logout" });
      window.location.href = "/admin/login";
      return Promise.reject(error);
    }
    message.error(error.response?.data?.message || "网络异常，请稍后重试");
    return Promise.reject(error);
  }
);

/** 类型化请求：返回业务 data */
export async function request<T>(config: Parameters<typeof client.request>[0]): Promise<T> {
  const res = await client.request<ApiResponse<T>>(config);
  return res.data.data;
}

export default client;
