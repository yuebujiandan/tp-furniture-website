import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import { getProduct, getRelatedProducts, ProductDetail as Detail, ProductItem } from "../api/products";
import { getProductCases } from "../api/products";
import { submitAppointment } from "../api/content";
import Gallery from "../components/product/Gallery";
import ProductCard from "../components/product/ProductCard";
import Modal from "../components/Modal";
import { useAuthStore } from "../stores/auth";
import { useUiStore } from "../stores/ui";
import { trackEvent, trackProductView, trackPageView } from "../utils/tracker";
import request from "../api/client";

/**
 * 产品详情页（技术文档 §7.4 / UIUX §5.6 / PRD 6.2.3）
 * 实现说明：
 * - 动态渲染：GET /products/:id（40401 下架提示）；
 * - Gallery 主图+缩略图+Lightbox；富文本 DOMPurify 清洗（防 XSS，PRD 9.2）；
 * - 收藏：未登录引导登录回跳；已登录调用 /favorites（金色高亮 + Toast）；
 * - 经销商登录显示经销商价（dealer_price 优先，ADR-004）；
 * - 预约到店弹窗（带产品）；相关推荐 4 卡 + 相关案例 3 卡；
 * - 进入页面上报产品浏览埋点。
 */
export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const navigate = useNavigate();
  const [product, setProduct] = useState<Detail | null>(null);
  const [related, setRelated] = useState<ProductItem[]>([]);
  const [relatedCases, setRelatedCases] = useState<{ id: number; title: string; cover: string | null }[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [apptOpen, setApptOpen] = useState(false);
  const { isLoggedIn, user } = useAuthStore();
  const showToast = useUiStore((s) => s.showToast);

  // ========== Tab 栏目状态（商品详情 / 售后服务 / 用户评价） ==========
  const [activeTab, setActiveTab] = useState<"detail" | "service" | "reviews">("detail");
  const tabs: { key: "detail" | "service" | "reviews"; label: string }[] = [
    { key: "detail", label: "商品详情" },
    { key: "service", label: "售后服务" },
    { key: "reviews", label: "用户评价" },
  ];

  // 加载详情/相关推荐/关联案例 + 埋点
  useEffect(() => {
    if (!productId) return;
    getProduct(productId)
      .then((p) => {
        setProduct(p);
        trackProductView(productId);
        trackPageView(`/products/${productId}`);
      })
      .catch(() => setNotFound(true));
    getRelatedProducts(productId).then((r) => setRelated(r)).catch(() => {});
    getProductCases(productId).then((r) => setRelatedCases(r)).catch(() => {});
  }, [productId]);

  /** 收藏/取消收藏（未登录 → 登录回跳，PRD 6.7.3） */
  async function toggleFavorite() {
    if (!isLoggedIn) {
      showToast("请先登录");
      navigate(`/login?redirect=${encodeURIComponent(`/products/${productId}`)}`);
      return;
    }
    try {
      if (favorited) {
        await request({ url: `/favorites/${productId}`, method: "DELETE" });
        setFavorited(false);
        showToast("已取消收藏");
      } else {
        await request({ url: `/favorites/${productId}`, method: "POST" });
        setFavorited(true);
        showToast("收藏成功");
        trackEvent("favorite");
      }
    } catch {
      /* 拦截器已提示（含 40902 已收藏） */
    }
  }

  /** 提交预约（带产品信息） */
  async function handleAppt(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await submitAppointment({
        type: "visit",
        name: String(fd.get("name") || ""),
        phone: String(fd.get("phone") || ""),
        expect_date: String(fd.get("expect_date") || ""),
        product_id: productId,
        remark: product ? `预约了解产品：${product.name}` : undefined,
      });
      showToast("预约提交成功，我们将尽快与您联系");
      setApptOpen(false);
      trackEvent("appointment_submit");
    } catch {
      /* 拦截器已提示 */
    }
  }

  // 产品不存在/已下架（PRD 6.2.3）
  if (notFound) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-serif-title text-3xl text-cream mb-4">产品不存在或已下架</h1>
        <Link to="/products" className="px-8 py-3 rounded-full border-[1.5px] border-gold text-gold-soft hover:bg-gold/15 transition-all text-sm">
          返回产品中心
        </Link>
      </div>
    );
  }
  if (!product) return <div className="min-h-[50vh]" />;

  // 经销商可见价格：dealer_price 优先，NULL 按用户折扣率折算（ADR-004 展示层）
  const showDealerPrice = user?.role === "dealer";
  const displayPrice = showDealerPrice
    ? (product.dealer_price ?? (user.dealer_discount != null && product.retail_price != null ? product.retail_price * user.dealer_discount : null))
    : product.retail_price;

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12">
      {/* 面包屑 */}
      <nav className="text-xs text-cream-3 mb-8">
        <Link to="/" className="hover:text-gold-soft">首页</Link>
        <span className="mx-2">/</span>
        <Link to="/products" className="hover:text-gold-soft">产品中心</Link>
        <span className="mx-2">/</span>
        <span className="text-gold-soft">{product.name}</span>
      </nav>

      {/* ========== 主区：图集 + 信息 ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-10">
        {/* 图集 */}
        <div className="lg:sticky lg:top-[104px] self-start">
          <Gallery images={product.images} alt={product.name} />
        </div>

        {/* 信息区 */}
        <div>
          <p className="text-xs tracking-[4px] text-gold-soft mb-3">{product.series_name} · {product.category_name}</p>
          <h1 className="font-serif-title text-3xl tracking-[2px] text-cream mb-4">{product.name}</h1>
          <p className="text-xs text-cream-3 mb-6">编号：{product.product_no}</p>

          {/* 价格（经销商价标签，UIUX 5.5） */}
          <div className="flex items-end gap-4 mb-6">
            {displayPrice !== null ? (
              <span className="text-gold-gradient font-serif-title text-4xl">
                ¥{displayPrice.toLocaleString("zh-CN", { maximumFractionDigits: 0 })}
              </span>
            ) : (
              <span className="text-cream-2 text-lg">按方案报价</span>
            )}
            {showDealerPrice && (
              <span className="px-2.5 py-1 rounded-full bg-gold/15 border border-gold text-gold-soft text-xs mb-2">经销商价</span>
            )}
            <span className="text-xs text-cream-3 mb-2">零售参考价，以门店报价为准</span>
          </div>

          {/* 规格参数（合并垂直列表：编号 / 风格 / 尺寸 / 材质 / 适用空间 / 质保） */}
          <div className="rounded-[14px] bg-glass backdrop-blur border border-line-gold overflow-hidden mb-8">
            {[
              { label: "编号", value: product.product_no },
              { label: "风格", value: product.style_tags },
              { label: "尺寸", value: product.size },
              { label: "材质", value: product.material },
              { label: "工艺", value: product.craft },
              { label: "适用空间", value: product.spaces?.map((s) => s.name).join("、") || product.series_name || "-" },
              { label: "质保", value: product.warranty },
            ].map((it, idx, arr) => (
              <div key={it.label} className={`flex items-center px-5 py-3.5 text-sm ${idx < arr.length - 1 ? "border-b border-line-gold/20" : ""}`}>
                <dt className="text-cream-3 w-[30%] shrink-0">{it.label}</dt>
                <dd className="text-cream-2 w-[70%]">{it.value || "-"}</dd>
              </div>
            ))}
          </div>

          {/* 操作区：预约到店 / 收藏 / 分享 */}
          <div className="flex gap-3 mb-8">
            <button
              onClick={() => setApptOpen(true)}
              className="flex-1 py-3.5 rounded-full bg-gradient-to-br from-[#E8CE8A] via-[#C9A227] to-[#A8862A] text-[#1B2A20] font-semibold shadow-gold hover:-translate-y-0.5 transition-all"
            >
              预约到店
            </button>
            <button
              onClick={toggleFavorite}
              className={[
                "px-6 py-3.5 rounded-full border transition-all text-sm",
                favorited ? "border-gold bg-gold/15 text-gold-soft" : "border-line-gold text-cream-2 hover:border-gold hover:text-gold-soft",
              ].join(" ")}
            >
              {favorited ? "♥ 已收藏" : "♡ 收藏"}
            </button>
            <button
              onClick={() => { navigator.clipboard?.writeText(window.location.href); showToast("链接已复制"); }}
              className="px-6 py-3.5 rounded-full border border-line-gold text-cream-2 text-sm hover:border-gold hover:text-gold-soft transition-all"
            >
              分享
            </button>
          </div>
        </div>
      </div>

      {/* ========== Tab 栏目：商品详情 / 售后服务 / 用户评价（参考 guanglikou.com 布局） ========== */}
      <section className="mt-16">
        {/* Tab 导航栏 */}
        <div className="flex border-b border-line-gold/40 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={[
                "px-6 py-3 text-sm font-medium tracking-wider transition-all relative",
                activeTab === tab.key
                  ? "text-[#C9A227] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#C9A227]"
                  : "text-cream-3 hover:text-cream-2",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* --- Tab 1：商品详情（属性表 + 品牌门店卡片） --- */}
        {activeTab === "detail" && (
          <div className="space-y-8">
            {/* 1. 产品属性表格（三列网格） */}
            <div className="rounded-[16px] bg-glass backdrop-blur border border-line-gold overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {/* 第 1 行：编号 / 分类 / 风格 */}
                  <tr className="border-b border-line-gold/20">
                    <td className="py-3.5 px-5 text-cream-3 w-[100px] shrink-0 bg-forest-1/30">编号</td>
                    <td className="py-3.5 px-5 text-cream-2">{product.product_no || "-"}</td>
                    <td className="py-3.5 px-5 text-cream-3 w-[100px] shrink-0 bg-forest-1/30 border-l border-line-gold/20">分类</td>
                    <td className="py-3.5 px-5 text-cream-2">{product.category_name || product.series_name || "-"}</td>
                    <td className="py-3.5 px-5 text-cream-3 w-[100px] shrink-0 bg-forest-1/30 border-l border-line-gold/20">风格</td>
                    <td className="py-3.5 px-5 text-cream-2">{product.style_tags || "-"}</td>
                  </tr>
                  {/* 第 2 行：材质 / 尺寸 / 工艺 */}
                  <tr className="border-b border-line-gold/20">
                    <td className="py-3.5 px-5 text-cream-3 bg-forest-1/30">材质</td>
                    <td className="py-3.5 px-5 text-cream-2">{product.material || "-"}</td>
                    <td className="py-3.5 px-5 text-cream-3 bg-forest-1/30 border-l border-line-gold/20">尺寸</td>
                    <td className="py-3.5 px-5 text-cream-2">{product.size || "-"}</td>
                    <td className="py-3.5 px-5 text-cream-3 bg-forest-1/30 border-l border-line-gold/20">工艺</td>
                    <td className="py-3.5 px-5 text-cream-2">{product.craft || "-"}</td>
                  </tr>
                  {/* 第 3 行：价格 / 适用空间 / 质保 */}
                  <tr className="border-b border-line-gold/20">
                    <td className="py-3.5 px-5 text-cream-3 bg-forest-1/30">价格</td>
                    <td className="py-3.5 px-5 text-gold-soft font-medium">
                      {displayPrice !== null ? `¥${displayPrice.toLocaleString("zh-CN", { maximumFractionDigits: 0 })}` : "按方案报价"}
                    </td>
                    <td className="py-3.5 px-5 text-cream-3 bg-forest-1/30 border-l border-line-gold/20">适用空间</td>
                    <td className="py-3.5 px-5 text-cream-2">{product.spaces?.map((s) => s.name).join("、") || product.series_name || "-"}</td>
                    <td className="py-3.5 px-5 text-cream-3 bg-forest-1/30 border-l border-line-gold/20">质保</td>
                    <td className="py-3.5 px-5 text-cream-2">{product.warranty || "-"}</td>
                  </tr>
                  {/* 第 4 行+：详细板材参数（来自 specs JSON，排除已展示字段，保持三列网格风格一致） */}
                  {(() => {
                    const gridKeys = new Set(["编号", "分类", "风格", "材质", "尺寸", "工艺", "价格", "适用空间", "质保"]);
                    const extraSpecs = (product.specs && Object.keys(product.specs).length > 0)
                      ? Object.entries(product.specs).filter(([k]) => !gridKeys.has(k))
                      : [];
                    if (extraSpecs.length === 0) return null;
                    const groups = extraSpecs.map(([k, v]) => ({ label: k, value: String(v) }));
                    const rows: typeof groups[] = [];
                    for (let i = 0; i < groups.length; i += 3) rows.push(groups.slice(i, i + 3));
                    return (
                      <>
                        {rows.map((row, ri) => (
                          <tr key={ri} className={ri < rows.length - 1 ? "border-b border-line-gold/20" : ""}>
                            {Array.from({ length: 3 }).map((_, ci) => {
                              const item = row[ci];
                              return (
                                <React.Fragment key={ci}>
                                  <td className={`py-3.5 px-5 text-cream-3 ${ci > 0 ? "border-l border-line-gold/20" : ""} ${item ? "bg-forest-1/30" : ""}`}>
                                    {item?.label || ""}
                                  </td>
                                  <td className={`py-3.5 px-5 ${item ? "text-cream-2" : ""}`}>
                                    {item?.value || ""}
                                  </td>
                                </React.Fragment>
                              );
                            })}
                          </tr>
                        ))}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>

            {/* 2. 产品介绍（富文本，DOMPurify 清洗，支持图片和文本） */}
            {product.detail_html && (
              <div
                className="prose-content text-cream-2 text-sm leading-relaxed space-y-4"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.detail_html) }}
              />
            )}

            {/* 3. 品牌门店信息卡片 */}
            <div className="flex flex-col sm:flex-row items-start gap-6 p-6 rounded-[16px] bg-glass backdrop-blur border border-line-gold">
              {/* 品牌 Logo 占位 */}
              <div className="w-28 h-28 rounded-[14px] bg-forest-2 flex items-center justify-center shrink-0 border border-line-gold/30 overflow-hidden">
                {product.cover_image_url ? (
                  <img src={product.cover_image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-serif-title text-xl text-gold-soft">TP</span>
                )}
              </div>
              {/* 门店信息 */}
              <div className="flex-1 space-y-2 min-w-0">
                <p className="text-base text-cream font-medium">TP全屋家居 · {product.series_name || "定制家具"}</p>
                <p className="text-xs text-cream-3">
                  门店地址：
                  <Link to="/contact" className="text-gold-soft hover:underline ml-1">
                    查看全国门店
                  </Link>
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <button
                    onClick={() => setApptOpen(true)}
                    className="px-5 py-2 rounded-full bg-gradient-to-br from-[#E8CE8A] via-[#C9A227] to-[#A8862A] text-[#1B2A20] text-xs font-semibold hover:-translate-y-0.5 transition-all"
                  >
                    预约到店
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- Tab 2：售后服务 --- */}
        {activeTab === "service" && (
          <div className="rounded-[16px] bg-glass backdrop-blur border border-line-gold p-8 space-y-6">
            <h3 className="font-serif-title text-lg text-cream tracking-wider">售后服务承诺</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  icon: "🛡️", title: "质量保障", desc: "所有产品均经过严格质检，质保期内非人为损坏免费维修或更换。",
                },
                {
                  icon: "🚚", title: "配送安装", desc: "专业团队上门测量、配送、安装，全程跟踪服务，确保完美交付。",
                },
                {
                  icon: "🔧", title: "售后维保", desc: "提供终身维护服务，定期回访，快速响应售后需求，让您无后顾之忧。",
                },
                {
                  icon: "💬", title: "专属顾问", desc: "一对一专属客服，从咨询到售后全程跟进，解答您的所有疑问。",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 p-5 rounded-[14px] bg-forest-1/30 border border-line-gold/20">
                  <span className="text-2xl shrink-0">{item.icon}</span>
                  <div>
                    <h4 className="text-sm font-medium text-cream mb-1">{item.title}</h4>
                    <p className="text-xs text-cream-3 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-line-gold/20 text-center">
              <p className="text-xs text-cream-3">如有任何问题，请拨打客服热线或通过「联系我们」页面留言</p>
              <Link to="/contact" className="inline-block mt-3 px-6 py-2.5 rounded-full border border-gold text-gold-soft text-xs hover:bg-gold/10 transition-all">
                联系我们
              </Link>
            </div>
          </div>
        )}

        {/* --- Tab 3：用户评价（占位展示） --- */}
        {activeTab === "reviews" && (
          <div className="rounded-[16px] bg-glass backdrop-blur border border-line-gold p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif-title text-lg text-cream tracking-wider">用户评价</h3>
              <span className="text-xs text-cream-3">暂无评价数据</span>
            </div>
            {/* 评分概览 + 评价列表占位 */}
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-forest-1/50 flex items-center justify-center">
                <svg className="w-8 h-8 text-cream-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </div>
              <p className="text-sm text-cream-3 mb-2">暂无用户评价</p>
              <p className="text-xs text-cream-3/60">成为首批评价的用户，分享您的使用体验</p>
            </div>
          </div>
        )}
      </section>

      {/* ========== 相关推荐（同系列 4 卡，技术文档 §7.4） ========== */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-serif-title text-2xl tracking-[3px] text-cream text-center mb-10">相关推荐</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* ========== 相关案例（3 卡） ========== */}
      {relatedCases.length > 0 && (
        <section className="mt-16">
          <h2 className="font-serif-title text-2xl tracking-[3px] text-cream text-center mb-10">相关案例</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedCases.map((c) => (
              <Link key={c.id} to={`/cases/${c.id}`} className="group rounded-[20px] overflow-hidden border border-line-gold hover:-translate-y-1 transition-all">
                <div className="aspect-[4/3] bg-forest-3">
                  {c.cover && <img src={c.cover} alt={c.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                </div>
                <div className="p-4 bg-glass backdrop-blur">
                  <h3 className="font-serif-title text-sm text-cream truncate">{c.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ========== 预约弹窗 ========== */}
      <Modal open={apptOpen} title={`预约到店 · ${product.name}`} onClose={() => setApptOpen(false)}>
        <form onSubmit={handleAppt} className="space-y-4">
          <input name="name" required placeholder="您的称呼" className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
          <input name="phone" required placeholder="手机号" pattern="1[3-9]\d{9}" className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
          <input name="expect_date" required type="date" className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm focus:border-gold outline-none" />
          <button type="submit" className="w-full py-3 rounded-full bg-gradient-to-br from-[#E8CE8A] via-[#C9A227] to-[#A8862A] text-[#1B2A20] font-semibold shadow-gold">提交预约</button>
        </form>
      </Modal>
    </div>
  );
}
