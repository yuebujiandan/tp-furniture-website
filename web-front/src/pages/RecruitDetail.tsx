import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getJob, submitResume, JobDetail } from "../api/biz";
import Modal from "../components/Modal";
import { useUiStore } from "../stores/ui";
import { trackEvent, trackPageView } from "../utils/tracker";

/**
 * 岗位详情页（PRD 6.10.2）
 * 实现说明：岗位信息（职责/要求）+ 投递表单（姓名/手机号/学历/学校/经历/介绍）；
 * 投递成功返回 apply_no 弹窗提示（游客凭 apply_no+手机尾号查询，PRD 6.10.3）。
 */
export default function RecruitDetail() {
  const { id } = useParams<{ id: string }>();
  const jobId = Number(id);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", education: "", school: "", work_years: "", intro: "" });
  const [submitting, setSubmitting] = useState(false);
  const [applyNo, setApplyNo] = useState<string | null>(null);
  const showToast = useUiStore((s) => s.showToast);

  useEffect(() => {
    if (!jobId) return;
    getJob(jobId).then(setJob).catch(() => {});
    trackPageView(`/recruit/${jobId}`);
  }, [jobId]);

  /** 提交投递 */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await submitResume({ job_id: jobId, ...form });
      setApplyNo(res.apply_no);
      showToast("投递成功");
      trackEvent("resume_submit");
    } catch { /* 拦截器已提示（40900 重复投递） */ } finally { setSubmitting(false); }
  }

  if (!job) return <div className="min-h-[50vh]" />;

  return (
    <div className="max-w-[820px] mx-auto px-6 py-12">
      <nav className="text-xs text-cream-3 mb-8">
        <Link to="/" className="hover:text-gold-soft">首页</Link>
        <span className="mx-2">/</span>
        <Link to="/recruit" className="hover:text-gold-soft">加入我们</Link>
        <span className="mx-2">/</span>
        <span className="text-gold-soft">{job.title}</span>
      </nav>

      {/* 岗位信息卡 */}
      <div className="rounded-[20px] bg-glass backdrop-blur border border-line-gold p-8 mb-10">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-serif-title text-2xl tracking-[2px] text-cream mb-2">{job.title}</h1>
            <p className="text-xs text-cream-3">{job.department} · {job.location} · {job.type}招聘</p>
          </div>
          <span className="text-gold-gradient font-serif-title text-xl">{job.salary || "薪资面议"}</span>
        </div>
        {job.tags && <p className="text-xs text-cream-3 mb-4">标签：{job.tags}</p>}
        <div className="space-y-4 text-sm">
          <div>
            <h2 className="font-serif-title text-base text-gold-soft mb-2">岗位职责</h2>
            <p className="text-cream-2 leading-relaxed whitespace-pre-line">{job.duty || "面议"}</p>
          </div>
          <div>
            <h2 className="font-serif-title text-base text-gold-soft mb-2">任职要求</h2>
            <p className="text-cream-2 leading-relaxed whitespace-pre-line">{job.requirement || "面议"}</p>
          </div>
        </div>
      </div>

      {/* 投递表单 */}
      <div className="rounded-[20px] bg-glass backdrop-blur border border-line-gold p-8">
        <h2 className="font-serif-title text-xl tracking-[2px] text-cream text-center mb-8">投递简历</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="姓名" maxLength={50}
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
            <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="手机号" pattern="1[3-9]\d{9}"
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="邮箱"
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
            <input value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} placeholder="学历（如：本科）"
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} placeholder="毕业院校"
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
            <input value={form.work_years} onChange={(e) => setForm({ ...form, work_years: e.target.value })} placeholder="工作年限"
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
          </div>
          <textarea value={form.intro} onChange={(e) => setForm({ ...form, intro: e.target.value })} placeholder="自我介绍 / 项目经历" rows={4}
            className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none resize-none" />
          <button type="submit" disabled={submitting}
            className="w-full py-3.5 rounded-full bg-gradient-to-br from-[#E8CE8A] via-[#C9A227] to-[#A8862A] text-[#1B2A20] font-semibold shadow-gold disabled:opacity-50 hover:-translate-y-0.5 transition-all">
            {submitting ? "提交中..." : "立即投递"}
          </button>
        </form>
      </div>

      {/* 投递成功弹窗：展示 apply_no（游客查询凭证，PRD 6.10.3） */}
      <Modal open={!!applyNo} title="投递成功" onClose={() => setApplyNo(null)}>
        <div className="text-center py-4">
          <p className="text-sm text-cream-2 mb-4">您的投递查询号（请妥善保存）：</p>
          <p className="font-serif-title text-2xl tracking-[4px] text-gold-gradient mb-6">{applyNo}</p>
          <p className="text-xs text-cream-3 mb-6">凭查询号 + 手机号后 4 位，可在"投递进度查询"中查看招聘进度</p>
          <Link to="/recruit/query" onClick={() => setApplyNo(null)}
            className="inline-block px-8 py-3 rounded-full border-[1.5px] border-gold text-gold-soft text-sm hover:bg-gold/15 transition-all">
            去查询进度
          </Link>
        </div>
      </Modal>
    </div>
  );
}
