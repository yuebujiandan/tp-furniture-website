import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyFavorites, removeFavorite, MyFavorite } from "../../api/me";
import Pager from "../../components/product/Pager";
import { useUiStore } from "../../stores/ui";

/**
 * 我的收藏页（PRD 6.7.2）
 * 实现说明：收藏列表（卡片 + 取消收藏）；点击卡片跳产品详情。
 */
export default function MyFavorites() {
  const [list, setList] = useState<MyFavorite[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const showToast = useUiStore((s) => s.showToast);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyFavorites({ page, page_size: 12 });
      setList(res.list);
      setTotal(res.total);
    } catch { /* 拦截器已提示 */ } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  /** 取消收藏 */
  async function handleRemove(id: number) {
    try {
      await removeFavorite(id);
      showToast("已取消收藏");
      load();
    } catch { /* 拦截器已提示 */ }
  }

  return (
    <div>
      <h2 className="font-serif-title text-xl tracking-[2px] text-cream mb-6">我的收藏</h2>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 bg-forest-2/60 animate-pulse rounded-[16px]" />)}
        </div>
      ) : list.length === 0 ? (
        <p className="text-sm text-cream-3 py-16 text-center">
          暂无收藏，去 <Link to="/products" className="text-gold-soft">产品中心</Link> 逛逛吧
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {list.map((f) => (
              <div key={f.id} className="relative rounded-[16px] overflow-hidden border border-line-gold bg-glass backdrop-blur group">
                <Link to={`/products/${f.id}`} className="block">
                  <div className="aspect-square bg-forest-3">
                    {f.cover_image_url && <img src={f.cover_image_url} alt={f.name} loading="lazy" className="w-full h-full object-cover" />}
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-cream truncate">{f.name}</p>
                    <p className="text-gold-gradient font-serif-title text-sm mt-1">{f.retail_price !== null ? `¥${f.retail_price.toLocaleString("zh-CN")}` : "按方案报价"}</p>
                  </div>
                </Link>
                <button
                  onClick={() => handleRemove(f.id)}
                  className="absolute top-2 right-2 px-3 py-1 rounded-full bg-forest-2/90 border border-line-gold text-coral text-xs hover:border-coral transition-all"
                >
                  取消收藏
                </button>
              </div>
            ))}
          </div>
          <Pager page={page} total={total} pageSize={12} onChange={setPage} />
        </>
      )}
    </div>
  );
}
