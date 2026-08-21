import { request } from "./client";

/**
 * 后台管理 API（对应 /api/v1/admin/*，技术文档 §6.6.2-6.6.4）
 * 功能说明：产品管理（系列/空间/产品/批量调价/库存预警）+ 内容管理（新闻/案例/Banner/门店/FAQ）+ 留言管理。
 */

// ---------- 通用分页响应 ----------
export interface AdminPage<T> {
  list: T[];
  total: number;
  page: number;
  page_size: number;
}

// ---------- 系列 ----------
export interface SeriesItem { id: number; name: string; image: string | null; intro: string | null; sort: number; is_activate: boolean; product_count: number; }
export function getAdminSeries() { return request<SeriesItem[]>({ url: "/admin/series", method: "GET" }); }
export function createSeries(data: Partial<SeriesItem>) { return request<{ id: number }>({ url: "/admin/series", method: "POST", data }); }
export function updateSeries(id: number, data: Partial<SeriesItem>) { return request<{ id: number }>({ url: `/admin/series/${id}`, method: "PUT", data }); }
export function deleteSeries(id: number) { return request<{ deleted: boolean }>({ url: `/admin/series/${id}`, method: "DELETE" }); }

// ---------- 空间 ----------
export interface SpaceItem { id: number; name: string; icon: string | null; sort: number; is_activate: boolean; }
export function getAdminSpaces() { return request<SpaceItem[]>({ url: "/admin/spaces", method: "GET" }); }
export function createSpace(data: Partial<SpaceItem>) { return request<{ id: number }>({ url: "/admin/spaces", method: "POST", data }); }
export function updateSpace(id: number, data: Partial<SpaceItem>) { return request<{ id: number }>({ url: `/admin/spaces/${id}`, method: "PUT", data }); }
export function deleteSpace(id: number) { return request<{ deleted: boolean }>({ url: `/admin/spaces/${id}`, method: "DELETE" }); }

// ---------- 产品 ----------
export interface AdminProduct {
  id: number; name: string; product_no: string; series_id: number; series_name: string | null;
  category_id: number | null; category_name: string | null; style_tags: string | null;
  retail_price: number | null; dealer_price: number | null; stock: number; stock_warn: number;
  low_stock: boolean; cover_image_url: string | null; publish_status: "on_shelf" | "off_shelf" | "draft";
  is_top: boolean; is_recommend: boolean; is_new: boolean; is_activate: boolean; is_deleted: boolean;
}
export function getAdminProducts(q: { series_id?: number; space_id?: number; publish_status?: string; kw?: string; page?: number; page_size?: number } = {}) {
  return request<AdminPage<AdminProduct>>({ url: "/admin/products", method: "GET", params: q });
}
export function getAdminProduct(id: number) { return request<AdminProduct & { images: string[]; detail_html: string; specs: Record<string, string>; size: string | null; material: string | null; craft: string | null; warranty: string | null; spaces: number[] }>({ url: `/admin/products/${id}`, method: "GET" }); }
export function createAdminProduct(data: Record<string, unknown>) { return request<{ id: number }>({ url: "/admin/products", method: "POST", data }); }
export function updateAdminProduct(id: number, data: Record<string, unknown>) { return request<{ id: number }>({ url: `/admin/products/${id}`, method: "PUT", data }); }
export function deleteAdminProduct(id: number) { return request<{ deleted: boolean }>({ url: `/admin/products/${id}`, method: "DELETE" }); }
export function batchPrice(data: { scope: string; series_id?: number; product_ids?: number[]; mode: "percent" | "fixed"; value: number }) {
  return request<{ affected: number }>({ url: "/admin/products/batch-price", method: "POST", data });
}
export function getLowStock() { return request<AdminProduct[]>({ url: "/admin/products/low-stock", method: "GET" }); }

