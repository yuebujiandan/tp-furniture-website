import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getStores, getFaqs, submitMessage, submitAppointment, StoreItem } from "../api/content";
import Modal from "../components/Modal";
import { useUiStore } from "../stores/ui";
import { trackEvent, trackPageView } from "../utils/tracker";
import { request } from "../api/client";
import { sendSmsCode } from "../api/auth";

/**
 * 联系我们页（PRD 6.6.4 / 技术文档 §7.4）
 * 实现说明：
 * - 4 个独立区块：体验门店（2×2 网格）→ 在线留言/预约到店（双栏并排）→ 常见问题（居中）→ 留言查询入口（按钮）；
 * - 留言表单（POST /messages，type=message + source=contact_page）；
 * - 预约到店表单（POST /appointments，type=visit，导航栏「预约到店」入口带 #booking hash 滚动定位）；
 * - 留言查询（游客：手机号 + 短信验证码，PRD 6.6.4）；
 * - FAQ 折叠；进入页面上报埋点。
 */

/** 游客留言查询结果项 */
interface QueryResultItem {
  id: number; type: string; source: string; content: string; status: string; reply: string | null; created_at: string | null;
}

export default function Contact() {
  const location = useLocation();
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [faqs, setFaqs] = useState<{ id: number; question: string; answer: string }[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  /* ---- 留言表单状态 ---- */
  const [form, setForm] = useState({ name: "", phone: "", content: "" });
  const [submitting, setSubmitting] = useState(false);

  /* ---- 预约到店表单状态（P6 补齐：导航栏「预约到店」入口） ---- */
  const [appt, setAppt] = useState({
    name: "", phone: "", expect_date: "", expect_time: "",
    store_id: undefined as number | undefined, remark: "",
  });
  const [apptSubmitting, setApptSubmitting] = useState(false);

  /* ---- 游客留言查询状态 ---- */
  const [queryOpen, setQueryOpen] = useState(false);
  const [qPhone, setQPhone] = useState("");
  const [qCode, setQCode] = useState("");
  const [mockCode, setMockCode] = useState<string | null>(null);
  const [qCountdown, setQCountdown] = useState(0);
  const [queryResults, setQueryResults] = useState<QueryResultItem[] | null>(null);
  const showToast = useUiStore((s) => s.showToast);

  /* 页面加载 + hash 自动滚动到预约区域（导航栏「预约到店」按钮带 #booking） */
  useEffect(() => {
    getStores().then(setStores).catch(() => {});
    getFaqs().then(setFaqs).catch(() => {});
    trackPageView("/contact");
    // 带 #booking hash 时平滑滚动到预约到店区块
    if (location.hash === "#booking") {
      setTimeout(() => {
        const el = document.getElementById("booking-section");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [location.hash]);

  /** 发送留言查询验证码 */
  async function handleSendQueryCode() {
    if (!/^1[3-9]\d{9}$/.test(qPhone)) { showToast("请输入正确的手机号"); return; }
    try {
      const res = await sendSmsCode(qPhone);
      setMockCode(res.mock_code);
      setQCountdown(60);
      const t = setInterval(() => setQCountdown((c) => (c <= 1 ? (clearInterval(t), 0) : c - 1)), 1000);
    } catch { /* 拦截器已提示 */ }
  }

  /** 游客留言查询（手机号+验证码，PRD 6.6.4） */
  async function handleQuery() {
    try {
      const res = await request<QueryResultItem[]>({ url: "/messages/query", method: "POST", data: { phone: qPhone, code: qCode } });
      setQueryResults(res);
      if (res.length === 0) showToast("未查询到留言记录");
    } catch { /* 拦截器已提示（40002 验证码错误） */ }
  }

  /** 提交留言 */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitMessage({ name: form.name, phone: form.phone, content: form.content, source: "contact_page" });
      showToast("留言提交成功，我们将尽快回复您");
      trackEvent("message_submit");
      setForm({ name: "", phone: "", content: "" });
    } catch {
      /* 拦截器已提示 */
    } finally {
      setSubmitting(false);
    }
  }

  /** 提交预约到店（POST /appointments，type=visit，P6 补齐导航入口） */
  async function handleApptSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApptSubmitting(true);
    try {
      await submitAppointment({
        type: "visit",
        name: appt.name,
        phone: appt.phone,
        expect_date: appt.expect_date,
        expect_time: appt.expect_time || undefined,
        store_id: appt.store_id,
        remark: appt.remark || undefined,
      });
      showToast("预约成功！我们将尽快与您确认到店时间");
      trackEvent("appointment_submit");
      setAppt({ name: "", phone: "", expect_date: "", expect_time: "", store_id: undefined, remark: "" });
    } catch {
      /* 拦截器已提示 */
    } finally {
      setApptSubmitting(false);
    }
  }

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-12">
      {/* ===== 页面标题 ===== */}
      <div className="text-center mb-14">
        <p className="text-xs tracking-[6px] text-gold-soft mb-3">CONTACT US</p>
        <h1 className="font-serif-title text-[clamp(28px,3.4vw,42px)] font-bold tracking-[4px] text-cream">联系我们</h1>
      </div>

      {/* ===== 区块 1：体验门店（整行 2×2 网格） ===== */}
      <section className="mb-16">
        <h2 className="font-serif-title text-xl tracking-[2px] text-cream mb-6 text-center">体验门店</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {stores.map((s) => (
            <div key={s.id} className="p-5 rounded-[20px] bg-glass backdrop-blur border border-line-gold flex items-start gap-4">
              <span className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E8CE8A] to-[#A8862A] text-[#1B2A20] flex items-center justify-center flex-none">店</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-serif-title text-base text-cream">{s.name}</h3>
                <p className="text-xs text-cream-3 mt-1">{s.address}</p>
                <p className="text-xs text-cream-3 mt-0.5">{s.phone} · {s.business_hours}</p>
                {/* 地图降级：跳转高德导航（R5：无 Key 时静态图+导航链接，技术文档 §6.5.5） */}
                {s.lat && s.lng && (
                  <a
                    href={`https://uri.amap.com/marker?position=${s.lng},${s.lat}&name=${encodeURIComponent(s.name)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-2 text-xs text-gold-soft border border-gold rounded-full px-4 py-1 hover:bg-gold/15 transition-all"
                  >
                    查看地图
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 区块 2：在线留言 + 预约到店（双栏并排） ===== */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        {/* ---- 在线留言（描述框加高，使提交按钮与右侧「确认预约」按钮底对齐） ---- */}
        <div className="rounded-[20px] bg-glass backdrop-blur border border-line-gold p-6 flex flex-col">
          <h2 className="font-serif-title text-xl tracking-[2px] text-cream mb-5">在线留言</h2>
          <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
            <div className="grid grid-cols-2 gap-4">
              <input
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                required placeholder="您的称呼" maxLength={50}
                className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none"
              />
              <input
                value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required placeholder="手机号" pattern="1[3-9]\d{9}"
                className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none"
              />
            </div>
            <textarea
              value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
              required placeholder="请描述您的需求（定制/预约/合作等）" rows={10} maxLength={2000}
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none resize-none min-h-[260px] flex-1"
            />
            <button
              type="submit" disabled={submitting}
              className="w-full py-3.5 rounded-full bg-gradient-to-br from-[#E8CE8A] via-[#C9A227] to-[#A8862A] text-[#1B2A20] font-semibold shadow-gold disabled:opacity-50 hover:-translate-y-0.5 transition-all mt-auto"
            >
              {submitting ? "提交中..." : "提交留言"}
            </button>
          </form>
        </div>

        {/* ---- 预约到店（P6 补齐导航入口，id 供 hash 定位） ---- */}
        <div id="booking-section" className="rounded-[20px] bg-glass backdrop-blur border border-line-gold p-6 flex flex-col">
          <h2 className="font-serif-title text-xl tracking-[2px] text-cream mb-5">预约到店</h2>
          <form onSubmit={handleApptSubmit} className="space-y-4 flex-1 flex flex-col">
            <div className="grid grid-cols-2 gap-4">
              <input
                value={appt.name} onChange={(e) => setAppt({ ...appt, name: e.target.value })}
                required placeholder="您的称呼" maxLength={50}
                className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none"
              />
              <input
                value={appt.phone} onChange={(e) => setAppt({ ...appt, phone: e.target.value })}
                required placeholder="手机号" pattern="1[3-9]\d{9}"
                className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="date"
                value={appt.expect_date}
                onChange={(e) => setAppt({ ...appt, expect_date: e.target.value })}
                required min={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm focus:border-gold outline-none [color-scheme:dark]"
              />
              <input
                type="time"
                value={appt.expect_time}
                onChange={(e) => setAppt({ ...appt, expect_time: e.target.value })}
                placeholder="期望时间"
                className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm focus:border-gold outline-none [color-scheme:dark]"
              />
            </div>
            {/* 选择门店（从已加载的门店列表中选择，可选） */}
            <select
              value={appt.store_id ?? ""}
              onChange={(e) => setAppt({ ...appt, store_id: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm focus:border-gold outline-none [color-scheme:dark]"
            >
              <option value="">选择体验门店（可选）</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <textarea
              value={appt.remark} onChange={(e) => setAppt({ ...appt, remark: e.target.value })}
              placeholder="备注说明（如感兴趣的产品风格、房间面积等）" rows={3} maxLength={500}
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none resize-none flex-1"
            />
            <button
              type="submit" disabled={apptSubmitting}
              className="w-full py-3.5 rounded-full bg-gradient-to-br from-[#E8CE8A] via-[#C9A227] to-[#A8862A] text-[#1B2A20] font-semibold shadow-gold disabled:opacity-50 hover:-translate-y-0.5 transition-all mt-auto"
            >
              {apptSubmitting ? "提交中..." : "确认预约"}
            </button>
          </form>
        </div>
      </section>

      {/* ===== 区块 3：常见问题（FAQ，与上方双栏同宽） ===== */}
      {faqs.length > 0 && (
        <section className="mb-16">
          <h2 className="font-serif-title text-xl tracking-[2px] text-cream text-center mb-8">常见问题</h2>
          <div className="space-y-3">
            {faqs.map((f) => (
              <div key={f.id} className="w-full rounded-[16px] bg-glass backdrop-blur border border-line-gold overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === f.id ? null : f.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="text-sm text-cream">{f.question}</span>
                  <span className={`text-gold-soft transition-transform ${openFaq === f.id ? "rotate-45" : ""}`}>＋</span>
                </button>
                {openFaq === f.id && (
                  <div className="px-5 pb-4">
                    <p className="text-xs text-cream-3 leading-relaxed">{f.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== 区块 4：留言查询入口（居中按钮） ===== */}
      <div className="text-center mb-8">
        <button
          onClick={() => setQueryOpen(true)}
          className="px-8 py-3 rounded-full border-[1.5px] border-gold text-gold-soft text-sm hover:bg-gold/15 transition-all"
        >
          查询我的留言
        </button>
      </div>

      {/* 留言查询弹窗（游客：手机号 + 验证码，PRD 6.6.4） */}
      <Modal open={queryOpen} title="查询我的留言" onClose={() => { setQueryOpen(false); setQueryResults(null); }}>
        <div className="space-y-4">
          {/* 手机号 + 验证码输入 */}
          <div className="flex gap-3">
            <input
              value={qPhone}
              onChange={(e) => setQPhone(e.target.value)}
              placeholder="手机号"
              className="flex-1 px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none"
            />
            <button
              onClick={handleSendQueryCode}
              disabled={qCountdown > 0}
              className="px-4 rounded-[14px] border border-gold text-gold-soft text-xs disabled:opacity-50 whitespace-nowrap"
            >
              {qCountdown > 0 ? `${qCountdown}s` : "获取验证码"}
            </button>
          </div>
          {mockCode && <p className="text-xs text-amber">开发环境验证码：{mockCode}</p>}
          <div className="flex gap-3">
            <input
              value={qCode}
              onChange={(e) => setQCode(e.target.value)}
              placeholder="验证码"
              className="flex-1 px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none"
            />
            <button onClick={handleQuery} className="px-6 py-3 rounded-[14px] bg-gradient-to-br from-[#E8CE8A] to-[#A8862A] text-[#1B2A20] font-semibold text-sm">
              查询
            </button>
          </div>

          {/* 查询结果（回复状态展示） */}
          {queryResults && (
            <div className="space-y-3 max-h-[320px] overflow-y-auto">
              {queryResults.length === 0 && <p className="text-xs text-cream-3 text-center py-6">未查询到留言记录</p>}
              {queryResults.map((m) => (
                <div key={m.id} className="rounded-[14px] bg-forest-1/80 border border-line-gold p-4">
                  <div className="flex justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-full border border-line-gold text-gold-soft text-[10px]">
                      {m.type === "consult" ? "在线咨询" : "留言"}
                    </span>
                    <span className={`text-xs ${m.status === "handled" ? "text-fern-soft" : "text-amber"}`}>
                      {m.status === "handled" ? "已回复" : "待回复"}
                    </span>
                  </div>
                  <p className="text-xs text-cream-2 mb-2">{m.content}</p>
                  {m.reply && <p className="text-xs text-cream-3 bg-forest-2/60 rounded-lg p-2">官方回复：{m.reply}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
