import { request, PageResult } from "./client";

/**
 * 前台案例/新闻/内容/线索 API（对应 /api/v1/cases|news|about|stores|faqs|messages|appointments）
 */

// ---------- 案例 ----------
export interface CaseItem {
  id: number;
  title: string;
  cover: string | null;
  area: string | null;
  house_type: string | null;
  style_tags: string | null;
  space: string | null;
  location_desc: string | null;
  is_engineering: boolean;
  view_count: number;
}

export interface CaseDetail extends CaseItem {
  content_html: string;
  customer_review: string | null;
  products: { id: number; name: string; cover_image_url: string | null; retail_price: number | null }[];
}

export function getCases(q: { style?: string; space?: string; kw?: string; page?: number; page_size?: number } = {}) {
  return request<PageResult<CaseItem>>({ url: "/cases", method: "GET", params: q });
}

export function getCase(id: number) {
  return request<CaseDetail>({ url: `/cases/${id}`, method: "GET" });
}

// ---------- 新闻 ----------
export interface NewsItem {
  id: number;
  title: string;
  category: string;
  cover: string | null;
  summary: string | null;
  author: string | null;
  source: string | null;
  is_top: boolean;
  view_count: number;
  publish_time: string | null;
}

export interface NewsDetail extends NewsItem {
  content_html: string;
  prev: { id: number; title: string } | null;
  next: { id: number; title: string } | null;
}

export function getNews(q: { category?: string; kw?: string; page?: number; page_size?: number } = {}) {
  return request<PageResult<NewsItem>>({ url: "/news", method: "GET", params: q });
}

export function getNewsDetail(id: number) {
  return request<NewsDetail>({ url: `/news/${id}`, method: "GET" });
}

// ---------- 内容（关于/门店/FAQ）----------
export interface StoreItem {
  id: number;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  business_hours: string | null;
  image: string | null;
}

export function getStores() {
  return request<StoreItem[]>({ url: "/stores", method: "GET" });
}

export function getFaqs() {
  return request<{ id: number; question: string; answer: string }[]>({ url: "/faqs", method: "GET" });
}

export function getMilestones() {
  return request<{ id: number; year: string; title: string; description: string | null; image: string | null }[]>(
    { url: "/milestones", method: "GET" }
  );
}

export function getAbout() {
  return request<{ about_tp_html: string; brand_intro_html: string; honors: { title: string; year: string }[]; company_video: string }>(
    { url: "/about", method: "GET" }
  );
}

// ---------- 线索提交（留言/预约，P2）----------
export function submitMessage(body: { type?: string; source?: string; name: string; phone: string; category?: string; content: string }) {
  return request<{ id: number }>({ url: "/messages", method: "POST", data: body });
}

export function submitAppointment(body: {
  type: "visit" | "designer" | "measure" | "case_design";
  name: string; phone: string; expect_date: string; expect_time?: string;
  city?: string; store_id?: number; product_id?: number; case_id?: number; remark?: string;
}) {
  return request<{ id: number; status: string }>({ url: "/appointments", method: "POST", data: body });
}
