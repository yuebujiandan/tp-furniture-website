import { useCallback, useEffect, useState } from "react";
import { getMyContractDetail, getMyContracts, MyContract } from "../../api/me";
import Modal from "../../components/Modal";
import Pager from "../../components/product/Pager";

/**
 * 我的签单页（PRD 6.8.5）
 * 实现说明：签单列表（状态标签 + 金额）+ 详情弹窗（明细 + 状态流转日志）。
 */
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  signed: { label: "已签单", cls: "text-gold-soft border-gold/50" },
  producing: { label: "生产中", cls: "text-info border-info/50" },
  delivered: { label: "已交付", cls: "text-fern-soft border-fern-soft/50" },
  done: { label: "已完成", cls: "text-cream-3 border-line-gold" },
  cancelled: { label: "已取消", cls: "text-coral border-coral/50" },
};
const SOURCE_MAP: Record<string, string> = { offline: "线下签单", appointment: "预约转签单", dealer_intent: "经销商意向" };

export default function MyContracts() {
  const [list, setList] = useState<MyContract[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getMyContractDetail>> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyContracts({ page, page_size: 10 });
      setList(res.list);
      setTotal(res.total);
    } catch { /* 拦截器已提示 */ } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  /** 查看详情 */
  async function openDetail(id: number) {
    try { setDetail(await getMyContractDetail(id)); } catch { /* 拦截器已提示 */ }
  }

  return (
    <div>
      <h2 className="font-serif-title text-xl tracking-[2px] text-cream mb-6">我的签单</h2>
      {loading ? <div className="h-40 bg-forest-2/60 animate-pulse rounded-[20px]" /> : list.length === 0 ? (
        <p className="text-sm text-cream-3 py-16 text-center">暂无签单记录</p>
      ) : (
        <div className="space-y-4">
          {list.map((c) => (
            <button key={c.id} onClick={() => openDetail(c.id)} className="w-full text-left rounded-[20px] bg-glass backdrop-blur border border-line-gold p-5 hover:border-gold transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-cream text-sm font-serif-title">{c.contract_no}</span>
                <span className={`px-2.5 py-1 rounded-full border text-xs ${STATUS_MAP[c.status]?.cls ?? ""}`}>{STATUS_MAP[c.status]?.label ?? c.status}</span>
              </div>
              <p className="text-xs text-cream-3">
                {SOURCE_MAP[c.source] ?? c.source} · {new Date(c.created_at ?? "").toLocaleDateString("zh-CN")}
                {c.total_amount !== null && <span className="ml-3 text-gold-gradient font-serif-title">{`¥${c.total_amount.toLocaleString("zh-CN")}`}</span>}
              </p>
            </button>
          ))}
          <Pager page={page} total={total} pageSize={10} onChange={setPage} />
        </div>
      )}

      {/* 详情弹窗：明细 + 状态流转日志（PRD 6.8.5） */}
      <Modal open={!!detail} title={`签单详情 · ${detail?.contract_no ?? ""}`} onClose={() => setDetail(null)}>
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-cream-3">{SOURCE_MAP[detail.source] ?? detail.source}</span>
              <span className={`px-2.5 py-0.5 rounded-full border text-xs ${STATUS_MAP[detail.status]?.cls ?? ""}`}>{STATUS_MAP[detail.status]?.label ?? detail.status}</span>
            </div>
            {/* 明细清单（JSON 快照，ADR-003） */}
            <div className="rounded-[14px] bg-forest-1/80 border border-line-gold p-4">
              <p className="text-xs text-cream-3 mb-2">产品清单</p>
              {detail.items.map((it, i) => (
                <div key={i} className="flex justify-between py-1 text-cream-2">
                  <span>{it.name} × {it.qty}</span>
                  <span className="text-gold-soft">¥{(it.unit_price * it.qty).toLocaleString("zh-CN")}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 mt-2 border-t border-line-gold text-cream">
                <span>总金额</span>
                <span className="text-gold-gradient font-serif-title">¥{detail.total_amount?.toLocaleString("zh-CN") ?? "待定"}</span>
              </div>
            </div>
            {/* 状态流转日志 */}
            {detail.logs.length > 0 && (
              <div className="rounded-[14px] bg-forest-1/80 border border-line-gold p-4">
                <p className="text-xs text-cream-3 mb-2">进度记录</p>
                {detail.logs.map((l, i) => (
                  <p key={i} className="text-xs text-cream-3 py-0.5">
                    {new Date(l.created_at ?? "").toLocaleString("zh-CN", { hour12: false })} · {l.action.replace("status:", "状态 → ")}
                  </p>
                ))}
              </div>
            )}
            {detail.delivery_date && <p className="text-xs text-cream-3">预计交付：{detail.delivery_date}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
