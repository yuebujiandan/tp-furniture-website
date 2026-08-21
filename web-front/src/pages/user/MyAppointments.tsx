import { useCallback, useEffect, useState } from "react";
import { cancelMyAppointment, getMyAppointments, MyAppointment } from "../../api/me";
import Pager from "../../components/product/Pager";
import { useUiStore } from "../../stores/ui";

/**
 * 我的预约页（PRD 6.8.4）
 * 实现说明：预约列表（状态标签 + 期望日期/类型/备注）+ 取消（仅 pending/confirmed）。
 */
const TYPE_MAP: Record<string, string> = { visit: "到店参观", designer: "设计师预约", measure: "上门测量", case_design: "案例同款设计" };
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: "待确认", cls: "text-amber border-amber/50" },
  confirmed: { label: "已确认", cls: "text-fern-soft border-fern-soft/50" },
  done: { label: "已完成", cls: "text-cream-3 border-line-gold" },
  cancelled: { label: "已取消", cls: "text-coral border-coral/50" },
};

export default function MyAppointments() {
  const [list, setList] = useState<MyAppointment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const showToast = useUiStore((s) => s.showToast);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyAppointments({ page, page_size: 10 });
      setList(res.list);
      setTotal(res.total);
    } catch { /* 拦截器已提示 */ } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  /** 取消预约 */
  async function handleCancel(id: number) {
    try {
      await cancelMyAppointment(id);
      showToast("预约已取消");
      load();
    } catch { /* 拦截器已提示 */ }
  }

  return (
    <div>
      <h2 className="font-serif-title text-xl tracking-[2px] text-cream mb-6">我的预约</h2>
      {loading ? <div className="h-40 bg-forest-2/60 animate-pulse rounded-[20px]" /> : list.length === 0 ? (
        <p className="text-sm text-cream-3 py-16 text-center">暂无预约记录</p>
      ) : (
        <div className="space-y-4">
          {list.map((a) => (
            <div key={a.id} className="rounded-[20px] bg-glass backdrop-blur border border-line-gold p-5">
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2.5 py-1 rounded-full border text-xs ${STATUS_MAP[a.status]?.cls ?? "text-cream-3 border-line-gold"}`}>
                  {STATUS_MAP[a.status]?.label ?? a.status}
                </span>
                <span className="text-[10px] text-cream-3">{new Date(a.created_at ?? "").toLocaleString("zh-CN", { hour12: false })}</span>
              </div>
              <div className="text-sm text-cream-2 space-y-1">
                <p>{TYPE_MAP[a.type] ?? a.type} · {a.expect_date}{a.expect_time ? ` ${a.expect_time}` : ""}</p>
                {a.remark && <p className="text-xs text-cream-3">备注：{a.remark}</p>}
                {a.admin_note && <p className="text-xs text-amber">门店备注：{a.admin_note}</p>}
              </div>
              {/* 取消按钮（仅待确认/已确认可取消，PRD 6.8.4） */}
              {(a.status === "pending" || a.status === "confirmed") && (
                <button onClick={() => handleCancel(a.id)} className="mt-4 px-5 py-2 rounded-full border border-line-gold text-coral text-xs hover:border-coral transition-all">
                  取消预约
                </button>
              )}
            </div>
          ))}
          <Pager page={page} total={total} pageSize={10} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
