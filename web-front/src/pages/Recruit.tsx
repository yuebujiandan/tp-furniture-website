import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getJobs, JobItem } from "../api/biz";
import Pager from "../components/product/Pager";
import { trackPageView } from "../utils/tracker";

/**
 * 招聘列表页（PRD 6.10.1）
 * 实现说明：社会/校园双 Tab + 岗位卡片列表（点击进详情投递）；含投递查询入口。
 */
export default function Recruit() {
  const [list, setList] = useState<JobItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getJobs({ type: type || undefined, page, page_size: 9 })
      .then((res) => { setList(res.list); setTotal(res.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
    trackPageView("/recruit");
  }, [type, page]);

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <p className="text-xs tracking-[6px] text-gold-soft mb-3">JOIN US</p>
        <h1 className="font-serif-title text-[clamp(28px,3.4vw,42px)] font-bold tracking-[4px] text-cream">加入我们</h1>
        <p className="text-sm text-cream-3 mt-4">与 TP 全屋家居一起，把自然美学带给千家万户</p>
      </div>

      {/* Tab：全部/社会/校园 + 投递查询入口 */}
      <div className="flex justify-center items-center gap-2 mb-10 flex-wrap">
        {[["", "全部"], ["社会", "社会招聘"], ["校园", "校园招聘"]].map(([v, label]) => (
          <button key={v} onClick={() => { setType(v); setPage(1); }}
            className={[
              "px-6 py-2.5 rounded-full text-sm transition-all",
              type === v ? "bg-gradient-to-br from-[#E8CE8A] to-[#A8862A] text-[#1B2A20] font-semibold" : "border border-line-gold text-cream-2 hover:border-gold hover:text-gold-soft",
            ].join(" ")}>
            {label}
          </button>
        ))}
        <Link to="/recruit/query" className="ml-4 text-xs text-gold-soft border border-gold rounded-full px-4 py-2 hover:bg-gold/15 transition-all">
          投递进度查询
        </Link>
      </div>

      {/* 岗位卡片 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 bg-forest-2/60 animate-pulse rounded-[20px]" />)}
        </div>
      ) : list.length === 0 ? (
        <p className="text-sm text-cream-3 text-center py-16">暂无在招岗位，敬请期待</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {list.map((j) => (
              <Link key={j.id} to={`/recruit/${j.id}`} className="group rounded-[20px] bg-glass backdrop-blur border border-line-gold p-6 hover:-translate-y-1 hover:border-gold transition-all">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-serif-title text-lg text-cream group-hover:text-gold-soft transition-colors">{j.title}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-gold/15 border border-gold text-gold-soft text-[10px] flex-none">{j.type}</span>
                </div>
                <p className="text-xs text-cream-3 mb-3">{j.department} · {j.location}</p>
                <div className="flex items-center justify-between">
                  <span className="text-gold-gradient font-serif-title text-sm">{j.salary || "薪资面议"}</span>
                  <span className="text-xs text-gold-soft">查看详情 →</span>
                </div>
              </Link>
            ))}
          </div>
          <Pager page={page} total={total} pageSize={9} onChange={setPage} />
        </>
      )}
    </div>
  );
}
