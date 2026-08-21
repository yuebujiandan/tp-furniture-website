import { ReactNode, useEffect } from "react";

/**
 * 前台弹窗组件（UIUX §5.4：渐变底 + 金边 + 顶部金线，圆角 22px，最大宽 400px，z-index 300）
 * 功能说明：
 * - 点击遮罩关闭；ESC 键关闭；
 * - 用于预约/留言/询价/登录等表单弹窗（P2 起批量使用）。
 */

interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ open, title, onClose, children }: ModalProps) {
  // 监听 ESC 键关闭（UIUX：弹窗支持 ESC）
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    // 遮罩（rgba 黑 60%）+ 弹窗本体；z-index 300（UIUX §4.1）
    <div className="fixed inset-0 z-[300] flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className={[
          "relative w-[min(400px,92vw)] rounded-[22px] p-6",
          "bg-gradient-to-b from-forest-2 to-forest-1", // 渐变底
          "border border-line-gold shadow-lg",
        ].join(" ")}
      >
        {/* 顶部金色装饰线（UIUX 弹窗规格） */}
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
        {title && <h3 className="font-serif-title text-lg tracking-[2px] text-cream mb-4">{title}</h3>}
        <button
          aria-label="关闭"
          onClick={onClose}
          className="absolute top-3 right-4 w-8 h-8 rounded-full text-cream-3 hover:text-gold-soft transition-colors"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
