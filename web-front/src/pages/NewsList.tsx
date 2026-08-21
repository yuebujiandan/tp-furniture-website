import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getNews, NewsItem } from "../api/content";
import Pager from "../components/product/Pager";
import Empty from "../components/product/Empty";
import { trackPageView } from "../utils/tracker";

/**
 * 新闻资讯列表页（PRD 6.4.1）
 * 实现说明：企业新闻/行业资讯双 Tab + 分页；置顶优先由后端排序。
 */
export default function NewsList() {
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState<NewsItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const category = params.get("category") || "";
  const page = Number(params.get("page") || 1);
  const pageSize = 10;

  useEffect(() => {
    setLoading(true);
    getNews({ category: category || undefined, page, page_size: pageSize })
      .then((res) => { setList(res.list); setTotal(res.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
    trackPageView("/news");
  }, [category, page]);

  function switchTab(cat: string) {
    const n = new URLSearchParams(params);
    if (cat) n.set("category", cat);
    else n.delete("category");
    n.delete("page");
    setParams(n, { replace: true });
  }

  return (
    <div className="max-w-[900px] mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <p className="text-xs tracking-[6px] text-gold-soft mb-3">NEWS</p>
        <h1 className="font-serif-title text-[clamp(28px,3.4vw,42px)] font-bold tracking-[4px] text-cream">新闻资讯</h1>
      </div>

      {/* 双 Tab（企业新闻/行业资讯） */}
      <div className="flex justify-center gap-2 mb-10">
        {[["", "全部"], ["company_news", "企业新闻"], ["industry_news", "行业资讯"]].map(([val, label]) => (
          <button
            key={val}
            onClick={() => switchTab(val)}
            className={[
              "px-6 py-2.5 rounded-full text-sm transition-all",
              category === val ? "bg-gradient-to-br from-[#E8CE8A] to-[#A8862A] text-[#1B2A20] font-semibold" : "border border-line-gold text-cream-2 hover:border-gold hover:text-gold-soft",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 新闻列表（大图卡 + 列表行混合） */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="rounded-[20px] bg-forest-2/60 animate-pulse h-28" />)}
        </div>
      ) : list.length === 0 ? (
        <Empty message="暂无新闻" onReset={() => setParams({}, { replace: true })} />
      ) : (
        <>
          <div className="space-y-4">
            {list.map((n, i) => (
              <Link
                key={n.id}
                to={`/news/${n.id}`}
                className={[
                  "flex gap-5 rounded-[20px] overflow-hidden border border-line-gold hover:border-gold transition-all p-4",
                  i < 3 && !n.cover ? "bg-forest-2" : "",
                ].join(" ")}
              >
                {/* 前 3 条图文大卡（PRD 6.4.1） */}
                {n.cover && (
                  <div className="w-40 h-24 rounded-[12px] overflow-hidden flex-none bg-forest-3">
                    <img src={n.cover} alt={n.title} loading="lazy" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-gold/15 border border-gold text-gold-soft text-[10px]">
                      {n.category === "company_news" ? "企业新闻" : "行业资讯"}
                    </span>
                    {n.is_top && <span className="px-2 py-0.5 rounded-full bg-forest-2 text-gold-soft text-[10px] border border-line-gold">置顶</span>}
                  </div>
                  <h2 className="text-cream text-base leading-relaxed hover:text-gold-soft transition-colors line-clamp-2">{n.title}</h2>
                  <p className="text-xs text-cream-3 mt-1 line-clamp-1">{n.summary}</p>
                  <p className="text-[10px] text-cream-3 mt-2">
                    {n.publish_time ? new Date(n.publish_time).toLocaleDateString("zh-CN") : ""} · {n.view_count} 阅读
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <Pager page={page} total={total} pageSize={pageSize} onChange={(p) => { const n = new URLSearchParams(params); n.set("page", String(p)); setParams(n, { replace: true }); }} />
        </>
      )}
    </div>
  );
}
