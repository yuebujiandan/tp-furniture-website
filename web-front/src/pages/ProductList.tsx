import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getProducts, getSeries, getSpaces, ProductItem, ProductQuery, DimItem } from "../api/products";
import { submitAppointment } from "../api/content";
import ProductCard from "../components/product/ProductCard";
import Pager from "../components/product/Pager";
import Empty from "../components/product/Empty";
import Modal from "../components/Modal";
import { useUiStore } from "../stores/ui";
import { trackPageView } from "../utils/tracker";

/**
 * 产品中心列表页（技术文档 §7.4 / UIUX §5.5 / PRD 6.2）
 * 实现说明：
 * - 系列 × 空间双维度 Tab + 筛选区（价格 4 档 / 排序 4 种 / 关键词搜索）+ 分页 12/24；
 * - 筛选状态对象驱动 + URL 同步（useSearchParams，刷新可回显）；
 * - 卡片"预约到店"弹窗自动带入产品（P0，PRD 6.2.2 V1.6）；空态一键重置；
 * - 进入页面上报埋点。
 */

/** 价格区间 4 档（UIUX §5.5 映射 price_min/max） */
const PRICE_RANGES = [
  { label: "全部价格", min: undefined, max: undefined },
  { label: "¥5000 以下", min: undefined, max: 5000 },
  { label: "¥5000-15000", min: 5000, max: 15000 },
  { label: "¥15000-30000", min: 15000, max: 30000 },
  { label: "¥30000 以上", min: 30000, max: undefined },
];

/** 排序选项（4 种，技术文档 §6.3） */
const SORTS = [
  { value: "default", label: "默认排序" },
  { value: "price_asc", label: "价格从低到高" },
  { value: "price_desc", label: "价格从高到低" },
  { value: "newest", label: "最新上架" },
];

