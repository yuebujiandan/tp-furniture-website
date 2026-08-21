import { useUiStore } from "../stores/ui";

/**
 * 全局 Toast 渲染组件（UIUX §5：金色提示，3.2s 自动消失，z-99999）
 * 功能说明：订阅 ui store 中的 toasts 数组，渲染为右上角堆叠提示。
 */
export default function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);

  // 无提示时不渲染容器（避免空白占位）
  if (toasts.length === 0) return null;

  return (
    // 固定定位右上角，最高层级（UIUX §4.1 z-index 99999）
    <div className="fixed top-6 right-6 z-[99999] flex flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          // 金色描边 + 深色玻璃底 + 金色阴影（UIUX 组件规格）
          className="min-w-[200px] max-w-[360px] px-4 py-3 rounded-xl border border-line-gold bg-forest-2/95 text-cream text-sm shadow-gold backdrop-blur cursor-pointer transition-all"
          onClick={() => dismiss(t.id)}
          role="alert"
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold mr-2 shadow-[0_0_6px_#D4AF37]" />
          {t.message}
        </div>
      ))}
    </div>
  );
}