// ---------- 新闻 ----------
export interface NewsItem { id: number; title: string; category: string; cover: string | null; summary: string | null; author: string | null; is_published: boolean; is_top: boolean; view_count: number; publish_time: string | null; expire_at: string | null; }
export function getAdminNews(q: { category?: string; is_published?: boolean; kw?: string; page?: number; page_size?: number } = {}) {
  return request<AdminPage<NewsItem>>({ url: "/admin/news", method: "GET", params: q });
}
export function getAdminNewsDetail(id: number) { return request<NewsItem & { content_html: string }>({ url: `/admin/news/${id}`, method: "GET" }); }
export function createAdminNews(data: Record<string, unknown>) { return request<{ id: number }>({ url: "/admin/news", method: "POST", data }); }
export function updateAdminNews(id: number, data: Record<string, unknown>) { return request<{ id: number }>({ url: `/admin/news/${id}`, method: "PUT", data }); }
export function deleteAdminNews(id: number) { return request<{ deleted: boolean }>({ url: `/admin/news/${id}`, method: "DELETE" }); }

// ---------- 案例 ----------
export interface CaseItem { id: number; title: string; cover: string | null; area: string | null; house_type: string | null; style_tags: string | null; space: string | null; location_desc: string | null; is_engineering: boolean; is_activate: boolean; sort: number; }
export function getAdminCases(q: { is_engineering?: boolean; kw?: string; page?: number; page_size?: number } = {}) {
  return request<AdminPage<CaseItem>>({ url: "/admin/cases", method: "GET", params: q });
}
export function getAdminCase(id: number) { return request<CaseItem & { content_html: string; product_ids: number[]; customer_review: string | null }>({ url: `/admin/cases/${id}`, method: "GET" }); }
export function createAdminCase(data: Record<string, unknown>) { return request<{ id: number }>({ url: "/admin/cases", method: "POST", data }); }
export function updateAdminCase(id: number, data: Record<string, unknown>) { return request<{ id: number }>({ url: `/admin/cases/${id}`, method: "PUT", data }); }
export function deleteAdminCase(id: number) { return request<{ deleted: boolean }>({ url: `/admin/cases/${id}`, method: "DELETE" }); }

// ---------- Banner ----------
export interface BannerItem { id: number; image: string; title: string | null; subtitle: string | null; button_text: string | null; link_url: string | null; sort: number; is_activate: boolean; }
export function getAdminBanners() { return request<BannerItem[]>({ url: "/admin/banners", method: "GET" }); }
export function createBanner(data: Record<string, unknown>) { return request<{ id: number }>({ url: "/admin/banners", method: "POST", data }); }
export function updateBanner(id: number, data: Record<string, unknown>) { return request<{ id: number }>({ url: `/admin/banners/${id}`, method: "PUT", data }); }
export function deleteBanner(id: number) { return request<{ deleted: boolean }>({ url: `/admin/banners/${id}`, method: "DELETE" }); }

// ---------- 门店 ----------
export interface StoreItem { id: number; name: string; address: string; lat: number | null; lng: number | null; phone: string | null; business_hours: string | null; image: string | null; sort: number; is_activate: boolean; }
export function getAdminStores() { return request<StoreItem[]>({ url: "/admin/stores", method: "GET" }); }
export function createStore(data: Record<string, unknown>) { return request<{ id: number }>({ url: "/admin/stores", method: "POST", data }); }
export function updateStore(id: number, data: Record<string, unknown>) { return request<{ id: number }>({ url: `/admin/stores/${id}`, method: "PUT", data }); }
export function deleteStore(id: number) { return request<{ deleted: boolean }>({ url: `/admin/stores/${id}`, method: "DELETE" }); }

// ---------- FAQ ----------
export interface FaqItem { id: number; question: string; answer: string; sort: number; is_activate: boolean; }
export function getAdminFaqs() { return request<FaqItem[]>({ url: "/admin/faqs", method: "GET" }); }
export function createFaq(data: Record<string, unknown>) { return request<{ id: number }>({ url: "/admin/faqs", method: "POST", data }); }
export function updateFaq(id: number, data: Record<string, unknown>) { return request<{ id: number }>({ url: `/admin/faqs/${id}`, method: "PUT", data }); }
export function deleteFaq(id: number) { return request<{ deleted: boolean }>({ url: `/admin/faqs/${id}`, method: "DELETE" }); }

