import { Link } from "react-router-dom";

/**
 * 通用占位页（P1 骨架阶段：未实现页面统一展示）
 * 功能说明：后续里程碑（P2-P4）按页面要点逐个替换为真实页面（技术文档 §7.4）。
 */
export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-6">
      <p className="text-xs tracking-[6px] text-gold-soft mb-4">
        <span className="inline-block w-2 h-2 rounded-full bg-gold shadow-[0_0_8px_#D4AF37] mr-3 align-middle" />
        建设中
        <span className="inline-block w-2 h-2 rounded-full bg-gold shadow-[0_0_8px_#D4AF37] ml-3 align-middle" />
      </p>
      {/* 衬线标题 */}
      <h1 className="font-serif-title text-3xl tracking-[3px] text-cream mb-6">{title}</h1>
      <p className="text-sm text-cream-3 mb-8 max-w-[420px]">
        该页面将在后续里程碑交付（参见《TP全屋家居官网-项目开发实施方案.md》阶段计划）。
      </p>
      <Link
        to="/"
        className="px-8 py-3 rounded-full border-[1.5px] border-gold text-gold-soft hover:bg-gold/15 transition-all text-sm"
      >
        返回首页
      </Link>
    </div>
  );
}
