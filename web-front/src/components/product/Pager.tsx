/**
 * 分页器（列表页通用，UIUX §5.5）
 * 实现说明：上一页/下一页 + 页码展示；点击回调切换页码。
 */
interface PagerProps {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export default function Pager({ page, total, pageSize, onChange }: PagerProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-10">
      {/* 上一页 */}
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="w-9 h-9 rounded-full border border-line-gold text-cream-2 text-sm disabled:opacity-40 hover:border-gold hover:text-gold-soft transition-colors"
      >
        ‹
      </button>
      {/* 页码：当前页高亮（金色胶囊） */}
      {Array.from({ length: pages }, (_, i) => i + 1)
        .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1)
        .reduce<(number | "...")[]>((acc, p) => {
          const last = acc[acc.length - 1];
          if (typeof last === "number" && p - last > 1) acc.push("...");
          acc.push(p);
          return acc;
        }, [])
        .map((p, idx) =>
          p === "..." ? (
            <span key={`e${idx}`} className="w-9 text-center text-cream-3 text-sm">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={[
                "w-9 h-9 rounded-full text-sm transition-colors",
                p === page
                  ? "bg-gradient-to-br from-[#E8CE8A] to-[#A8862A] text-[#1B2A20] font-semibold shadow-gold"
                  : "border border-line-gold text-cream-2 hover:border-gold hover:text-gold-soft",
              ].join(" ")}
            >
              {p}
            </button>
          )
        )}
      {/* 下一页 */}
      <button
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
        className="w-9 h-9 rounded-full border border-line-gold text-cream-2 text-sm disabled:opacity-40 hover:border-gold hover:text-gold-soft transition-colors"
      >
        ›
      </button>
    </div>
  );
}
