import { useState } from "react";
import { queryResume } from "../api/biz";
import { trackPageView } from "../utils/tracker";
import { useEffect } from "react";

/**
 * 投递进度查询页（PRD 6.10.3 V1.3）
 * 实现说明：apply_no + 手机号后 4 位查询；展示岗位/状态/投递时间。
 */
export default function RecruitQuery() {
  const [form, setForm] = useState({ apply_no: "", phone_tail: "" });
  const [result, setResult] = useState<{ job_title: string; status_label: string; applied_at: string | null } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { trackPageView("/recruit/query"); }, []);

  async function handleQuery(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    try {
      setResult(await queryResume(form));
    } catch (err) {
      setError("未查询到投递记录，请核对查询号与手机尾号");
    }
  }

  return (
    <div className="max-w-[560px] mx-auto px-6 py-16">
      <div className="text-center mb-10">
        <p className="text-xs tracking-[6px] text-gold-soft mb-3">APPLY QUERY</p>
        <h1 className="font-serif-title text-[clamp(26px,3.4vw,36px)] font-bold tracking-[4px] text-cream">投递进度查询</h1>
      </div>

      <form onSubmit={handleQuery} className="rounded-[20px] bg-glass backdrop-blur border border-line-gold p-8 space-y-4">
        <div>
          <label className="block text-xs text-cream-3 mb-2">投递查询号</label>
          <input required value={form.apply_no} onChange={(e) => setForm({ ...form, apply_no: e.target.value })} placeholder="如：TPXW0J6H"
            className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
        </div>
        <div>
          <label className="block text-xs text-cream-3 mb-2">手机号后 4 位</label>
          <input required value={form.phone_tail} onChange={(e) => setForm({ ...form, phone_tail: e.target.value })} placeholder="如：3322" maxLength={4} pattern="\d{4}"
            className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
        </div>
        <button type="submit" className="w-full py-3.5 rounded-full bg-gradient-to-br from-[#E8CE8A] via-[#C9A227] to-[#A8862A] text-[#1B2A20] font-semibold shadow-gold hover:-translate-y-0.5 transition-all">
          查询进度
        </button>
      </form>

      {/* 查询结果 */}
      {result && (
        <div className="mt-6 rounded-[20px] bg-glass backdrop-blur border border-line-gold p-6 text-center">
          <p className="text-xs text-cream-3 mb-1">投递岗位</p>
          <p className="font-serif-title text-lg text-cream mb-4">{result.job_title}</p>
          <p className="text-xs text-cream-3 mb-1">当前进度</p>
          <p className="text-gold-gradient font-serif-title text-2xl mb-2">{result.status_label}</p>
          {result.applied_at && <p className="text-[10px] text-cream-3">投递时间：{new Date(result.applied_at).toLocaleString("zh-CN", { hour12: false })}</p>}
        </div>
      )}
      {error && <p className="mt-6 text-center text-sm text-coral">{error}</p>}
    </div>
  );
}
