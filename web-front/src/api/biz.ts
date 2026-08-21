import { request, PageResult } from "./client";

/**
 * 前台 B 端业务 API（加盟/询价/工程 + 招聘 + 经销商域，P4）
 */

// ---------- B 端提交 ----------
export function submitFranchise(data: { name: string; phone: string; city: string; invest_amount?: string; area?: string; current_status?: string; remark?: string }) {
  return request<{ id: number; status: string }>({ url: "/franchise-applications", method: "POST", data });
}

export function submitInquiry(data: { company: string; contact: string; phone: string; email?: string; purpose?: string; items: { id?: number; name: string; qty: number; note?: string }[]; expect_time?: string }) {
  return request<{ id: number; status: string }>({ url: "/inquiries", method: "POST", data });
}

export function submitEngineering(data: { company: string; contact: string; phone: string; project_type: string; location?: string; scale?: string; deadline?: string; description?: string }) {
  return request<{ id: number; status: string }>({ url: "/engineering-requests", method: "POST", data });
}

// ---------- 招聘 ----------
export interface JobItem {
  id: number; title: string; department: string | null; location: string | null;
  type: string; salary: string | null; tags: string | null; publish_time: string | null;
}
export interface JobDetail extends JobItem { duty: string; requirement: string; }

export function getJobs(q: { type?: string; kw?: string; page?: number; page_size?: number } = {}) {
  return request<PageResult<JobItem>>({ url: "/jobs", method: "GET", params: q });
}
export function getJob(id: number) { return request<JobDetail>({ url: `/jobs/${id}`, method: "GET" }); }
export function submitResume(data: { job_id: number; name: string; phone: string; email?: string; education?: string; school?: string; work_years?: string; intro?: string }) {
  return request<{ id: number; apply_no: string }>({ url: "/resumes", method: "POST", data });
}
export function queryResume(data: { apply_no: string; phone_tail: string }) {
  return request<{ job_title: string; status: string; status_label: string; applied_at: string | null }>({ url: "/resumes/query", method: "POST", data });
}

// ---------- 经销商域 ----------
export function applyDealer(data: { company_name: string; credit_code: string; license_img: string; contact: string; phone: string; region?: string; reason?: string }) {
  return request<{ id: number; status: string }>({ url: "/dealer/apply", method: "POST", data });
}
export function getMyApply() {
  return request<{ applied: boolean; status: string | null; reject_reason: string | null; company_name?: string }>({ url: "/dealer/apply", method: "GET" });
}
export interface DealerProduct { id: number; name: string; product_no: string; series_name: string | null; retail_price: number | null; dealer_price: number | null; cover_image_url: string | null; }
export function getDealerProducts(q: { series_id?: number; kw?: string; page?: number; page_size?: number } = {}) {
  return request<PageResult<DealerProduct>>({ url: "/dealer/products", method: "GET", params: q });
}
export interface DealerIntent { id: number; items: { id?: number; name: string; qty: number }[]; status: string; quote: Record<string, unknown>; contract_id: number | null; created_at: string | null; }
export function submitIntent(items: { id?: number; name: string; qty: number }[]) {
  return request<{ id: number; status: string }>({ url: "/dealer/intents", method: "POST", data: { items } });
}
export function getMyIntents(q: { page?: number; page_size?: number } = {}) {
  return request<PageResult<DealerIntent>>({ url: "/dealer/intents", method: "GET", params: q });
}
export function getDealerAnnouncements() {
  return request<{ id: number; title: string; content_html: string; publish_time: string | null }[]>({ url: "/dealer/announcements", method: "GET" });
}
