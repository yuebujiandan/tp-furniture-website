import { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * 前台按钮组件（UIUX §5.2 按钮体系，4 变体）
 * 功能说明：
 * - primary 金色主按钮（CTA：预约/提交，渐变 #E8CE8A→#C9A227→#A8862A + 深字 + 金色光晕）
 * - ghost 描边幽灵按钮（1.5px 金边 + 金字，hover 金底 14%）
 * - line 金线按钮（1px 弱化金边）
 * - 通用：胶囊圆角 999px、hover 上浮 2px + 光晕增强、220ms 过渡
 */

type Variant = "primary" | "ghost" | "line";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

/** 各变体样式映射（Tailwind 类；背景/边框按 UIUX §5.2 规格） */
const variantClass: Record<Variant, string> = {
  // 金色渐变主按钮：渐变底 + 深色文字 + 金色光晕
  primary:
    "bg-gradient-to-br from-[#E8CE8A] via-[#C9A227] to-[#A8862A] text-[#1B2A20] font-semibold shadow-gold hover:shadow-[0_10px_30px_rgba(212,175,55,.35)]",
  // 描边幽灵：透明底 + 1.5px 金边 + 金字
  ghost:
    "bg-transparent border-[1.5px] border-gold text-gold-soft hover:bg-gold/15",
  // 金线按钮：1px 弱化金边
  line: "bg-transparent border border-line-gold text-gold-soft hover:border-gold",
};

export default function Button({ variant = "primary", children, className = "", ...rest }: ButtonProps) {
  return (
    <button
      className={[
        // 基础胶囊样式 + 交互反馈（hover 上浮 2px，220ms 缓动，UIUX §5.2）
        "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm tracking-wider",
        "transition-all duration-200 ease-ease hover:-translate-y-0.5 active:translate-y-0",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
        variantClass[variant],
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