// ---------- 留言 ----------
export interface MessageItem { id: number; type: string; source: string; name: string; phone: string; category: string | null; content: string; status: string; reply: string | null; created_at: string | null; handled_at: string | null; }
export function getAdminMessages(q: { type?: string; source?: string; status?: string; kw?: string; page?: number; page_size?: number } = {}) {
  return request<AdminPage<MessageItem>>({ url: "/admin/messages", method: "GET", params: q });
}
export function handleMessage(id: number, data: { reply: string; status?: string }) {
  return request<{ id: number; status: string }>({ url: `/admin/messages/${id}/handle`, method: "PUT", data });
}

// ---------- 通用上传 ----------
export function uploadFile(file: File, kind: "image" | "doc" = "image") {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", kind);
  return request<{ url: string; size: number; thumbnail_url?: string }>({ url: "/admin/upload", method: "POST", data: fd });
}

// ---------- 预约管理（P3）----------
export interface AdminAppointment {
  id: number; user_id: number | null; user_phone: string | null; name: string; phone: string;
  type: string; status: string; expect_date: string; expect_time: string | null; city: string | null;
  store_id: number | null; store_name: string | null; product_id: number | null; case_id: number | null;
  remark: string | null; admin_note: string | null; contract_id: number | null; created_at: string | null;
}
export function getAdminAppointments(q: { status?: string; type?: string; date_from?: string; date_to?: string; kw?: string; page?: number; page_size?: number } = {}) {
  return request<AdminPage<AdminAppointment>>({ url: "/admin/appointments", method: "GET", params: q });
}
export function setAppointmentStatus(id: number, status: "confirmed" | "cancelled") {
  return request<{ id: number; status: string }>({ url: `/admin/appointments/${id}/status`, method: "PUT", data: { status } });
}
export function setAppointmentNote(id: number, admin_note: string) {
  return request<{ id: number }>({ url: `/admin/appointments/${id}/note`, method: "PUT", data: { admin_note } });
}
export function toContract(id: number, data: { customer_name: string; customer_phone: string; items: unknown[]; total_amount?: number | null; deposit?: number | null; remark?: string | null }) {
  return request<{ id: number; contract_no: string; appointment_status: string }>({ url: `/admin/appointments/${id}/to-contract`, method: "POST", data });
}

// ---------- 签单管理（P3）----------
export interface AdminContract {
  id: number; contract_no: string; user_id: number | null; customer_name: string; customer_phone: string;
  source: string; appointment_id: number | null; items: { name: string; product_no: string; unit_price: number; qty: number }[];
  total_amount: number | null; deposit: number | null; payment_plan: Record<string, unknown>;
  delivery_date: string | null; store_id: number | null; store_name: string | null;
  remark: string | null; status: string; cancel_reason: string | null; created_at: string | null;
}
export interface ContractKpi {
  total_contracts: number; total_amount: number; month_contracts: number; month_amount: number;
  pending_delivery: number; cancelled: number;
}
export function getContractKpi() { return request<ContractKpi>({ url: "/admin/contracts/dashboard", method: "GET" }); }
export function getAdminContracts(q: { status?: string; source?: string; kw?: string; page?: number; page_size?: number } = {}) {
  return request<AdminPage<AdminContract>>({ url: "/admin/contracts", method: "GET", params: q });
}
export function getAdminContract(id: number) {
  return request<AdminContract & { logs: { action: string; detail: Record<string, unknown> | null; created_at: string | null }[] }>({ url: `/admin/contracts/${id}`, method: "GET" });
}
export function createAdminContract(data: Record<string, unknown>) { return request<{ id: number; contract_no: string }>({ url: "/admin/contracts", method: "POST", data }); }
export function updateAdminContract(id: number, data: Record<string, unknown>) { return request<{ id: number }>({ url: `/admin/contracts/${id}`, method: "PUT", data }); }
export function setContractStatus(id: number, data: { status: string; cancel_reason?: string }) {
  return request<{ id: number; status: string }>({ url: `/admin/contracts/${id}/status`, method: "PUT", data });
}
export function exportContracts() { return `/api/v1/admin/contracts/export`; }

