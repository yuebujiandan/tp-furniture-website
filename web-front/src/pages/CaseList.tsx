import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getCases, CaseItem } from "../api/content";
import Pager from "../components/product/Pager";
import Empty from "../components/product/Empty";
import { trackPageView } from "../utils/tracker";

/**
 * 实景案例列表页（PRD 6.3）
 * 实现说明：风格/空间筛选 + 分页；工程案例与住宅案例入口统一列表；
 * URL 同步筛选状态；进入页面上报埋点。
 */
export default function CaseList() {
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState<CaseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const style = params.get("style") || "";
  const space = params.get("space") || "";
  const page = Number(params.get("page") || 1);
  const pageSize = 9;

  // 筛选变化 → 拉取列表
  useEffect(() => {
    setLoading(true);
    getCases({ style: style || undefined, space: space || undefined, page, page_size: pageSize })
      .then((res) => { setList(res.list); setTotal(res.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
    trackPageView("/cases");
  }, [style, space, page]);

  /** 更新筛选参数 */
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setParams(next, { replace: true });
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <p className="text-xs tracking-[6px] text-gold-soft mb-3">REAL CASE</p>
        <h1 className="font-serif-title text-[clamp(28px,3.4vw,42px)] font-bold tracking-[4px] text-cream">实景案例</h1>
      </div>

      {/* 筛选区（风格胶囊） */}
      <div className="flex flex-wrap gap-2 justify-center mb-10">
        {["全部", "新中式", "现代简约", "轻奢", "原木风", "北欧", "侘寂"].map((s) => (
          <button
            key={s}
            onClick={() => update("style", s === "全部" ? "" : s)}
            className={[
              "px-4 py-2 rounded-full text-sm transition-all",
              (s === "全部" ? style === "" : style === s)
                ? "bg-gradient-to-br from-[#E8CE8A] to-[#A8862A] text-[#1B2A20] font-semibold"
                : "border border-line-gold text-cream-2 hover:border-gold hover:text-gold-soft",
            ].join(" ")}
          >
            {s}
          </button>
        ))}
      </div>

      {/* 案例栅格（3 列） */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="rounded-[20px] bg-forest-2/60 animate-pulse h-72" />)}
        </div>
      ) : list.length === 0 ? (
        <Empty message="暂无匹配的案例" onReset={() => setParams({}, { replace: true })} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {list.map((c) => (
              <Link key={c.id} to={`/cases/${c.id}`} className="group rounded-[20px] overflow-hidden border border-line-gold hover:-translate-y-1 transition-all">
                <div className="aspect-[4/3] bg-forest-3">
                  {c.cover && <img src={c.cover} alt={c.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                </div>
                <div className="p-4 bg-glass backdrop-blur">
                  <h3 className="font-serif-title text-base text-cream truncate">{c.title}</h3>
                  <p className="text-xs text-cream-3 mt-1">
                    {c.area} · {c.style_tags}
                    {c.is_engineering && <span className="ml-2 px-2 py-0.5 rounded-full bg-gold/15 border border-gold text-gold-soft text-[10px]">工程案例</span>}
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
