import { request, PageResult } from "./client";

/**
 * 前台产品 API（对应 /api/v1/products|series|spaces，技术文档 §6.3）
 */

/** 系列/空间维度项（含可见产品数） */
export interface DimItem {
  id: number;
  name: string;
  image?: string | null;
  icon?: string | null;
  intro?: string | null;
  product_count: number;
}

/** 产品列表项 */
export interface ProductItem {
  id: number;
  name: string;
  product_no: string;
  series_id: number;
  series_name: string | null;
  category_id: number | null;
  category_name: string | null;
  style_tags: string | null;
  retail_price: number | null;
  dealer_price: number | null;
  cover_image_url: string | null;
  is_recommend: boolean;
  is_new: boolean;
  is_top: boolean;
  stock: number;
  size?: string | null;
  material?: string | null;
  craft?: string | null;
  warranty?: string | null;
}

/** 产品详情（含图集/规格/富文本/多空间） */
export interface ProductDetail extends ProductItem {
  images: string[];
  specs: Record<string, string>;
  detail_html: string;
  spaces: { id: number; name: string }[];
}

/** 列表筛选参数（6 类筛选 × 排序，UIUX §5.5） */
export interface ProductQuery {
  series_id?: number;
  space_id?: number;
  style?: string;
  price_min?: number;
  price_max?: number;
  kw?: string;
  sort?: "default" | "price_asc" | "price_desc" | "newest";
  page?: number;
  page_size?: number;
}

/** 系列列表 */
export function getSeries() {
  return request<DimItem[]>({ url: "/series", method: "GET" });
}

/** 空间列表 */
export function getSpaces() {
  return request<DimItem[]>({ url: "/spaces", method: "GET" });
}

/** 产品列表（筛选 + 分页） */
export function getProducts(q: ProductQuery = {}) {
  return request<PageResult<ProductItem>>({ url: "/products", method: "GET", params: q });
}

/** 产品详情 */
export function getProduct(id: number) {
  return request<ProductDetail>({ url: `/products/${id}`, method: "GET" });
}

/** 相关推荐（同系列优先 4 个） */
export function getRelatedProducts(id: number) {
  return request<ProductItem[]>({ url: `/products/${id}/related`, method: "GET" });
}

/** 关联案例（详情页相关案例 3 个） */
export function getProductCases(id: number) {
  return request<{ id: number; title: string; cover: string | null; location_desc: string | null; area: string | null }[]>(
    { url: `/products/${id}/cases`, method: "GET" }
  );
}
