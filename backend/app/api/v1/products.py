"""前台产品接口（技术文档 §6.3 / PRD 6.2）。

实现说明：
- GET /series、/spaces：维度列表（附可见产品数，首页/筛选 Tab 用）；
- GET /products：列表（系列/空间/风格/价格区间/关键词 6 类筛选 + 4 种排序 + 分页）；
- GET /products/{id}：详情（40401 不存在或已下架）；GET .../related 相关推荐（同系列优先）；
- GET .../cases 关联案例（cases.product_ids 含本产品）；
- 可见性：三条件（is_activate + is_deleted + publish_status='on_shelf'，技术文档 §4.0.2）；
- 经销商价：响应附带 dealer_price 字段，前端按登录角色展示（ADR-004，P2 简化）。
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import PRODUCT_NOT_FOUND, BizError, ok
from app.db.session import get_db
from app.models import Cases, ProductSpaces, Products, Series, Spaces
from app.utils.pagination import PaginationParams, paginate

router = APIRouter(tags=["前台-产品"])

# 可见性基础条件（三条件，技术文档 §4.0.2）
_VISIBLE = (
    Products.is_activate.is_(True),
    Products.is_deleted.is_(False),
    Products.publish_status == "on_shelf",
)


def _product_out(p: Products, with_detail: bool = False) -> dict:
    """产品序列化：列表精简 / 详情带图集富文本。"""
    data = {
        "id": p.id,
        "name": p.name,
        "product_no": p.product_no,
        "series_id": p.series_id,
        "series_name": p.series.name if p.series else None,
        "category_id": p.category_id,
        "category_name": p.category.name if p.category else None,
        "style_tags": p.style_tags,
        "retail_price": float(p.retail_price) if p.retail_price is not None else None,
        "dealer_price": float(p.dealer_price) if p.dealer_price is not None else None,
        "cover_image_url": p.cover_image_url,
        "is_recommend": p.is_recommend,
        "is_new": p.is_new,
        "is_top": p.is_top,
        "stock": p.stock,
        "size": p.size,
        "material": p.material,
        "craft": p.craft,
        "warranty": p.warranty,
    }
    if with_detail:
        # 详情补充：图集/规格/富文本/多空间
        data.update({
            "images": p.images or [],
            "specs": p.specs or {},
            "detail_html": p.detail_html or "",
            "spaces": [{"id": sp.id, "name": sp.name} for sp in (p.spaces or [])],
        })
    return data


@router.get("/series")
def list_series(db: Session = Depends(get_db)):
    """产品系列列表（启用 + 排序，附可见产品数）。"""
    from sqlalchemy import func

    rows = (
        db.query(Series, func.count(Products.id))
        .outerjoin(Products, Products.series_id == Series.id)
        .filter(Series.is_activate.is_(True), *_VISIBLE)
        .group_by(Series.id)
        .order_by(Series.sort.asc())
        .all()
    )
    return ok([
        {"id": s.id, "name": s.name, "image": s.image, "intro": s.intro, "product_count": cnt}
        for s, cnt in rows
    ])


@router.get("/spaces")
def list_spaces(db: Session = Depends(get_db)):
    """空间分类列表（启用 + 排序，附可见产品数：按主分类 category_id 统计）。"""
    from sqlalchemy import func

    rows = (
        db.query(Spaces, func.count(Products.id))
        .outerjoin(Products, Products.category_id == Spaces.id)
        .filter(Spaces.is_activate.is_(True), *_VISIBLE)
        .group_by(Spaces.id)
        .order_by(Spaces.sort.asc())
        .all()
    )
    return ok([
        {"id": sp.id, "name": sp.name, "icon": sp.icon, "product_count": cnt}
        for sp, cnt in rows
    ])


@router.get("/products")
def list_products(
    series_id: int | None = Query(None, description="系列筛选"),
    space_id: int | None = Query(None, description="空间筛选（主分类或关联空间）"),
    style: str | None = Query(None, description="风格标签"),
    price_min: float | None = Query(None, description="价格下限"),
    price_max: float | None = Query(None, description="价格上限"),
    kw: str | None = Query(None, description="关键词（名称/编号）"),
    sort: str = Query("default", description="default/price_asc/price_desc/newest"),
    db: Session = Depends(get_db),
    p: PaginationParams = Depends(),
):
    """产品列表：6 类筛选 × 4 种排序 × 分页（技术文档 §6.3 / UIUX §5.5）。"""
    # selectinload 预加载系列/空间（修复列表 N+1，P6 性能优化）
    q = db.query(Products).options(
        selectinload(Products.series), selectinload(Products.category)
    ).filter(*_VISIBLE)

    # 系列筛选
    if series_id is not None:
        q = q.filter(Products.series_id == series_id)
    # 空间筛选：主分类 或 关联空间（product_spaces M:N）
    if space_id is not None:
        q = q.filter(
            or_(
                Products.category_id == space_id,
                Products.id.in_(db.query(ProductSpaces.product_id).filter(ProductSpaces.space_id == space_id)),
            )
        )
    # 风格标签（LIKE，双环境约束）
    if style:
        q = q.filter(Products.style_tags.like(f"%{style}%"))
    # 价格区间（按零售价）
    if price_min is not None:
        q = q.filter(Products.retail_price >= price_min)
    if price_max is not None:
        q = q.filter(Products.retail_price <= price_max)
    # 关键词（名称/产品编号 LIKE）
    if kw:
        like = f"%{kw.strip()}%"
        q = q.filter(or_(Products.name.like(like), Products.product_no.like(like)))

    total = q.count()
    # 排序映射（默认 sort 升序；价格升/降；最新按创建时间倒序）
    order_map = {
        "default": Products.sort.asc(),
        "price_asc": Products.retail_price.asc().nullslast(),
        "price_desc": Products.retail_price.desc().nullslast(),
        "newest": Products.created_at.desc(),
    }
    items = q.order_by(order_map.get(sort, Products.sort.asc())).offset(p.offset).limit(p.page_size).all()
    return ok(paginate([_product_out(x) for x in items], total, p))


@router.get("/products/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    """产品详情（40401 不存在或已下架，PRD 6.2.3）。"""
    p = db.query(Products).filter(Products.id == product_id, *_VISIBLE).first()
    if not p:
        raise BizError(PRODUCT_NOT_FOUND, "产品不存在或已下架")
    return ok(_product_out(p, with_detail=True))


@router.get("/products/{product_id}/related")
def related_products(product_id: int, db: Session = Depends(get_db)):
    """相关推荐：同系列优先 4 个（技术文档 §7.4 详情页关联推荐）。"""
    p = db.query(Products).filter(Products.id == product_id, *_VISIBLE).first()
    if not p:
        raise BizError(PRODUCT_NOT_FOUND, "产品不存在或已下架")
    items = (
        db.query(Products)
        .filter(Products.series_id == p.series_id, Products.id != product_id, *_VISIBLE)
        .order_by(Products.sort.asc())
        .limit(4)
        .all()
    )
    return ok([_product_out(x) for x in items])


@router.get("/products/{product_id}/cases")
def product_cases(product_id: int, db: Session = Depends(get_db)):
    """关联案例：cases.product_ids 含本产品的启用案例（最多 3 个）。"""
    p = db.query(Products).filter(Products.id == product_id, *_VISIBLE).first()
    if not p:
        raise BizError(PRODUCT_NOT_FOUND, "产品不存在或已下架")
    rows = (
        db.query(Cases)
        .filter(Cases.is_activate.is_(True))
        .order_by(Cases.sort.asc())
        .all()
    )
    matched = [c for c in rows if c.product_ids and product_id in c.product_ids][:3]
    return ok([
        {"id": c.id, "title": c.title, "cover": c.cover, "location_desc": c.location_desc, "area": c.area}
        for c in matched
    ])