// ---------- 用户管理（P3）----------
export interface AdminUser {
  id: number; phone: string; nickname: string | null; avatar: string | null; role: string;
  is_activate: boolean; dealer_discount: number | null; last_login_at: string | null; created_at: string | null;
}
export function getAdminUsers(q: { role?: string; kw?: string; is_activate?: boolean; page?: number; page_size?: number } = {}) {
  return request<AdminPage<AdminUser>>({ url: "/admin/users", method: "GET", params: q });
}
export function setUserStatus(id: number, is_activate: boolean) {
  return request<{ id: number; is_activate: boolean }>({ url: `/admin/users/${id}/status`, method: "PUT", data: { is_activate } });
}

// ---------- B 端业务管理（P4）----------
export interface BizFranchise { id: number; name: string; phone: string; city: string; invest_amount: string | null; area: string | null; current_status: string | null; remark: string | null; status: string; reject_reason: string | null; created_at: string | null; }
export function getBizFranchise(q: { status?: string; kw?: string; page?: number; page_size?: number } = {}) {
  return request<AdminPage<BizFranchise>>({ url: "/admin/biz/franchise", method: "GET", params: q });
}
export function setFranchiseStatus(id: number, data: { status: string; reject_reason?: string }) {
  return request<{ id: number; status: string }>({ url: `/admin/biz/franchise/${id}/status`, method: "PUT", data });
}
export interface BizInquiry { id: number; company: string; contact: string; phone: string; email: string | null; purpose: string; items: { name: string; qty: number }[]; expect_time: string | null; status: string; quote: Record<string, unknown>; created_at: string | null; }
export function getBizInquiries(q: { status?: string; kw?: string; page?: number; page_size?: number } = {}) {
  return request<AdminPage<BizInquiry>>({ url: "/admin/biz/inquiries", method: "GET", params: q });
}
export function quoteInquiry(id: number, data: { status: string; quote?: Record<string, unknown> }) {
  return request<{ id: number; status: string }>({ url: `/admin/biz/inquiries/${id}/quote`, method: "PUT", data });
}
export interface BizEngineering { id: number; company: string; contact: string; phone: string; project_type: string; location: string | null; scale: string | null; deadline: string | null; description: string | null; status: string; created_at: string | null; }
export function getBizEngineering(q: { status?: string; kw?: string; page?: number; page_size?: number } = {}) {
  return request<AdminPage<BizEngineering>>({ url: "/admin/biz/engineering", method: "GET", params: q });
}
export function setEngineeringStatus(id: number, status: string) {
  return request<{ id: number; status: string }>({ url: `/admin/biz/engineering/${id}/status`, method: "PUT", data: { status } });
}

