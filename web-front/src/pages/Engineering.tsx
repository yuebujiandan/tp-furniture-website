import { useEffect, useState } from "react";
import { submitEngineering } from "../api/biz";
import { useUiStore } from "../stores/ui";
import { trackPageView } from "../utils/tracker";

/**
 * 工程定制页（PRD 6.9.4 / 技术文档 §7.4）
 * 实现说明：工程服务能力 4 卡 + 服务流程 + 需求表单（POST /engineering-requests，项目类型 5 类）。
 */
const PROJECT_TYPES = [
  { value: "hotel", label: "酒店/民宿" },
  { value: "office", label: "办公空间" },
  { value: "commercial", label: "商业门店" },
  { value: "school", label: "学校/教育" },
  { value: "other", label: "其他" },
];
const CAPABILITIES = [
  { title: "批量交付", desc: "标准化工艺 + 品控体系，批量交付品质稳定" },
  { title: "定制设计", desc: "专业工程设计师团队，满足非标需求" },
  { title: "项目管理", desc: "全流程项目经理负责制，进度可控" },
  { title: "售后保障", desc: "工程级质保承诺，专属售后通道" },
];

export default function Engineering() {
  const showToast = useUiStore((s) => s.showToast);
  const [form, setForm] = useState({ company: "", contact: "", phone: "", project_type: "hotel", location: "", scale: "", deadline: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { trackPageView("/engineering"); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitEngineering(form);
      showToast("需求提交成功，工程顾问将尽快与您联系");
      setForm({ company: "", contact: "", phone: "", project_type: "hotel", location: "", scale: "", deadline: "", description: "" });
    } catch { /* 拦截器已提示 */ } finally { setSubmitting(false); }
  }

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-12">
      <div className="text-center mb-14">
        <p className="text-xs tracking-[6px] text-gold-soft mb-3">ENGINEERING</p>
        <h1 className="font-serif-title text-[clamp(28px,3.4vw,42px)] font-bold tracking-[4px] text-cream">工程定制</h1>
        <p className="text-sm text-cream-3 mt-4">酒店 · 办公 · 商业 · 学校 —— 全屋定制工程解决方案</p>
      </div>

      {/* 服务能力 4 卡 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-16">
        {CAPABILITIES.map((c, i) => (
          <div key={i} className="p-6 rounded-[20px] bg-glass backdrop-blur border border-line-gold text-center">
            <h3 className="font-serif-title text-base text-cream mb-2">{c.title}</h3>
            <p className="text-xs text-cream-3 leading-relaxed">{c.desc}</p>
          </div>
        ))}
      </div>

      {/* 需求表单 */}
      <div className="max-w-[640px] mx-auto rounded-[20px] bg-glass backdrop-blur border border-line-gold p-8">
        <h2 className="font-serif-title text-xl tracking-[2px] text-cream text-center mb-8">提交工程需求</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="公司/单位名称" maxLength={100}
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
            <input required value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="联系人" maxLength={50}
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="联系电话" pattern="1[3-9]\d{9}"
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
            <select value={form.project_type} onChange={(e) => setForm({ ...form, project_type: e.target.value })}
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm focus:border-gold outline-none">
              {PROJECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="项目地点"
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
            <input value={form.scale} onChange={(e) => setForm({ ...form, scale: e.target.value })} placeholder="项目规模"
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
            <input value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} placeholder="期望工期"
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
          </div>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="项目描述（预算、定制范围等）" rows={4}
            className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none resize-none" />
          <button type="submit" disabled={submitting}
            className="w-full py-3.5 rounded-full bg-gradient-to-br from-[#E8CE8A] via-[#C9A227] to-[#A8862A] text-[#1B2A20] font-semibold shadow-gold disabled:opacity-50 hover:-translate-y-0.5 transition-all">
            {submitting ? "提交中..." : "提交工程需求"}
          </button>
        </form>
      </div>
    </div>
  );
}
