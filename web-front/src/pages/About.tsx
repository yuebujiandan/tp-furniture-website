import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { getAbout, getMilestones } from "../api/content";
import { trackPageView } from "../utils/tracker";

/**
 * 关于我们页（PRD 6.6）
 * 实现说明：关于 TP / 品牌介绍（富文本）+ 发展历程时间轴 + 荣誉墙；聚合接口渲染。
 */
export default function About() {
  const [about, setAbout] = useState<{ about_tp_html: string; brand_intro_html: string; honors: { title: string; year: string }[] } | null>(null);
  const [milestones, setMilestones] = useState<{ id: number; year: string; title: string; description: string | null }[]>([]);

  useEffect(() => {
    getAbout().then(setAbout).catch(() => {});
    getMilestones().then(setMilestones).catch(() => {});
    trackPageView("/about");
  }, []);

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-12">
      <div className="text-center mb-14">
        <p className="text-xs tracking-[6px] text-gold-soft mb-3">ABOUT TP</p>
        <h1 className="font-serif-title text-[clamp(28px,3.4vw,42px)] font-bold tracking-[4px] text-cream">关于我们</h1>
      </div>

      {/* 品牌介绍（富文本，DOMPurify 清洗） */}
      {about?.brand_intro_html && (
        <div className="text-center mb-14">
          <div className="prose-content text-cream-2 text-sm leading-loose max-w-[680px] mx-auto" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(about.brand_intro_html) }} />
        </div>
      )}
      {about?.about_tp_html && (
        <div className="rounded-[20px] bg-glass backdrop-blur border border-line-gold p-8 mb-14">
          <div className="prose-content text-cream-2 text-sm leading-loose space-y-4" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(about.about_tp_html) }} />
        </div>
      )}

      {/* 发展历程时间轴（PRD 6.6.3） */}
      {milestones.length > 0 && (
        <section className="mb-14">
          <h2 className="font-serif-title text-2xl tracking-[3px] text-cream text-center mb-12">发展历程</h2>
          <div className="relative pl-8 before:content-[''] before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-gold before:via-gold/40 before:to-transparent">
            {milestones.map((m) => (
              <div key={m.id} className="relative mb-8">
                {/* 时间轴节点（金色圆点） */}
                <span className="absolute -left-8 top-1.5 w-6 h-6 rounded-full border-2 border-gold bg-forest-1 shadow-[0_0_8px_rgba(212,175,55,.4)] flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-gold" />
                </span>
                <div className="rounded-[16px] bg-glass backdrop-blur border border-line-gold p-5 hover:border-gold transition-all">
                  <div className="flex items-baseline gap-3 mb-1">
                    <span className="font-serif-title text-gold-gradient text-xl tracking-wider">{m.year}</span>
                    <h3 className="font-serif-title text-base text-cream">{m.title}</h3>
                  </div>
                  {m.description && <p className="text-xs text-cream-3 mt-1 leading-relaxed">{m.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 荣誉墙 */}
      {about && about.honors.length > 0 && (
        <section>
          <h2 className="font-serif-title text-2xl tracking-[3px] text-cream text-center mb-12">品牌荣誉</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {about.honors.map((h, i) => (
              <div key={i} className="p-6 rounded-[20px] bg-glass backdrop-blur border border-line-gold text-center">
                <span className="mx-auto mb-3 block w-10 h-10 rounded-full bg-gradient-to-br from-[#E8CE8A] to-[#A8862A] text-[#1B2A20] font-serif-title flex items-center justify-center text-sm">★</span>
                <p className="text-sm text-cream leading-relaxed">{h.title}</p>
                <p className="text-[10px] text-cream-3 mt-2 tracking-widest">{h.year}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
