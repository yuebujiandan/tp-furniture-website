import { useState } from "react";
import { submitFranchise } from "../api/biz";
import { useUiStore } from "../stores/ui";
import { trackPageView } from "../utils/tracker";
import { useEffect } from "react";

/**
 * 加盟合作页（PRD 6.9.3 / 技术文档 §7.4）
 * 实现说明：加盟优势 4 卡 + 加盟流程 4 步 + 申请表单（POST /franchise-applications）；
 * 提交成功提示并清空表单；进入页面上报埋点。
 */
export default function Franchise() {
  const showToast = useUiStore((s) => s.showToast);
  const [form, setForm] = useState({ name: "", phone: "", city: "", invest_amount: "", area: "", remark: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { trackPageView("/franchise"); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitFranchise(form);
      showToast("加盟申请提交成功，招商顾问将尽快与您联系");
      setForm({ name: "", phone: "", city: "", invest_amount: "", area: "", remark: "" });
    } catch { /* 拦截器已提示 */ } finally { setSubmitting(false); }
  }

  const ADVANTAGES = [
    { title: "品牌背书", desc: "10 年全屋定制品牌，深林金韵 IP 强势赋能" },
    { title: "产品体系", desc: "3 大系列 × 7 空间，全屋定制产品矩阵" },
    { title: "工厂直供", desc: "10 万㎡ 智能制造工厂，品质与交付双保障" },
    { title: "运营支持", desc: "选址/装修/培训/营销一站式开业扶持" },
  ];
  const STEPS = ["提交申请", "资质审核", "门店评估", "签约开业"];

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-12">
      <div className="text-center mb-14">
        <p className="text-xs tracking-[6px] text-gold-soft mb-3">JOIN TP</p>
        <h1 className="font-serif-title text-[clamp(28px,3.4vw,42px)] font-bold tracking-[4px] text-cream">加盟合作</h1>
      </div>

      {/* 加盟优势 4 卡 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-16">
        {ADVANTAGES.map((a, i) => (
          <div key={i} className="p-6 rounded-[20px] bg-glass backdrop-blur border border-line-gold text-center">
            <span className="mx-auto mb-4 block w-10 h-10 rounded-full bg-gradient-to-br from-[#E8CE8A] to-[#A8862A] text-[#1B2A20] font-serif-title flex items-center justify-center text-sm">{i + 1}</span>
            <h3 className="font-serif-title text-base text-cream mb-2">{a.title}</h3>
            <p className="text-xs text-cream-3 leading-relaxed">{a.desc}</p>
          </div>
        ))}
      </div>

      {/* 加盟流程 4 步 */}
      <div className="flex items-center justify-center gap-2 md:gap-6 mb-16 overflow-x-auto">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 md:gap-6">
            <div className="text-center">
              <span className="mx-auto mb-2 block w-9 h-9 rounded-full border border-gold text-gold-soft flex items-center justify-center text-sm">{i + 1}</span>
              <p className="text-xs text-cream-2 whitespace-nowrap">{s}</p>
            </div>
            {i < STEPS.length - 1 && <span className="text-gold-soft">→</span>}
          </div>
        ))}
      </div>

      {/* 申请表单 */}
      <div className="max-w-[640px] mx-auto rounded-[20px] bg-glass backdrop-blur border border-line-gold p-8">
        <h2 className="font-serif-title text-xl tracking-[2px] text-cream text-center mb-8">加盟申请</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="您的姓名" maxLength={50}
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
            <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="手机号" pattern="1[3-9]\d{9}"
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="意向城市" maxLength={50}
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
            <input value={form.invest_amount} onChange={(e) => setForm({ ...form, invest_amount: e.target.value })} placeholder="投资额度（如 50万）"
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
          </div>
          <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="计划门店面积（如 200㎡）"
            className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
          <textarea value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} placeholder="补充说明" rows={3}
            className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none resize-none" />
          <button type="submit" disabled={submitting}
            className="w-full py-3.5 rounded-full bg-gradient-to-br from-[#E8CE8A] via-[#C9A227] to-[#A8862A] text-[#1B2A20] font-semibold shadow-gold disabled:opacity-50 hover:-translate-y-0.5 transition-all">
            {submitting ? "提交中..." : "提交加盟申请"}
          </button>
        </form>
      </div>
    </div>
  );
}
