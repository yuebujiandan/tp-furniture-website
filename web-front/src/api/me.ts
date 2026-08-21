import { request, PageResult } from "./client";

/**
 * 前台用户中心 API（对应 /api/v1/me/*，技术文档 §6.2.3）
 */

/** 我的预约项 */
export interface MyAppointment {
  id: number; type: string; status: string; expect_date: string; expect_time: string | null;
  city: string | null; store_id: number | null; product_id: number | null; case_id: number | null;
  remark: string | null; admin_note: string | null; contract_id: number | null; created_at: string | null;
}

/** 我的签单项 */
export interface MyContract {
  id: number; contract_no: string; status: string; source: string;
  total_amount: number | null; deposit: number | null; delivery_date: string | null;
  items: { name: string; product_no: string; unit_price: number; qty: number }[];
  created_at: string | null;
}

/** 我的签单详情（含状态流转日志） */
export interface MyContractDetail extends MyContract {
  customer_name: string; customer_phone: string; payment_plan: Record<string, unknown>; remark: string | null;
  logs: { action: string; detail: Record<string, unknown> | null; created_at: string | null }[];
}

/** 我的收藏项 */
export interface MyFavorite {
  id: number; name: string; cover_image_url: string | null; retail_price: number | null; series_name: string | null;
}

/** 我的留言项 */
export interface MyMessage {
  id: number; type: string; source: string; content: string; status: string; reply: string | null;
  created_at: string | null; handled_at: string | null;
}

/** 更新个人资料 */
export function updateProfile(data: { nickname?: string; avatar?: string }) {
  return request<{ id: number; nickname: string | null; avatar: string | null }>({ url: "/me/", method: "PUT", data });
}

/** 修改密码 */
export function changePassword(data: { old_password: string; new_password: string }) {
  return request<{ updated: boolean }>({ url: "/me/password", method: "PUT", data });
}

/** 我的预约列表 */
export function getMyAppointments(q: { page?: number; page_size?: number } = {}) {
  return request<PageResult<MyAppointment>>({ url: "/me/appointments", method: "GET", params: q });
}

/** 取消我的预约 */
export function cancelMyAppointment(id: number) {
  return request<{ id: number; status: string }>({ url: `/me/appointments/${id}/cancel`, method: "PUT" });
}

/** 我的签单列表 */
export function getMyContracts(q: { page?: number; page_size?: number } = {}) {
  return request<PageResult<MyContract>>({ url: "/me/contracts", method: "GET", params: q });
}

/** 我的签单详情 */
export function getMyContractDetail(id: number) {
  return request<MyContractDetail>({ url: `/me/contracts/${id}`, method: "GET" });
}

/** 我的收藏列表 */
export function getMyFavorites(q: { page?: number; page_size?: number } = {}) {
  return request<PageResult<MyFavorite>>({ url: "/me/favorites", method: "GET", params: q });
}

/** 取消收藏 */
export function removeFavorite(productId: number) {
  return request<{ favorited: boolean }>({ url: `/favorites/${productId}`, method: "DELETE" });
}

/** 我的留言列表 */
export function getMyMessages(q: { page?: number; page_size?: number } = {}) {
  return request<PageResult<MyMessage>>({ url: "/me/messages", method: "GET", params: q });
}
