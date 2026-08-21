import { useAuthStore } from "../stores/auth";

/**
 * 前端埋点工具（技术文档 §7.6 / ADR-005）
 * 实现说明：
 * - device_id：localStorage 首访生成 UUID、长期保留（UV 去重口径，PRD 7.6.2）；
 * - trackPageView：路由切换上报；trackProductView：详情页挂载上报；
 * - sendBeacon + 失败静默（不影响业务请求）。
 */

const DEVICE_KEY = "tp_device_id";

/** 生成 UUID（无第三方依赖） */
function genUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** 获取（或首次生成）设备 ID */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = genUuid();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

/** 通用埋点上报：sendBeacon 优先，失败静默降级 fetch */
function report(path: string, payload: object) {
  const url = `/api/v1${path}`;
  const body = JSON.stringify({ device_id: getDeviceId(), ...payload });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {
    /* 忽略 */
  }
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
}

/** 页面浏览埋点（路由切换时调用） */
export function trackPageView(target: string) {
  report("/track/page-view", { target });
}

/** 产品浏览埋点（详情页挂载时调用） */
export function trackProductView(productId: number) {
  report("/track/product-view", { target: String(productId) });
}

/** 自定义事件埋点（收藏/表单提交等） */
export function trackEvent(target: string) {
  report("/track/event", { target });
}

/** 登录后可用：从 auth store 读取用户（预留） */
export function getCurrentUser() {
  return useAuthStore.getState().user;
}
