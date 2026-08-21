import { Link } from "react-router-dom";
import type { ProductItem } from "../../api/products";

/**
 * 产品卡片（UIUX §5.5 列表页组件）
 * 实现说明：
 * - 封面 + 名称 + 系列 + 价格（NULL 显示"按方案报价"，UIUX §5.5）+ 标签（新品/精选）；
 * - 封面/名称可点击跳详情（PRD 6.2.2 V1.8）；
 * - hover 上浮 8px + 金色描边（UIUX §2.2 克制留白）。
 */
export default function ProductCard({ product }: { product: ProductItem }) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="group block rounded-[20px] bg-glass backdrop-blur border border-line-gold overflow-hidden hover:-translate-y-2 hover:shadow-md transition-all duration-200 ease-ease"
    >
      {/* 封面图（懒加载 + 新品/精选标签） */}
      <div className="relative aspect-[4/3] overflow-hidden bg-forest-3">
        {product.cover_image_url ? (
          <img
            src={product.cover_image_url}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-cream-3 text-xs">暂无图片</div>
        )}
        {/* 标签区：新品/精选（金色胶囊） */}
        {(product.is_new || product.is_recommend) && (
          <div className="absolute top-3 left-3 flex gap-2">
            {product.is_new && <span className="px-2.5 py-0.5 rounded-full bg-gold text-[#1B2A20] text-[10px] font-bold">新品</span>}
            {product.is_recommend && <span className="px-2.5 py-0.5 rounded-full bg-forest-2/90 text-gold-soft text-[10px] border border-line-gold">精选</span>}
          </div>
        )}
      </div>

      {/* 信息区 */}
      <div className="p-4">
        <h3 className="font-serif-title text-base text-cream tracking-[1px] truncate">{product.name}</h3>
        <p className="text-xs text-cream-3 mt-1 truncate">{product.series_name}</p>
        {/* 价格：NULL 显示"按方案报价"（UIUX §5.5） */}
        <p className="mt-3">
          {product.retail_price !== null ? (
            <span className="text-gold-gradient font-serif-title text-lg">
              ¥{product.retail_price.toLocaleString("zh-CN", { maximumFractionDigits: 0 })}
            </span>
          ) : (
            <span className="text-cream-3 text-sm">按方案报价</span>
          )}
        </p>
      </div>
    </Link>
  );
}
