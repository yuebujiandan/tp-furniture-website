import { useEffect, useState } from "react";

/**
 * 产品图集 + Lightbox（UIUX §5.6 详情页组件，PRD 6.2.2 V1.8）
 * 实现说明：
 * - 主图 + 5 张缩略图切换；主图点击打开 Lightbox；
 * - Lightbox：ESC / 遮罩关闭，z-index 400（UIUX §4.1）。
 */
export default function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  // Lightbox 打开时监听 ESC 关闭
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && setLightbox(false);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox]);

  // 图片为空时显示占位
  const list = images.length > 0 ? images : [""];

  return (
    <div>
      {/* 主图（点击打开 Lightbox） */}
      <div
        className="relative aspect-[4/3] rounded-[20px] overflow-hidden border border-line-gold bg-forest-3 cursor-zoom-in"
        onClick={() => setLightbox(true)}
        role="button"
        aria-label="查看大图"
      >
        {list[active] ? (
          <img src={list[active]} alt={alt} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-cream-3 text-sm">暂无图片</div>
        )}
        <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-black/50 text-cream-3 text-[10px]">
          {active + 1} / {list.length}
        </span>
      </div>

      {/* 缩略图：最多 5 张（UIUX §13.2 图集 ≥5 张最佳） */}
      {list.length > 1 && (
        <div className="flex gap-3 mt-4">
          {list.slice(0, 5).map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={[
                "w-20 h-16 rounded-[12px] overflow-hidden border-2 transition-all",
                active === i ? "border-gold shadow-gold" : "border-line-gold opacity-60 hover:opacity-100",
              ].join(" ")}
            >
              <img src={img} alt={`${alt}-${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox 大图（z-400，遮罩/ESC 关闭） */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[400] bg-black/90 flex items-center justify-center p-6"
          onClick={() => setLightbox(false)}
          role="dialog"
          aria-modal="true"
        >
          <button className="absolute top-5 right-5 w-10 h-10 rounded-full border border-line-gold text-cream text-lg" aria-label="关闭">
            ✕
          </button>
          {list[active] && (
            <img
              src={list[active]}
              alt={alt}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  );
}
