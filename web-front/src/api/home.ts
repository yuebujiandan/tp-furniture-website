import { request } from "./client";

/**
 * 首页聚合 API（对应 /api/v1/home，技术文档 §6.1）
 */

/** 首页聚合数据结构 */
export interface HomeData {
  banners: {
    id: number; image: string; title: string | null; subtitle: string | null;
    button_text: string | null; link_url: string | null;
  }[];
  brand_points: { title: string; desc: string }[];
  home_stats: { label: string; value: string }[];
  series: { id: number; name: string; image: string | null; intro: string | null; product_count: number }[];
  spaces: { id: number; name: string; icon: string | null; product_count: number }[];
  featured_cases: { id: number; title: string; cover: string | null; location_desc: string | null; area: string | null }[];
  news: {
    id: number; title: string; category: string; cover: string | null;
    summary: string | null; publish_time: string | null;
  }[];
  stores: { id: number; name: string; address: string; phone: string | null; business_hours: string | null }[];
}

/** 首页聚合数据 */
export function getHome() {
  return request<HomeData>({ url: "/home", method: "GET" });
}
