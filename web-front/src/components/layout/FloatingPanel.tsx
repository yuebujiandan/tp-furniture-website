import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * 右侧浮动咨询窗 + 返回顶部（UIUX §5 浮窗区 / PRD 6.6.4，P2 档基础版）
 * 实现说明：
 * - 右侧固定浮窗：在线咨询（跳联系页）/ 返回顶部（出现于滚动 400px 后）；
 * - 咨询入口跳转联系页（P3 起可在浮窗内直接发起咨询弹窗）。
 */
export default function FloatingPanel() {
  const [showTop, setShowTop] = useState(false);
  const navigate = useNavigate();

  // 滚动超过 400px 显示返回顶部按钮
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    // 固定右侧浮窗区，z-index 150（UIUX §4.1）
    <div className="fixed right-5 bottom-24 z-[150] flex flex-col gap-3">
      {/* 在线咨询：跳转联系页留言 */}
      <button
        onClick={() => navigate("/contact")}
        className="w-12 h-12 rounded-full bg-glass backdrop-blur border border-line-gold text-gold-soft flex flex-col items-center justify-center hover:border-gold transition-all shadow-md"
        aria-label="在线咨询"
        title="在线咨询"
      >
        <span className="text-base leading-none">✉</span>
        <span className="text-[9px] mt-0.5 tracking-wider">咨询</span>
      </button>
      {/* 返回顶部 */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="w-12 h-12 rounded-full bg-glass backdrop-blur border border-line-gold text-cream-2 hover:text-gold-soft hover:border-gold transition-all shadow-md"
          aria-label="返回顶部"
        >
          ↑
        </button>
      )}
    </div>
  );
}