export default function ProductList() {
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState<ProductItem[]>([]);
  const [total, setTotal] = useState(0);
  const [series, setSeries] = useState<DimItem[]>([]);
  const [spaces, setSpaces] = useState<DimItem[]>([]);
  const [loading, setLoading] = useState(true);
  // 预约弹窗状态（自动带入产品）
  const [apptProduct, setApptProduct] = useState<ProductItem | null>(null);
  const showToast = useUiStore((s) => s.showToast);

  // 从 URL 读取筛选状态（默认值兜底）
  const seriesId = Number(params.get("series_id") || 0) || undefined;
  const spaceId = Number(params.get("space_id") || 0) || undefined;
  const priceIdx = Number(params.get("price") || 0);
  const sort = (params.get("sort") || "default") as ProductQuery["sort"];
  const kw = params.get("kw") || "";
  const page = Number(params.get("page") || 1);
  const pageSize = 12;

  // 初始加载维度列表
  useEffect(() => {
    getSeries().then(setSeries).catch(() => {});
    getSpaces().then(setSpaces).catch(() => {});
  }, []);

  // 筛选状态变化 → 重新拉取列表（URL 同步）
  useEffect(() => {
    setLoading(true);
    const range = PRICE_RANGES[priceIdx] ?? PRICE_RANGES[0];
    getProducts({
      series_id: seriesId, space_id: spaceId, kw: kw || undefined,
      price_min: range.min, price_max: range.max, sort, page, page_size: pageSize,
    })
      .then((res) => { setList(res.list); setTotal(res.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
    trackPageView("/products");
  }, [seriesId, spaceId, priceIdx, sort, kw, page]);

  /** 更新 URL 参数（任一筛选变化时重置到第 1 页） */
  function updateParams(updates: Record<string, string | number | undefined>, resetPage = true) {
    const next = new URLSearchParams(params);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === "" || v === 0) next.delete(k);
      else next.set(k, String(v));
    });
    if (resetPage) next.delete("page");
    setParams(next, { replace: true });
  }

  /** 清空全部筛选（空态一键重置，PRD 6.2.2） */
  function resetAll() {
    setParams({}, { replace: true });
  }

  /** 提交预约（弹窗内表单） */
  async function handleAppt(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await submitAppointment({
        type: "visit",
        name: String(fd.get("name") || ""),
        phone: String(fd.get("phone") || ""),
        expect_date: String(fd.get("expect_date") || ""),
        remark: apptProduct ? `预约了解产品：${apptProduct.name}` : undefined,
        product_id: apptProduct?.id,
      });
      showToast("预约提交成功，我们将尽快与您联系");
      setApptProduct(null);
    } catch {
      /* 拦截器已提示 */
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12">
      {/* 页头 */}
      <div className="text-center mb-10">
        <p className="text-xs tracking-[6px] text-gold-soft mb-3">PRODUCT CENTER</p>
        <h1 className="font-serif-title text-[clamp(28px,3.4vw,42px)] font-bold tracking-[4px] text-cream">产品中心</h1>
      </div>

      {/* ========== 筛选区（UIUX §5.5） ========== */}
      <div className="rounded-[20px] bg-glass backdrop-blur border border-line-gold p-6 mb-8 space-y-5">
        {/* 系列 × 空间双 Tab（维度） */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => updateParams({ series_id: undefined })}
            className={["px-4 py-2 rounded-full text-sm transition-all", !seriesId ? "bg-gradient-to-br from-[#E8CE8A] to-[#A8862A] text-[#1B2A20] font-semibold" : "border border-line-gold text-cream-2 hover:border-gold hover:text-gold-soft"].join(" ")}
          >
            全部分类
          </button>
          {series.map((s) => (
            <button
              key={s.id}
              onClick={() => updateParams({ series_id: s.id, space_id: undefined })}
              className={["px-4 py-2 rounded-full text-sm transition-all", seriesId === s.id ? "bg-gradient-to-br from-[#E8CE8A] to-[#A8862A] text-[#1B2A20] font-semibold" : "border border-line-gold text-cream-2 hover:border-gold hover:text-gold-soft"].join(" ")}
            >
              {s.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line-green pt-5">
          <button
            onClick={() => updateParams({ space_id: undefined })}
            className={["px-4 py-2 rounded-full text-sm transition-all", !spaceId ? "bg-gradient-to-br from-[#E8CE8A] to-[#A8862A] text-[#1B2A20] font-semibold" : "border border-line-gold text-cream-2 hover:border-gold hover:text-gold-soft"].join(" ")}
          >
            全空间
          </button>
          {spaces.map((sp) => (
            <button
              key={sp.id}
              onClick={() => updateParams({ space_id: sp.id })}
              className={["px-4 py-2 rounded-full text-sm transition-all", spaceId === sp.id ? "bg-gradient-to-br from-[#E8CE8A] to-[#A8862A] text-[#1B2A20] font-semibold" : "border border-line-gold text-cream-2 hover:border-gold hover:text-gold-soft"].join(" ")}
            >
              {sp.name}
            </button>
          ))}
        </div>
        {/* 价格区间 + 排序 + 搜索 */}
        <div className="flex flex-wrap items-center gap-3 border-t border-line-green pt-5">
          <select
            value={priceIdx}
            onChange={(e) => updateParams({ price: e.target.value })}
            className="px-4 py-2 rounded-full bg-forest-1 border border-line-gold text-cream-2 text-sm outline-none focus:border-gold"
          >
            {PRICE_RANGES.map((r, i) => <option key={i} value={i}>{r.label}</option>)}
          </select>
          <select
            value={sort ?? "default"}
            onChange={(e) => updateParams({ sort: e.target.value })}
            className="px-4 py-2 rounded-full bg-forest-1 border border-line-gold text-cream-2 text-sm outline-none focus:border-gold"
          >
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <input
            value={kw}
            onChange={(e) => updateParams({ kw: e.target.value }, false)}
            placeholder="搜索产品名称 / 编号"
            className="flex-1 min-w-[200px] px-4 py-2 rounded-full bg-forest-1 border border-line-gold text-cream text-sm placeholder:text-cream-3 outline-none focus:border-gold"
          />
        </div>
      </div>

      {/* ========== 产品列表（3 列栅格） ========== */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-[20px] bg-forest-2/60 animate-pulse h-80" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Empty onReset={resetAll} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {list.map((p) => (
              <div key={p.id} className="relative">
                <ProductCard product={p} />
                {/* 预约到店按钮（P0，弹窗自动带入产品，PRD 6.2.2） */}
                <button
                  onClick={() => setApptProduct(p)}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-forest-2/90 backdrop-blur border border-line-gold text-gold-soft text-xs hover:border-gold transition-all"
                >
                  预约到店
                </button>
              </div>
            ))}
          </div>
          <Pager page={page} total={total} pageSize={pageSize} onChange={(p) => updateParams({ page: p }, false)} />
        </>
      )}

      {/* ========== 预约弹窗（Modal，UIUX §5.4） ========== */}
      <Modal open={!!apptProduct} title={`预约到店 · ${apptProduct?.name ?? ""}`} onClose={() => setApptProduct(null)}>
        <form onSubmit={handleAppt} className="space-y-4">
          <input name="name" required placeholder="您的称呼" className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
          <input name="phone" required placeholder="手机号" pattern="1[3-9]\d{9}" title="请输入 11 位手机号" className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
          <input name="expect_date" required type="date" className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm focus:border-gold outline-none" />
          <button type="submit" className="w-full py-3 rounded-full bg-gradient-to-br from-[#E8CE8A] via-[#C9A227] to-[#A8862A] text-[#1B2A20] font-semibold shadow-gold hover:-translate-y-0.5 transition-all">
            提交预约
          </button>
        </form>
      </Modal>
    </div>
  );
}
