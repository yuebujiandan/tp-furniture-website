import { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

/**
 * 表单字段组件（UIUX §5.4 表单规格）
 * 功能说明：统一输入框/文本域样式（金边描边、深色底、focus 金边发光），
 * 供预约/留言/登录等表单复用（P2 起批量使用）。
 */

interface FieldBase {
  label: string;                 // 字段标签
  required?: boolean;            // 是否必填（PRD 9.4 可用性：必填标识）
  error?: string;                // 校验错误提示
  hint?: string;                 // 辅助说明
}

type InputProps = FieldBase & InputHTMLAttributes<HTMLInputElement>;
type TextareaProps = FieldBase & TextareaHTMLAttributes<HTMLTextAreaElement>;

/** 输入框共享样式（深色底 + 金边 + focus 金色发光） */
const fieldClass =
  "w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm " +
  "placeholder:text-cream-3 focus:border-gold focus:shadow-[0_0_0_3px_rgba(212,175,55,.15)] outline-none transition-all";

export function FormField({ label, required, error, hint, ...rest }: InputProps) {
  return (
    <label className="block mb-4">
      {/* 标签行：必填红点/星号标识 */}
      <span className="block text-sm text-cream-2 mb-2">
        {label}
        {required && <span className="text-coral ml-1">*</span>}
      </span>
      <input className={fieldClass} required={required} {...rest} />
      {/* 错误 / 辅助说明（PRD 9.4：校验定位） */}
      {error ? <span className="block text-xs text-coral mt-1">{error}</span> : hint ? <span className="block text-xs text-cream-3 mt-1">{hint}</span> : null}
    </label>
  );
}

export function FormTextarea({ label, required, error, hint, ...rest }: TextareaProps) {
  return (
    <label className="block mb-4">
      <span className="block text-sm text-cream-2 mb-2">
        {label}
        {required && <span className="text-coral ml-1">*</span>}
      </span>
      <textarea className={`${fieldClass} resize-none`} required={required} {...rest} />
      {error ? <span className="block text-xs text-coral mt-1">{error}</span> : hint ? <span className="block text-xs text-cream-3 mt-1">{hint}</span> : null}
    </label>
  );
}

/** 表单容器：统一纵向布局 */
export function FormGroup({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}
