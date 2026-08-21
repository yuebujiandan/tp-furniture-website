import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHome, HomeData } from "../api/home";
import { trackPageView } from "../utils/tracker";

/**
 * 首页（技术文档 §7.4 / UIUX §5.3 / PRD 6.1）
 * 实现说明：
 * - GET /api/v1/home 聚合渲染（减少串行请求，首页首屏 ≤3s）；
 * - Banner 自动轮播 5s + 手动（UIUX §5.3 唯一轮播例外），电影光影蒙层；
 * - 区块：品牌卖点 4 列 / 系列 3 列 / 空间 6 列 / 精选案例 3 列 / 新闻 / 数据背书 / 门店；
 * - 滚动渐入 + 图片懒加载（UIUX §8.3）；进入页面上报埋点。
 */
export default function Home() {
  const [data, setData] = useState<HomeData | null>(null);
  const [bannerIdx, setBannerIdx] = useState(0);

  // 拉取首页聚合数据 + 上报页面浏览
  useEffect(() => {
    getHome().then(setData).catch(() => {});
    trackPageView("/");
  }, []);

  // Banner 自动轮播 5s（UIUX §5.3）
  useEffect(() => {
    if (!data?.banners?.length) return;
    const timer = setInterval(() => setBannerIdx((i) => (i + 1) % data.banners.length), 5000);
    return () => clearInterval(timer);
  }, [data]);

  const banners = data?.banners ?? [];
  const current = banners[bannerIdx];

  return (
    <div>
      {/* ========== Banner 轮播（电影级：全宽 + 光束蒙层） ========== */}
      {current && (
        <section className="relative h-[min(92vh,780px)] flex items-center overflow-hidden">
          {/* 背景图 + 深林渐变蒙层（左重右轻，UIUX §5.3） */}
          <div className="absolute inset-0">
            <img src={current.image} alt={current.title ?? ""} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(8,24,15,.88)_0%,rgba(12,36,24,.55)_45%,rgba(12,36,24,.15)_100%)]" />
          </div>
          {/* 文字内容 */}
          <div className="relative max-w-[1200px] mx-auto px-6 w-full">
            <p className="text-xs tracking-[6px] text-gold-soft mb-5">
              <span className="inline-block w-2 h-2 rounded-full bg-gold shadow-[0_0_8px_#D4AF37] mr-3 align-middle" />
              TP 全屋家居 · 定制专家
              <span className="inline-block w-2 h-2 rounded-full bg-gold shadow-[0_0_8px_#D4AF37] ml-3 align-middle" />
            </p>
            <h1 className="font-serif-title text-[clamp(34px,5.2vw,64px)] font-bold tracking-[4px] leading-[1.25] text-cream mb-4 max-w-[720px]">
              {current.title ?? "把原始森林的气息"}
              <br />
              <span className="text-gold-gradient">{current.subtitle ?? "搬进你的家"}</span>
            </h1>
            <div className="flex gap-4 mt-10">
              <Link
                to={current.link_url ?? "/contact"}
                className="px-8 py-3.5 rounded-full bg-gradient-to-br from-[#E8CE8A] via-[#C9A227] to-[#A8862A] text-[#1B2A20] font-semibold shadow-gold hover:-translate-y-0.5 transition-all"
              >
                {current.button_text ?? "预约到店"}
              </Link>
              <Link to="/products" className="px-8 py-3.5 rounded-full border-[1.5px] border-gold text-gold-soft hover:bg-gold/15 transition-all">
                浏览产品
              </Link>
            </div>
          </div>
          {/* 指示点：激活 44px 金 + 光晕（UIUX §5.3） */}
          {banners.length > 1 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setBannerIdx(i)}
                  aria-label={`Banner ${i + 1}`}
                  className={[
                    "h-1.5 rounded-full transition-all",
                    i === bannerIdx ? "w-11 bg-gold shadow-[0_0_8px_#D4AF37]" : "w-4 bg-white/30",
                  ].join(" ")}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <div className="max-w-[1200px] mx-auto px-6">
        {/* ========== 品牌卖点（4 列） ========== */}
        <Section title="品牌优势" sub="以自然美学与匠心工艺，定制理想之家">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(data?.brand_points ?? []).map((p, i) => (
              <div key={i} className="p-6 rounded-[20px] bg-glass backdrop-blur border border-line-gold text-center hover:-translate-y-1 transition-all">
                <div className="mx-auto mb-4 w-10 h-10 rounded-full bg-gradient-to-br from-[#E8CE8A] to-[#A8862A] text-[#1B2A20] font-serif-title flex items-center justify-center text-sm">
                  {i + 1}
                </div>
                <h3 className="font-serif-title text-base text-cream mb-2">{p.title}</h3>
                <p className="text-xs text-cream-3 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ========== 产品系列（3 列） ========== */}
        <Section title="产品系列" sub="每一系列，皆是一种生活美学">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(data?.series ?? []).map((s) => (
              <Link key={s.id} to={`/products?series_id=${s.id}`} className="group relative rounded-[20px] overflow-hidden border border-line-gold">
                <div className="aspect-[4/3] bg-forest-3">
                  {s.image && <img src={s.image} alt={s.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                </div>
                {/* 玻璃信息卡（UIUX §13.4） */}
                <div className="absolute bottom-0 inset-x-0 p-4 bg-glass backdrop-blur border-t border-line-gold">
                  <h3 className="font-serif-title text-lg text-cream">{s.name}</h3>
                  <p className="text-xs text-cream-3 mt-1 truncate">{s.intro || `${s.product_count} 件臻选产品`}</p>
                </div>
              </Link>
            ))}
          </div>
        </Section>

        {/* ========== 空间导览（6 列） ========== */}
        <Section title="按空间选家具" sub="为每一个空间找到合适的设计">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {(data?.spaces ?? []).map((sp) => (
              <Link
                key={sp.id}
                to={`/products?space_id=${sp.id}`}
                className="p-4 rounded-[16px] bg-glass backdrop-blur border border-line-gold text-center hover:border-gold transition-all"
              >
                <p className="font-serif-title text-sm text-cream">{sp.name}</p>
                <p className="text-[10px] text-cream-3 mt-1">{sp.product_count} 件</p>
              </Link>
            ))}
          </div>
        </Section>

        {/* ========== 精选案例（3 列） + 数据背书 ========== */}
        <Section title="实景案例" sub="每一套都是真实的家">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(data?.featured_cases ?? []).map((c) => (
              <Link key={c.id} to={`/cases/${c.id}`} className="group rounded-[20px] overflow-hidden border border-line-gold hover:-translate-y-1 transition-all">
                <div className="aspect-[4/3] bg-forest-3">
                  {c.cover && <img src={c.cover} alt={c.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                </div>
                <div className="p-4 bg-glass backdrop-blur">
                  <h3 className="font-serif-title text-base text-cream truncate">{c.title}</h3>
                  <p className="text-xs text-cream-3 mt-1">{c.location_desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </Section>

        {/* 数据背书（金色大数字，UIUX §3.2 关键数字） */}
        {(data?.home_stats?.length ?? 0) > 0 && (
          <Section title="数字见证" sub="用实力说话">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(data?.home_stats ?? []).map((s, i) => (
                <div key={i} className="p-8 rounded-[20px] bg-glass backdrop-blur border border-line-gold text-center">
                  <p className="text-gold-gradient font-serif-title text-4xl tracking-wider">{s.value}</p>
                  <p className="text-xs text-cream-3 mt-2 tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ========== 最新新闻（前 4 条） ========== */}
        {(data?.news?.length ?? 0) > 0 && (
          <Section title="新闻资讯" sub="企业动态与行业洞察">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {(data?.news ?? []).map((n) => (
                <Link key={n.id} to={`/news/${n.id}`} className="group rounded-[20px] overflow-hidden border border-line-gold hover:-translate-y-1 transition-all">
                  <div className="aspect-[16/9] bg-forest-3">
                    {n.cover && <img src={n.cover} alt={n.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                  </div>
                  <div className="p-4 bg-glass backdrop-blur">
                    <h3 className="text-sm text-cream leading-relaxed line-clamp-2 group-hover:text-gold-soft transition-colors">{n.title}</h3>
                    <p className="text-[10px] text-cream-3 mt-2">
                      {n.category === "company_news" ? "企业新闻" : "行业资讯"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* ========== 门店（列表） ========== */}
        {(data?.stores?.length ?? 0) > 0 && (
          <Section title="体验门店" sub="欢迎到店参观体验">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(data?.stores ?? []).map((s) => (
                <div key={s.id} className="p-5 rounded-[20px] bg-glass backdrop-blur border border-line-gold flex items-start gap-4">
                  <span className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E8CE8A] to-[#A8862A] text-[#1B2A20] flex items-center justify-center flex-none">店</span>
                  <div>
                    <h3 className="font-serif-title text-base text-cream">{s.name}</h3>
                    <p className="text-xs text-cream-3 mt-1">{s.address}</p>
                    {(s.phone || s.business_hours) && (
                      <p className="text-xs text-cream-3 mt-0.5">{s.phone} · {s.business_hours}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

/** 章节容器：eyebrow + 衬线标题 + 副标题（UIUX §4 布局系统） */
function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="py-16">
      <div className="text-center mb-12">
        <p className="text-xs tracking-[6px] text-gold-soft mb-3">{sub}</p>
        <h2 className="font-serif-title text-[clamp(28px,3.4vw,42px)] font-bold tracking-[4px] text-cream">{title}</h2>
        <div className="mx-auto mt-5 w-16 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
      </div>
      {children}
    </section>
  );
}
