import { useEffect, useState } from "react";
import { applyDealer, getMyApply, getDealerProducts, getDealerAnnouncements, submitIntent, getMyIntents } from "../../api/biz";
import Pager from "../../components/product/Pager";
import { useUiStore } from "../../stores/ui";
import { useAuthStore } from "../../stores/auth";
import { trackEvent, trackPageView } from "../../utils/tracker";

/**
 * 经销商门户（PRD 6.9.5 / 技术文档 §7.4）
 * 实现说明：
 * - 未认证：展示认证申请表单（POST /dealer/apply）+ 我的申请状态（待审核/驳回原因）；
 * - 已认证（dealer 角色）：3 个区块 —— 公告（scope 过滤）/ 专属价产品（批量采购，选入意向清单）/ 我的采购意向；
 * - 批量采购：勾选产品加入意向 → 提交采购意向（POST /dealer/intents，后台报价）。
 */
export default function DealerPortal() {
  const { user } = useAuthStore();
  const showToast = useUiStore((s) => s.showToast);
  const isDealer = user?.role === "dealer";

  // 认证相关
  const [applyForm, setApplyForm] = useState({ company_name: "", credit_code: "", license_img: "", contact: "", phone: "", region: "", reason: "" });
  const [myApply, setMyApply] = useState<{ applied: boolean; status: string | null; reject_reason: string | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 门户数据
  const [announcements, setAnnouncements] = useState<{ id: number; title: string; content_html: string; publish_time: string | null }[]>([]);
  const [products, setProducts] = useState<{ id: number; name: string; product_no: string; dealer_price: number | null; cover_image_url: string | null }[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Map<number, { id: number; name: string; qty: number }>>(new Map());
  const [intents, setIntents] = useState<{ id: number; items: { name: string; qty: number }[]; status: string; created_at: string | null }[]>([]);

  useEffect(() => {
    trackPageView("/dealer");
    getMyApply().then(setMyApply).catch(() => {});
    if (isDealer) {
      loadAnnouncements();
      loadProducts(1);
      loadIntents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDealer]);

  /** 加载公告 */
  async function loadAnnouncements() {
    try { setAnnouncements(await getDealerAnnouncements()); } catch { /* 拦截器已提示 */ }
  }
  /** 加载专属价产品 */
  async function loadProducts(p: number) {
    try {
      const res = await getDealerProducts({ page: p, page_size: 12 });
      setProducts(res.list);
      setTotal(res.total);
    } catch { /* 拦截器已提示 */ }
  }
  /** 加载我的意向 */
  async function loadIntents() {
    try {
      const res = await getMyIntents({ page: 1, page_size: 20 });
      setIntents(res.list);
    } catch { /* 拦截器已提示 */ }
  }

  /** 提交认证申请 */
  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await applyDealer(applyForm);
      showToast("认证申请已提交，请等待审核");
      trackEvent("dealer_apply");
      setMyApply({ applied: true, status: "pending", reject_reason: null });
    } catch { /* 拦截器已提示（40302/40903） */ } finally { setSubmitting(false); }
  }

  /** 勾选产品加入意向 */
  function toggleSelect(p: { id: number; name: string; dealer_price: number | null }) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(p.id)) next.delete(p.id);
      else next.set(p.id, { id: p.id, name: p.name, qty: 1 });
      return next;
    });
  }

  /** 提交采购意向 */
  async function handleSubmitIntent() {
    const items = Array.from(selected.values());
    if (items.length === 0) { showToast("请先勾选产品"); return; }
    try {
      await submitIntent(items);
      showToast("采购意向已提交，等待报价");
      trackEvent("dealer_intent");
      setSelected(new Map());
      loadIntents();
    } catch { /* 拦截器已提示 */ }
  }

  /** 意向状态标签 */
  const intentStatus = (s: string) => ({
    pending_quote: "待报价", quoted: "已报价", confirmed: "已确认", closed: "已关闭",
  }[s] ?? s);

  // ========== 未认证：申请表单 ==========
  if (!isDealer) {
    return (
      <div className="max-w-[720px] mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <p className="text-xs tracking-[6px] text-gold-soft mb-3">DEALER PORTAL</p>
          <h1 className="font-serif-title text-[clamp(26px,3.4vw,36px)] font-bold tracking-[4px] text-cream">经销商认证</h1>
        </div>

        {/* 我的申请状态 */}
        {myApply?.applied && (
          <div className="rounded-[20px] bg-glass backdrop-blur border border-line-gold p-6 mb-8">
            <p className="text-xs text-cream-3 mb-2">我的认证申请状态</p>
            {myApply.status === "pending" && <p className="text-amber text-sm">⏳ 审核中，请耐心等待</p>}
            {myApply.status === "approved" && <p className="text-fern-soft text-sm">✅ 已通过，刷新后进入门户</p>}
            {myApply.status === "rejected" && (
              <p className="text-coral text-sm">❌ 已驳回：{myApply.reject_reason || "资料不完整"}，可修改后重新提交</p>
            )}
          </div>
        )}

        {/* 申请表单（PRD 6.9.5） */}
        <form onSubmit={handleApply} className="rounded-[20px] bg-glass backdrop-blur border border-line-gold p-8 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input required value={applyForm.company_name} onChange={(e) => setApplyForm({ ...applyForm, company_name: e.target.value })} placeholder="企业名称" maxLength={100}
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
            <input required value={applyForm.credit_code} onChange={(e) => setApplyForm({ ...applyForm, credit_code: e.target.value })} placeholder="统一社会信用代码" maxLength={50}
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
          </div>
          <input required value={applyForm.license_img} onChange={(e) => setApplyForm({ ...applyForm, license_img: e.target.value })} placeholder="营业执照图片 URL" maxLength={255}
            className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
          <div className="grid grid-cols-2 gap-4">
            <input required value={applyForm.contact} onChange={(e) => setApplyForm({ ...applyForm, contact: e.target.value })} placeholder="联系人" maxLength={50}
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
            <input required value={applyForm.phone} onChange={(e) => setApplyForm({ ...applyForm, phone: e.target.value })} placeholder="联系电话" pattern="1[3-9]\d{9}"
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input value={applyForm.region} onChange={(e) => setApplyForm({ ...applyForm, region: e.target.value })} placeholder="所在地区"
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
            <input value={applyForm.reason} onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })} placeholder="申请理由"
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
          </div>
          <button type="submit" disabled={submitting}
            className="w-full py-3.5 rounded-full bg-gradient-to-br from-[#E8CE8A] via-[#C9A227] to-[#A8862A] text-[#1B2A20] font-semibold shadow-gold disabled:opacity-50 hover:-translate-y-0.5 transition-all">
            {submitting ? "提交中..." : "提交认证申请"}
          </button>
        </form>
      </div>
    );
  }

  // ========== 已认证：门户 ==========
  return (
    <div className="max-w-[1100px] mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <p className="text-xs tracking-[6px] text-gold-soft mb-3">DEALER PORTAL</p>
        <h1 className="font-serif-title text-[clamp(26px,3.4vw,36px)] font-bold tracking-[4px] text-cream">经销商门户</h1>
        <p className="text-sm text-cream-3 mt-2">{user?.nickname || user?.phone} · 欢迎回来</p>
      </div>

      {/* 公告（scope 过滤，PRD 6.9.5 V1.2） */}
      <section className="mb-12">
        <h2 className="font-serif-title text-xl tracking-[2px] text-cream mb-6">品牌公告</h2>
        {announcements.length === 0 ? (
          <p className="text-sm text-cream-3">暂无公告</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="rounded-[16px] bg-glass backdrop-blur border border-line-gold p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm text-cream">{a.title}</h3>
                  {a.publish_time && <span className="text-[10px] text-cream-3">{new Date(a.publish_time).toLocaleDateString("zh-CN")}</span>}
                </div>
                <p className="text-xs text-cream-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: a.content_html }} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 专属价产品（勾选加入采购意向） */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif-title text-xl tracking-[2px] text-cream">专属价产品</h2>
          <button onClick={handleSubmitIntent}
            className="px-6 py-2.5 rounded-full bg-gradient-to-br from-[#E8CE8A] to-[#A8862A] text-[#1B2A20] font-semibold text-sm shadow-gold hover:-translate-y-0.5 transition-all">
            提交采购意向（{selected.size}）
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((p) => (
            <button key={p.id} onClick={() => toggleSelect(p)}
              className={[
                "text-left rounded-[16px] overflow-hidden border transition-all",
                selected.has(p.id) ? "border-gold shadow-gold" : "border-line-gold hover:border-gold",
              ].join(" ")}>
              <div className="aspect-[4/3] bg-forest-3">
                {p.cover_image_url && <img src={p.cover_image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover" />}
              </div>
              <div className="p-3 bg-glass backdrop-blur">
                <p className="text-xs text-cream truncate">{p.name}</p>
                <p className="text-gold-gradient font-serif-title text-sm mt-1">
                  {p.dealer_price !== null ? `¥${p.dealer_price.toLocaleString("zh-CN")}` : "待报价"}
                </p>
                <p className="text-[10px] text-cream-3 mt-0.5">{selected.has(p.id) ? "已勾选 ✓" : "点击选择"}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-6">
          <Pager page={page} total={total} pageSize={12} onChange={(p) => { setPage(p); loadProducts(p); }} />
        </div>
      </section>

      {/* 我的采购意向 */}
      <section>
        <h2 className="font-serif-title text-xl tracking-[2px] text-cream mb-6">我的采购意向</h2>
        {intents.length === 0 ? (
          <p className="text-sm text-cream-3">暂无采购意向</p>
        ) : (
          <div className="space-y-3">
            {intents.map((i) => (
              <div key={i.id} className="rounded-[16px] bg-glass backdrop-blur border border-line-gold p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-cream-2 mb-1">{i.items.map((it) => `${it.name}×${it.qty}`).join("、")}</p>
                  <p className="text-[10px] text-cream-3">{new Date(i.created_at ?? "").toLocaleString("zh-CN", { hour12: false })}</p>
                </div>
                <span className="px-3 py-1 rounded-full border border-gold text-gold-soft text-xs">{intentStatus(i.status)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
