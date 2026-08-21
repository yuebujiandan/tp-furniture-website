import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import { getCase, submitAppointment, CaseDetail } from "../api/content";
import Modal from "../components/Modal";
import { useUiStore } from "../stores/ui";
import { trackPageView } from "../utils/tracker";

/**
 * 案例详情页（PRD 6.3.2）
 * 实现说明：
 * - 图文正文（DOMPurify 清洗）+ 户型信息 + 关联产品（可跳详情）+ 客户评价；
 * - "预约同款设计"弹窗带 case_id（PRD 6.3.2）；
 * - 进入页面上报埋点。
 */
export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const caseId = Number(id);
  const [data, setData] = useState<CaseDetail | null>(null);
  const [apptOpen, setApptOpen] = useState(false);
  const showToast = useUiStore((s) => s.showToast);

  useEffect(() => {
    if (!caseId) return;
    getCase(caseId).then(setData).catch(() => {});
    trackPageView(`/cases/${caseId}`);
  }, [caseId]);

  async function handleAppt(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await submitAppointment({
        type: "case_design",
        name: String(fd.get("name") || ""),
        phone: String(fd.get("phone") || ""),
        expect_date: String(fd.get("expect_date") || ""),
        case_id: caseId,
        remark: data ? `预约同款设计：${data.title}` : undefined,
      });
      showToast("预约提交成功，设计师将尽快与您联系");
      setApptOpen(false);
    } catch {
      /* 拦截器已提示 */
    }
  }

  if (!data) return <div className="min-h-[50vh]" />;

  return (
    <div className="max-w-[900px] mx-auto px-6 py-12">
      {/* 面包屑 */}
      <nav className="text-xs text-cream-3 mb-8">
        <Link to="/" className="hover:text-gold-soft">首页</Link>
        <span className="mx-2">/</span>
        <Link to="/cases" className="hover:text-gold-soft">实景案例</Link>
        <span className="mx-2">/</span>
        <span className="text-gold-soft">{data.title}</span>
      </nav>

      {/* 标题区 */}
      <h1 className="font-serif-title text-3xl tracking-[2px] text-cream mb-4">{data.title}</h1>
      <p className="text-xs text-cream-3 mb-8">
        {data.location_desc} · {data.area} · {data.house_type} · {data.style_tags}
        {data.is_engineering && <span className="ml-2 px-2 py-0.5 rounded-full bg-gold/15 border border-gold text-gold-soft">工程案例</span>}
      </p>

      {/* 封面 */}
      {data.cover && (
        <div className="rounded-[20px] overflow-hidden border border-line-gold mb-10">
          <img src={data.cover} alt={data.title} className="w-full aspect-[16/9] object-cover" />
        </div>
      )}

      {/* 图文正文（DOMPurify 清洗） */}
      {data.content_html && (
        <div className="prose-content text-cream-2 text-sm leading-loose space-y-4 mb-10" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.content_html) }} />
      )}

      {/* 关联产品（可跳转详情，PRD 6.3.2） */}
      {data.products.length > 0 && (
        <section className="mb-10">
          <h2 className="font-serif-title text-xl tracking-[2px] text-cream mb-6">案例同款产品</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.products.map((p) => (
              <Link key={p.id} to={`/products/${p.id}`} className="rounded-[16px] overflow-hidden border border-line-gold hover:-translate-y-1 transition-all">
                <div className="aspect-square bg-forest-3">
                  {p.cover_image_url && <img src={p.cover_image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover" />}
                </div>
                <div className="p-3 bg-glass backdrop-blur">
                  <p className="text-xs text-cream truncate">{p.name}</p>
                  <p className="text-gold-gradient font-serif-title text-sm mt-1">{p.retail_price !== null ? `¥${p.retail_price.toLocaleString("zh-CN")}` : "按方案报价"}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 客户评价 */}
      {data.customer_review && (
        <section className="rounded-[20px] bg-glass backdrop-blur border border-line-gold p-6 mb-10">
          <p className="text-xs tracking-[3px] text-gold-soft mb-3">客户评价</p>
          <p className="text-sm text-cream-2 leading-relaxed">“{data.customer_review}”</p>
        </section>
      )}

      {/* 预约同款设计（PRD 6.3.2） */}
      <div className="text-center">
        <button
          onClick={() => setApptOpen(true)}
          className="px-10 py-3.5 rounded-full bg-gradient-to-br from-[#E8CE8A] via-[#C9A227] to-[#A8862A] text-[#1B2A20] font-semibold shadow-gold hover:-translate-y-0.5 transition-all"
        >
          预约同款设计
        </button>
      </div>

      {/* 预约弹窗（type=case_design 带 case_id） */}
      <Modal open={apptOpen} title="预约同款设计" onClose={() => setApptOpen(false)}>
        <form onSubmit={handleAppt} className="space-y-4">
          <input name="name" required placeholder="您的称呼" className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
          <input name="phone" required placeholder="手机号" pattern="1[3-9]\d{9}" className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none" />
          <input name="expect_date" required type="date" className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm focus:border-gold outline-none" />
          <button type="submit" className="w-full py-3 rounded-full bg-gradient-to-br from-[#E8CE8A] via-[#C9A227] to-[#A8862A] text-[#1B2A20] font-semibold shadow-gold">提交预约</button>
        </form>
      </Modal>
    </div>
  );
}