// ---------- 招聘管理（P4）----------
export interface AdminJob { id: number; title: string; department: string | null; location: string | null; type: string; salary: string | null; tags: string | null; status: string; is_activate: boolean; publish_time: string | null; }
export function getAdminJobs(q: { type?: string; status?: string; kw?: string; page?: number; page_size?: number } = {}) {
  return request<AdminPage<AdminJob>>({ url: "/admin/jobs", method: "GET", params: q });
}
export function getAdminJob(id: number) { return request<AdminJob & { duty: string; requirement: string }>({ url: `/admin/jobs/${id}`, method: "GET" }); }
export function createAdminJob(data: Record<string, unknown>) { return request<{ id: number }>({ url: "/admin/jobs", method: "POST", data }); }
export function updateAdminJob(id: number, data: Record<string, unknown>) { return request<{ id: number }>({ url: `/admin/jobs/${id}`, method: "PUT", data }); }
export function deleteAdminJob(id: number) { return request<{ deleted: boolean }>({ url: `/admin/jobs/${id}`, method: "DELETE" }); }
export interface AdminResume { id: number; job_id: number; job_title: string; name: string; phone: string; email: string | null; education: string | null; school: string | null; work_years: string | null; intro: string | null; status: string; apply_no: string; created_at: string | null; }
export function getAdminResumes(q: { status?: string; job_id?: number; kw?: string; page?: number; page_size?: number } = {}) {
  return request<AdminPage<AdminResume>>({ url: "/admin/resumes", method: "GET", params: q });
}
export function setResumeStatus(id: number, status: string) {
  return request<{ id: number; status: string }>({ url: `/admin/resumes/${id}/status`, method: "PUT", data: { status } });
}

// ---------- 经销商审核（P4）----------
export interface DealerApplication { id: number; user_id: number | null; user_phone: string | null; company_name: string; credit_code: string; license_img: string; contact: string; phone: string; region: string | null; reason: string | null; status: string; reject_reason: string | null; handled_at: string | null; created_at: string | null; }
export function getDealerApplications(q: { status?: string; page?: number; page_size?: number } = {}) {
  return request<AdminPage<DealerApplication>>({ url: "/admin/dealer-applications", method: "GET", params: q });
}
export function reviewDealer(id: number, data: { action: "approved" | "rejected"; dealer_discount?: number; reject_reason?: string }) {
  return request<{ id: number; status: string; user_role: string }>({ url: `/admin/dealer-applications/${id}/review`, method: "PUT", data });
}

// ---------- 公告/文档（P4）----------
export interface AnnouncementItem { id: number; title: string; scope: string; dealer_ids: number[]; status: string; publish_time: string | null; created_at: string | null; }
export function getAdminAnnouncements(q: { scope?: string; status?: string; page?: number; page_size?: number } = {}) {
  return request<AdminPage<AnnouncementItem>>({ url: "/admin/announcements", method: "GET", params: q });
}
export function getAdminAnnouncement(id: number) { return request<AnnouncementItem & { content_html: string }>({ url: `/admin/announcements/${id}`, method: "GET" }); }
export function createAnnouncement(data: Record<string, unknown>) { return request<{ id: number }>({ url: "/admin/announcements", method: "POST", data }); }
export function updateAnnouncement(id: number, data: Record<string, unknown>) { return request<{ id: number }>({ url: `/admin/announcements/${id}`, method: "PUT", data }); }
export function deleteAnnouncement(id: number) { return request<{ deleted: boolean }>({ url: `/admin/announcements/${id}`, method: "DELETE" }); }
export interface DocItem { id: number; title: string; file_url: string; file_size: number | null; sort: number; }
export function getAdminDocuments() { return request<DocItem[]>({ url: "/admin/documents", method: "GET" }); }
export function createDocument(data: Record<string, unknown>) { return request<{ id: number }>({ url: "/admin/documents", method: "POST", data }); }
export function updateDocument(id: number, data: Record<string, unknown>) { return request<{ id: number }>({ url: `/admin/documents/${id}`, method: "PUT", data }); }
export function deleteDocument(id: number) { return request<{ deleted: boolean }>({ url: `/admin/documents/${id}`, method: "DELETE" }); }

