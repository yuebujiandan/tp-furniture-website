import { create } from "zustand";

/**
 * 前台 UI 状态（技术文档 §7.5.1）
 * 功能说明：Toast 全局提示（3.2s 自动消失，金色样式）、弹窗状态、预约/询价选择状态（P2 使用）。
 */

interface ToastItem {
  id: number;
  message: string;
}

interface UiState {
  toasts: ToastItem[];
  /** 显示全局 Toast（金色，UIUX §5 组件规格：3.2s） */
  showToast: (message: string) => void;
  dismissToast: (id: number) => void;
}

let toastSeq = 0;

export const useUiStore = create<UiState>((set) => ({
  toasts: [],

  showToast: (message) => {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts, { id, message }] }));
    // 3.2s 后自动移除（UIUX：Toast 3.2s 金色 z-99999）
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3200);
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
