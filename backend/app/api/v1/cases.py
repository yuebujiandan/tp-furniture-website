"""前台实景案例接口（技术文档 §6.4 / PRD 6.3）。

实现说明：
- 列表：风格/空间/面积关键词筛选 + 是否工程案例 + 分页；
- 详情：图文正文 + 关联产品（product_ids → 产品列表，可跳转详情）+ 客户评价；
- 可见性：is_activate=True（技术文档 §4.0.2）。
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.exceptions import NOT_FOUND, BizError, ok
from app.db.session import get_db
from app.models import Cases, Products
from app.utils.pagination import PaginationParams, paginate

router = APIRouter(tags=["前台-案例"])


def _case_out(c: Cases, db: Session, with_detail: bool = False) -> dict:
    """案例序列化。"""
    data = {
        "id": c.id,
        "title": c.title,
        "cover": c.cover,
        "area": c.area,
        "house_type": c.house_type,
        "style_tags": c.style_tags,
        "space": c.space,
        "location_desc": c.location_desc,
        "is_engineering": c.is_engineering,
        "view_count": c.view_count,
    }
    if with_detail:
        # 详情补充：正文/客户评价/关联产品
        products = []
        if c.product_ids:
            rows = db.query(Products).filter(Products.id.in_(c.product_ids)).all()
            products = [
                {"id": x.id, "name": x.name, "cover_image_url": x.cover_image_url, "retail_price": float(x.retail_price) if x.retail_price else None}
                for x in rows
            ]
        data.update({
            "content_html": c.content_html or "",
            "customer_review": c.customer_review,
            "products": products,
        })
    return data


@router.get("/cases")
def list_cases(
    style: str | None = Query(None, description="风格标签"),
    space: str | None = Query(None, description="空间"),
    kw: str | None = Query(None, description="关键词（标题/地点）"),
    is_engineering: bool | None = Query(None, description="是否工程案例"),
    db: Session = Depends(get_db),
    p: PaginationParams = Depends(),
):
    """案例列表（筛选 + 分页，PRD 6.3.2）。"""
    q = db.query(Cases).filter(Cases.is_activate.is_(True))
    if style:
        q = q.filter(Cases.style_tags.like(f"%{style}%"))
    if space:
        q = q.filter(Cases.space == space)
    if kw:
        like = f"%{kw.strip()}%"
        q = q.filter(or_(Cases.title.like(like), Cases.location_desc.like(like)))
    if is_engineering is not None:
        q = q.filter(Cases.is_engineering.is_(is_engineering))

    total = q.count()
    items = q.order_by(Cases.sort.asc(), Cases.id.desc()).offset(p.offset).limit(p.page_size).all()
    return ok(paginate([_case_out(c, db) for c in items], total, p))


@router.get("/cases/{case_id}")
def get_case(case_id: int, db: Session = Depends(get_db)):
    """案例详情（含关联产品，40400 不存在）。"""
    c = db.query(Cases).filter(Cases.id == case_id, Cases.is_activate.is_(True)).first()
    if not c:
        raise BizError(NOT_FOUND, "案例不存在")
    # 浏览量累加（埋点服务端兜底，PRD 7.6.2）
    c.view_count += 1
    db.commit()
    return ok(_case_out(c, db, with_detail=True))
