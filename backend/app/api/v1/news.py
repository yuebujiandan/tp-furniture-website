"""前台新闻接口（技术文档 §6.4 / PRD 6.4）。

实现说明：
- 列表：企业新闻/行业资讯双 Tab 分类 + 关键词 + 分页；置顶优先 + 发布时间倒序；
- 详情：富文本正文 + 上一篇/下一篇（P1 档实现基础）；
- 可见性：is_activate + is_published + 未过期（技术文档 §4.0.2 新闻规则）。
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.exceptions import NOT_FOUND, BizError, ok
from app.db.session import get_db
from app.models import News
from app.utils.pagination import PaginationParams, paginate

router = APIRouter(tags=["前台-新闻"])


def _visible_news(db: Session):
    """新闻可见性基础查询（is_activate + is_published + 未过期）。"""
    now = datetime.now(timezone.utc)
    return db.query(News).filter(
        News.is_activate.is_(True),
        News.is_published.is_(True),
        (News.expire_at.is_(None)) | (News.expire_at >= now),
    )


def _news_out(n: News, with_detail: bool = False) -> dict:
    data = {
        "id": n.id,
        "title": n.title,
        "category": n.category,
        "cover": n.cover,
        "summary": n.summary,
        "author": n.author,
        "source": n.source,
        "is_top": n.is_top,
        "view_count": n.view_count,
        "publish_time": n.publish_time.isoformat() if n.publish_time else None,
    }
    if with_detail:
        data["content_html"] = n.content_html or ""
    return data


@router.get("/news")
def list_news(
    category: str | None = Query(None, description="company_news/industry_news"),
    kw: str | None = Query(None, description="关键词（标题/摘要）"),
    db: Session = Depends(get_db),
    p: PaginationParams = Depends(),
):
    """新闻列表（分类 Tab + 关键词 + 分页；置顶优先，PRD 6.4.1）。"""
    q = _visible_news(db)
    if category:
        q = q.filter(News.category == category)
    if kw:
        like = f"%{kw.strip()}%"
        q = q.filter(News.title.like(like) | News.summary.like(like))

    total = q.count()
    items = q.order_by(News.is_top.desc(), News.publish_time.desc().nullslast()).offset(p.offset).limit(p.page_size).all()
    return ok(paginate([_news_out(n) for n in items], total, p))


@router.get("/news/{news_id}")
def get_news(news_id: int, db: Session = Depends(get_db)):
    """新闻详情（浏览量累加 + 上一篇/下一篇）。"""
    n = _visible_news(db).filter(News.id == news_id).first()
    if not n:
        raise BizError(NOT_FOUND, "新闻不存在或已下线")
    n.view_count += 1
    db.commit()
    # 上一篇/下一篇（同分类，按发布时间倒序的相邻记录）
    siblings = (
        _visible_news(db)
        .filter(News.category == n.category)
        .order_by(News.publish_time.desc().nullslast())
        .all()
    )
    idx = next((i for i, x in enumerate(siblings) if x.id == n.id), -1)
    prev_n = siblings[idx + 1] if idx >= 0 and idx + 1 < len(siblings) else None
    next_n = siblings[idx - 1] if idx > 0 else None
    return ok({
        **_news_out(n, with_detail=True),
        "prev": {"id": prev_n.id, "title": prev_n.title} if prev_n else None,
        "next": {"id": next_n.id, "title": next_n.title} if next_n else None,
    })
