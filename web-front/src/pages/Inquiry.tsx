import { useEffect, useState } from "react";
import { submitInquiry } from "../api/biz";
import { useUiStore } from "../stores/ui";
import { trackPageView } from "../utils/tracker";

/**
 * 批量询价页（PRD 6.9.2 / 技术文档 §7.4）
 * 实现说明：询价清单行（名称/数量/备注）+ 公司信息 + 用途（自用/工程项目/批发）；
 * 提交 POST /inquiries（items 为清单 JSON 快照，后台报价）。
 */
interface Row { name: string; qty: number; note: string; }

export default function Inquiry() {
  const showToast = useUiStore((s) => s.showToast);
  const [rows, setRows] = useState<Row[]>([{ name: "", qty: 1, note: "" }]);
  const [form, setForm] = useState({ company: "", contact: "", phone: "", email: "", purpose: "self_use", expect_time: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { trackPageView("/inquiry"); }, []);

  /** 更新某行清单 */
  function setRow(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const items = rows.filter((r) => r.name.trim()).map((r) => ({ name: r.name.trim(), qty: r.qty, note: r.note || undefined }));
    if (items.length === 0) { showToast("请至少填写一行产品清单"); return; }
    setSubmitting(true);
    try {
      await submitInquiry({ ...form, items });
      showToast("询价提交成功，我们将在 1-2 个工作日内报价");
      setRows([{ name: "", qty: 1, note: "" }]);
      setForm({ company: "", contact: "", phone: "", email: "", purpose: "self_use", expect_time: "" });
    } catch { /* 拦截器已提示 */ } finally { setSubmitting(false); }
  }

  return (
    <div className="max-w-[720px] mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <p className="text-xs tracking-[6px] text-gold-soft mb-3">BULK INQUIRY</p>
        <h1 className="font-serif-title text-[clamp(28px,3.4vw,42px)] font-bold tracking-[4px] text-cream">批量询价</h1>
        <p className="text-sm text-cream-3 mt-4">填写您需要的产品清单，我们提供专属批量报价</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-[20px] bg-glass backdrop-blur border border-line-gold p-8 space-y-5">
        {/* 公司信息 */}
        <div className="grid grid-cols-2 gap-4">
          <input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="公司名称" maxLength={100}
            className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
          <input required value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="联系人" maxLength={50}
            className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="联系电话" pattern="1[3-9]\d{9}"
            className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="邮箱（接收报价单）"
            className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <select value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm focus:border-gold outline-none">
            <option value="self_use">自用装修</option>
            <option value="project">工程项目</option>
            <option value="wholesale">批发采购</option>
          </select>
          <input value={form.expect_time} onChange={(e) => setForm({ ...form, expect_time: e.target.value })} placeholder="期望报价时间"
            className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
        </div>

        {/* 产品清单（动态行） */}
        <div>
          <p className="text-xs text-cream-3 mb-2">产品清单（名称 / 数量 / 备注）</p>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_1fr_36px] gap-2">
                <input value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} placeholder="产品名称"
                  className="px-3 py-2.5 rounded-[12px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
                <input type="number" min={1} value={r.qty} onChange={(e) => setRow(i, { qty: Number(e.target.value) || 1 })}
                  className="px-3 py-2.5 rounded-[12px] bg-forest-1/80 border border-line-gold text-cream text-sm text-center focus:border-gold outline-none" />
                <input value={r.note} onChange={(e) => setRow(i, { note: e.target.value })} placeholder="备注（规格等）"
                  className="px-3 py-2.5 rounded-[12px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
                {rows.length > 1 && (
                  <button type="button" onClick={() => setRows(rows.filter((_, idx) => idx !== i))} className="text-coral text-sm" aria-label="删除行">✕</button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setRows([...rows, { name: "", qty: 1, note: "" }])}
            className="mt-3 text-xs text-gold-soft border border-gold rounded-full px-4 py-1.5 hover:bg-gold/15 transition-all">
            ＋ 添加一行
          </button>
        </div>

        <button type="submit" disabled={submitting}
          className="w-full py-3.5 rounded-full bg-gradient-to-br from-[#E8CE8A] via-[#C9A227] to-[#A8862A] text-[#1B2A20] font-semibold shadow-gold disabled:opacity-50 hover:-translate-y-0.5 transition-all">
          {submitting ? "提交中..." : "提交询价"}
        </button>
      </form>
    </div>
  );
}
