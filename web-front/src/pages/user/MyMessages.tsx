import { useCallback, useEffect, useState } from "react";
import { getMyMessages, MyMessage } from "../../api/me";
import Pager from "../../components/product/Pager";

/**
 * 我的留言页（PRD 6.7.2 / V1.8 双字段口径）
 * 实现说明：登录用户提交的留言列表（状态 + 回复展示，type=message/consult 标签）。
 */
export default function MyMessages() {
  const [list, setList] = useState<MyMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyMessages({ page, page_size: 10 });
      setList(res.list);
      setTotal(res.total);
    } catch { /* 拦截器已提示 */ } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <h2 className="font-serif-title text-xl tracking-[2px] text-cream mb-6">我的留言</h2>
      {loading ? (
        <div className="h-40 bg-forest-2/60 animate-pulse rounded-[20px]" />
      ) : list.length === 0 ? (
        <p className="text-sm text-cream-3 py-16 text-center">暂无留言记录</p>
      ) : (
        <>
          <div className="space-y-4">
            {list.map((m) => (
              <div key={m.id} className="rounded-[20px] bg-glass backdrop-blur border border-line-gold p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-full border border-line-gold text-gold-soft text-[10px]">
                    {m.type === "consult" ? "在线咨询" : "留言"}
                  </span>
                  <span className={`text-xs ${m.status === "handled" ? "text-fern-soft" : "text-amber"}`}>
                    {m.status === "handled" ? "已回复" : "待回复"}
                  </span>
                </div>
                <p className="text-sm text-cream-2 mb-3">{m.content}</p>
                {m.reply && (
                  <div className="rounded-[14px] bg-forest-1/80 border border-line-gold p-3">
                    <p className="text-xs text-gold-soft mb-1">官方回复</p>
                    <p className="text-xs text-cream-3 leading-relaxed">{m.reply}</p>
                  </div>
                )}
                <p className="text-[10px] text-cream-3 mt-2">{new Date(m.created_at ?? "").toLocaleString("zh-CN", { hour12: false })}</p>
              </div>
            ))}
          </div>
          <Pager page={page} total={total} pageSize={10} onChange={setPage} />
        </>
      )}
    </div>
  );
}