// ---------- 统计（P5）----------
export interface DashboardOverview {
  today: { pv: number; uv: number; new_users: number; new_appointments: number; new_contracts: number };
  pending: { messages: number; appointments: number; low_stock: number; contracts_producing: number };
  trend_7d: { date: string; pv: number; uv: number }[];
}
export function getDashboardOverview() { return request<DashboardOverview>({ url: "/admin/dashboard/overview", method: "GET" }); }
export interface StatOverview { today: { pv: number; uv: number }; yesterday: { pv: number; uv: number }; month: { pv: number; uv: number }; compare: { pv_change: number; uv_change: number }; }
export function getStatOverview() { return request<StatOverview>({ url: "/admin/statistics/overview", method: "GET" }); }
export function getStatTrend(days = 30) { return request<{ date: string; pv: number; uv: number }[]>({ url: "/admin/statistics/trend", method: "GET", params: { days } }); }
export function getStatPages(days = 30, limit = 10) { return request<{ target: string; pv: number; uv: number }[]>({ url: "/admin/statistics/pages", method: "GET", params: { days, limit } }); }
export function getStatProducts(days = 30) { return request<{ target: string; name: string; pv: number; uv: number }[]>({ url: "/admin/statistics/products", method: "GET", params: { days } }); }
export function getStatEvents(days = 30) { return request<{ event: string; count: number }[]>({ url: "/admin/statistics/events", method: "GET", params: { days } }); }

// ---------- 员工管理（P5）----------
export interface AdminStaff { id: number; username: string; name: string | null; nickname: string | null; phone: string | null; email: string | null; position: string | null; department_id: number | null; department_name: string | null; role_id: number; role_name: string | null; role_code: string | null; is_activate: boolean; created_at: string | null; }
export function getAdminStaffs(q: { role_id?: number; kw?: string; page?: number; page_size?: number } = {}) {
  return request<AdminPage<AdminStaff>>({ url: "/admin/staffs", method: "GET", params: q });
}
export function getAdminStaff(id: number) { return request<AdminStaff>({ url: `/admin/staffs/${id}`, method: "GET" }); }
export function createAdminStaff(data: Record<string, unknown>) { return request<{ id: number }>({ url: "/admin/staffs", method: "POST", data }); }
export function updateAdminStaff(id: number, data: Record<string, unknown>) { return request<{ id: number }>({ url: `/admin/staffs/${id}`, method: "PUT", data }); }
export function resetStaffPassword(id: number, password: string) { return request<{ updated: boolean }>({ url: `/admin/staffs/${id}/password`, method: "PUT", data: { password } }); }

// ---------- 角色管理（P5）----------
export interface AdminRole { id: number; role_name: string; code: string; description: string | null; permissions: string[]; }
export function getAdminRoles() { return request<AdminRole[]>({ url: "/admin/roles", method: "GET" }); }
export function getPermissionCatalog() { return request<{ group: string; perms: string[] }[]>({ url: "/admin/roles/permissions", method: "GET" }); }
export function createAdminRole(data: Record<string, unknown>) { return request<{ id: number; code: string }>({ url: "/admin/roles", method: "POST", data }); }
export function updateAdminRole(id: number, data: Record<string, unknown>) { return request<{ id: number }>({ url: `/admin/roles/${id}`, method: "PUT", data }); }
export function deleteAdminRole(id: number) { return request<{ deleted: boolean }>({ url: `/admin/roles/${id}`, method: "DELETE" }); }

// ---------- 操作日志（P5）----------
export interface OpLog { id: number; module: string; action: string; target: string; detail: Record<string, unknown> | null; ip: string | null; operator: string; created_at: string | null; }
export function getAdminLogs(q: { module?: string; kw?: string; page?: number; page_size?: number } = {}) {
  return request<AdminPage<OpLog>>({ url: "/admin/logs", method: "GET", params: q });
}

// ---------- 系统配置（P5）----------
export interface ConfigItem { key: string; value: Record<string, unknown>; group: string; desc: string; updated_at: string | null; }
export function getAdminConfigs() { return request<ConfigItem[]>({ url: "/admin/configs", method: "GET" }); }
export function updateConfig(key: string, value: Record<string, unknown>) { return request<{ key: string; updated: boolean }>({ url: `/admin/configs/${key}`, method: "PUT", data: { value } }); }
