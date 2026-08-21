"""首页聚合接口（技术文档 §6.1 / PRD 6.1.1）。

实现说明：
- 单一聚合接口 GET /home，减少前端串行请求（首页首屏 ≤3s，技术文档 §11.1）；
- 返回：Banner（启用排序）、品牌卖点/数据背书（site_configs）、系列/空间（含产品数）、
  精选案例、最新新闻、门店列表；
- 可见性规则统一在查询中约束（产品三条件/新闻两条件+有效期）。
"""
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.exceptions import ok
from app.db.session import get_db
from app.models import (
    Banners,
    Cases,
    News,
    Products,
    Series,
    SiteConfigs,
    Spaces,
    Stores,
)
from datetime import datetime, timezone

router = APIRouter(tags=["前台-首页"])


def _get_config(db: Session, key: str, default=None):
    """读取站点配置键值（不存在返回默认值）。"""
    row = db.query(SiteConfigs).filter(SiteConfigs.key == key).first()
    return row.value if row else default


def _count_products(db: Session, **filters) -> int:
    """统计可见产品数（三条件可见性规则，技术文档 §4.0.2）。"""
    q = db.query(func.count(Products.id)).filter(
        Products.is_activate.is_(True),
        Products.is_deleted.is_(False),
        Products.publish_status == "on_shelf",
    )
    for col, val in filters.items():
        q = q.filter(getattr(Products, col) == val)
    return q.scalar() or 0


@router.get("/home")
def home(db: Session = Depends(get_db)):
    """首页聚合：Banner/卖点/系列/空间/精选案例/新闻/数据背书/门店。"""
    now = datetime.now(timezone.utc)

    # 1. Banner 轮播（启用 + 排序）
    banners = (
        db.query(Banners).filter(Banners.is_activate.is_(True)).order_by(Banners.sort.asc()).limit(5).all()
    )

    # 2. 品牌卖点 / 数据背书（来自 site_configs，后台可维护）
    brand_points = _get_config(db, "home_brand_points", [])
    home_stats = _get_config(db, "home_stats", [])

    # 3. 系列 / 空间（启用 + 排序，附可见产品数）
    series = [
        {"id": s.id, "name": s.name, "image": s.image, "intro": s.intro, "product_count": _count_products(db, series_id=s.id)}
        for s in db.query(Series).filter(Series.is_activate.is_(True)).order_by(Series.sort.asc()).all()
    ]
    spaces = [
        {"id": sp.id, "name": sp.name, "icon": sp.icon, "product_count": _count_products(db, category_id=sp.id)}
        for sp in db.query(Spaces).filter(Spaces.is_activate.is_(True)).order_by(Spaces.sort.asc()).all()
    ]

    # 4. 精选案例（首页精选配置 > 兜底取启用案例前 3）
    featured_ids = _get_config(db, "home_featured_case_ids", []) or []
    if featured_ids:
        cases = db.query(Cases).filter(Cases.is_activate.is_(True), Cases.id.in_(featured_ids)).all()
        cases.sort(key=lambda c: featured_ids.index(c.id))
        cases = cases[:3]
    else:
        cases = db.query(Cases).filter(Cases.is_activate.is_(True)).order_by(Cases.sort.asc()).limit(3).all()

    # 5. 最新新闻（发布 + 未过期，前 4 条）
    news = (
        db.query(News)
        .filter(
            News.is_activate.is_(True),
            News.is_published.is_(True),
            (News.expire_at.is_(None)) | (News.expire_at >= now),
        )
        .order_by(News.is_top.desc(), News.publish_time.desc().nullslast())
        .limit(4)
        .all()
    )

    # 6. 门店（启用 + 排序，前 6 家）
    stores = db.query(Stores).filter(Stores.is_activate.is_(True)).order_by(Stores.sort.asc()).limit(6).all()

    return ok({
        "banners": [
            {"id": b.id, "image": b.image, "title": b.title, "subtitle": b.subtitle,
             "button_text": b.button_text, "link_url": b.link_url}
            for b in banners
        ],
        "brand_points": brand_points,
        "home_stats": home_stats,
        "series": series,
        "spaces": spaces,
        "featured_cases": [
            {"id": c.id, "title": c.title, "cover": c.cover, "location_desc": c.location_desc, "area": c.area}
            for c in cases
        ],
        "news": [
            {"id": n.id, "title": n.title, "category": n.category, "cover": n.cover,
             "summary": n.summary, "publish_time": n.publish_time.isoformat() if n.publish_time else None}
            for n in news
        ],
        "stores": [
            {"id": s.id, "name": s.name, "address": s.address, "phone": s.phone,
             "business_hours": s.business_hours}
            for s in stores
        ],
    })
