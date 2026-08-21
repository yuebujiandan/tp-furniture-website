import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import { getNewsDetail, NewsDetail } from "../api/content";
import { trackPageView } from "../utils/tracker";

/**
 * 新闻详情页（PRD 6.4.2）
 * 实现说明：富文本正文（DOMPurify 清洗）+ 上一篇/下一篇导航（后端返回相邻记录）。
 */
export default function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const newsId = Number(id);
  const [data, setData] = useState<NewsDetail | null>(null);

  useEffect(() => {
    if (!newsId) return;
    getNewsDetail(newsId).then(setData).catch(() => {});
    trackPageView(`/news/${newsId}`);
  }, [newsId]);

  if (!data) return <div className="min-h-[50vh]" />;

  return (
    <div className="max-w-[800px] mx-auto px-6 py-12">
      {/* 面包屑 */}
      <nav className="text-xs text-cream-3 mb-8">
        <Link to="/" className="hover:text-gold-soft">首页</Link>
        <span className="mx-2">/</span>
        <Link to="/news" className="hover:text-gold-soft">新闻资讯</Link>
        <span className="mx-2">/</span>
        <span className="text-gold-soft">正文</span>
      </nav>

      {/* 标题区 */}
      <h1 className="font-serif-title text-2xl md:text-3xl tracking-[2px] text-cream leading-snug mb-4">{data.title}</h1>
      <p className="text-xs text-cream-3 mb-8">
        {data.publish_time ? new Date(data.publish_time).toLocaleDateString("zh-CN") : ""}
        {data.author && ` · 作者：${data.author}`}
        {data.source && ` · 来源：${data.source}`}
        {" · "}{data.view_count} 阅读
      </p>

      {/* 封面 */}
      {data.cover && (
        <div className="rounded-[20px] overflow-hidden border border-line-gold mb-8">
          <img src={data.cover} alt={data.title} className="w-full aspect-[16/7] object-cover" />
        </div>
      )}

      {/* 正文（DOMPurify 清洗，PRD 9.2 防 XSS） */}
      <div className="prose-content text-cream-2 text-sm leading-loose space-y-4" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.content_html) }} />

      {/* 上一篇/下一篇（PRD 6.4.2） */}
      <nav className="flex justify-between gap-4 mt-12 pt-6 border-t border-line-gold">
        {data.prev ? (
          <Link to={`/news/${data.prev.id}`} className="text-xs text-cream-3 hover:text-gold-soft max-w-[45%] truncate">← {data.prev.title}</Link>
        ) : <span />}
        {data.next ? (
          <Link to={`/news/${data.next.id}`} className="text-xs text-cream-3 hover:text-gold-soft max-w-[45%] truncate text-right">{data.next.title} →</Link>
        ) : <span />}
      </nav>
    </div>
  );
}
