"""后台产品管理接口（技术文档 §6.6.2 / PRD 7.1）。

实现说明：
- 系列/空间 CRUD（name 唯一；删除有产品时禁物理删除提示下线）；
- 产品列表（系列/空间/状态/关键词筛选 + 库存预警标记）、新建/编辑、软删除（is_deleted=True，PRD 7.1.2）；
- 批量调价（scope: all/series/ids × mode: percent/fixed，PRD 7.1.1 P1）；
- 库存预警列表（stock ≤ stock_warn）；
- 权限：product:view / product:edit（RBAC 二次校验）。
"""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_staff, require_permission
from app.core.exceptions import CONFLICT, NOT_FOUND, BizError, ok
from app.db.session import get_db
from app.models import Products, Series, Spaces, ProductSpaces
from app.utils.pagination import PaginationParams, paginate

router = APIRouter(prefix="/admin", tags=["后台-产品管理"])

# 权限依赖（RBAC，附录 C-2）
view_perm = require_permission("product:view")
edit_perm = require_permission("product:edit")


# ---------- 系列 ----------
class SeriesIn(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    image: str | None = None
    intro: str | None = Field(default=None, max_length=255)
    sort: int = 0


@router.get("/series", dependencies=[Depends(view_perm)])
def list_series(db: Session = Depends(get_db)):
    """系列列表（含产品数）。"""
    from sqlalchemy import func

    rows = (
        db.query(Series, func.count(Products.id))
        .outerjoin(Products, Products.series_id == Series.id)
        .filter(Products.is_deleted.is_(False))
        .group_by(Series.id)
        .order_by(Series.sort.asc())
        .all()
    )
    return ok([
        {"id": s.id, "name": s.name, "image": s.image, "intro": s.intro, "sort": s.sort,
         "is_activate": s.is_activate, "product_count": cnt}
        for s, cnt in rows
    ])


@router.post("/series", dependencies=[Depends(edit_perm)])
def create_series(body: SeriesIn, db: Session = Depends(get_db)):
    """新建系列（name 唯一，40900 冲突）。"""
    if db.query(Series).filter(Series.name == body.name).first():
        raise BizError(CONFLICT, "系列名称已存在")
    row = Series(name=body.name, image=body.image, intro=body.intro, sort=body.sort)
    db.add(row)
    db.commit()
    db.refresh(row)
    return ok({"id": row.id})


@router.put("/series/{series_id}", dependencies=[Depends(edit_perm)])
def update_series(series_id: int, body: SeriesIn, db: Session = Depends(get_db)):
    """编辑系列。"""
    row = db.get(Series, series_id)
    if not row:
        raise BizError(NOT_FOUND, "系列不存在")
    dup = db.query(Series).filter(Series.name == body.name, Series.id != series_id).first()
    if dup:
        raise BizError(CONFLICT, "系列名称已存在")
    row.name, row.image, row.intro, row.sort = body.name, body.image, body.intro, body.sort
    db.commit()
    return ok({"id": row.id})


@router.delete("/series/{series_id}", dependencies=[Depends(edit_perm)])
def delete_series(series_id: int, db: Session = Depends(get_db)):
    """删除系列（有产品时禁物理删除，提示下线，技术文档 §6.6.2）。"""
    row = db.get(Series, series_id)
    if not row:
        raise BizError(NOT_FOUND, "系列不存在")
    has_products = db.query(Products).filter(Products.series_id == series_id, Products.is_deleted.is_(False)).first()
    if has_products:
        row.is_activate = False  # 降级为禁用而非物理删除
        db.commit()
        return ok({"deleted": False, "note": "该系列下存在产品，已禁用系列"})
    db.delete(row)
    db.commit()
    return ok({"deleted": True})


# ---------- 空间分类 ----------
class SpaceIn(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    icon: str | None = None
    sort: int = 0


@router.get("/spaces", dependencies=[Depends(view_perm)])
def list_spaces(db: Session = Depends(get_db)):
    """空间分类列表。"""
    rows = db.query(Spaces).order_by(Spaces.sort.asc()).all()
    return ok([
        {"id": s.id, "name": s.name, "icon": s.icon, "sort": s.sort, "is_activate": s.is_activate}
        for s in rows
    ])


@router.post("/spaces", dependencies=[Depends(edit_perm)])
def create_space(body: SpaceIn, db: Session = Depends(get_db)):
    """新建空间（name 唯一）。"""
    if db.query(Spaces).filter(Spaces.name == body.name).first():
        raise BizError(CONFLICT, "空间名称已存在")
    row = Spaces(name=body.name, icon=body.icon, sort=body.sort)
    db.add(row)
    db.commit()
    db.refresh(row)
    return ok({"id": row.id})


@router.put("/spaces/{space_id}", dependencies=[Depends(edit_perm)])
def update_space(space_id: int, body: SpaceIn, db: Session = Depends(get_db)):
    """编辑空间。"""
    row = db.get(Spaces, space_id)
    if not row:
        raise BizError(NOT_FOUND, "空间不存在")
    dup = db.query(Spaces).filter(Spaces.name == body.name, Spaces.id != space_id).first()
    if dup:
        raise BizError(CONFLICT, "空间名称已存在")
    row.name, row.icon, row.sort = body.name, body.icon, body.sort
    db.commit()
    return ok({"id": row.id})


@router.delete("/spaces/{space_id}", dependencies=[Depends(edit_perm)])
def delete_space(space_id: int, db: Session = Depends(get_db)):
    """删除空间（有产品引用时禁用）。"""
    row = db.get(Spaces, space_id)
    if not row:
        raise BizError(NOT_FOUND, "空间不存在")
    used = db.query(Products).filter(Products.category_id == space_id, Products.is_deleted.is_(False)).first()
    if used:
        row.is_activate = False
        db.commit()
        return ok({"deleted": False, "note": "该空间下存在产品，已禁用空间"})
    db.delete(row)
    db.commit()
    return ok({"deleted": True})


# ---------- 产品 ----------
class ProductIn(BaseModel):
    """产品新增/编辑入参（字段对齐数据库设计文档 §4.4.3）。"""

    name: str = Field(min_length=1, max_length=100)
    product_no: str = Field(min_length=1, max_length=50)
    series_id: int
    category_id: int | None = None
    style_tags: str | None = None
    specs: dict | None = None
    retail_price: float | None = None
    dealer_price: float | None = None
    stock: int = 0
    stock_warn: int = 5
    cover_image_url: str | None = None
    images: list | None = None
    detail_html: str | None = None
    size: str | None = None
    material: str | None = None
    craft: str | None = None
    warranty: str | None = None
    sort: int = 0
    publish_status: str = "draft"         # on_shelf/off_shelf/draft
    is_top: bool = False
    is_recommend: bool = False
    is_new: bool = False
    is_activate: bool = True
    spaces: list[int] | None = None           # 适用空间（M:N，product_spaces）


def _product_admin_out(p: Products) -> dict:
    """后台产品序列化（含管理字段）。"""
    return {
        "id": p.id, "name": p.name, "product_no": p.product_no,
        "series_id": p.series_id, "series_name": p.series.name if p.series else None,
        "category_id": p.category_id, "category_name": p.category.name if p.category else None,
        "style_tags": p.style_tags, "specs": p.specs or {},
        "retail_price": float(p.retail_price) if p.retail_price is not None else None,
        "dealer_price": float(p.dealer_price) if p.dealer_price is not None else None,
        "stock": p.stock, "stock_warn": p.stock_warn, "low_stock": p.stock <= p.stock_warn,
        "cover_image_url": p.cover_image_url, "images": p.images or [],
        "detail_html": p.detail_html or "",
        "size": p.size, "material": p.material, "craft": p.craft, "warranty": p.warranty,
        "sort": p.sort, "publish_status": p.publish_status,
        "is_top": p.is_top, "is_recommend": p.is_recommend, "is_new": p.is_new,
        "is_deleted": p.is_deleted, "is_activate": p.is_activate,
        "spaces": [s.id for s in p.spaces],
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


def _sync_spaces(db: Session, product: Products, space_ids: list[int] | None) -> None:
    """同步产品-空间关联（product_spaces）。space_ids=None 表示不修改；空数组表示清空。"""
    if space_ids is None:
        return
    db.query(ProductSpaces).filter(ProductSpaces.product_id == product.id).delete()
    for sid in space_ids:
        db.add(ProductSpaces(product_id=product.id, space_id=sid))


@router.get("/products", dependencies=[Depends(view_perm)])
def list_admin_products(
    series_id: int | None = None,
    space_id: int | None = None,
    publish_status: str | None = Query(None, description="on_shelf/off_shelf/draft"),
    kw: str | None = None,
    db: Session = Depends(get_db),
    p: PaginationParams = Depends(),
):
    """产品列表（后台可见全部非软删除产品，含库存预警标记）。"""
    # selectinload 预加载系列/空间（修复列表 N+1，P6 性能优化）
    q = db.query(Products).options(
        selectinload(Products.series), selectinload(Products.category)
    ).filter(Products.is_deleted.is_(False))
    if series_id is not None:
        q = q.filter(Products.series_id == series_id)
    if space_id is not None:
        q = q.filter(Products.category_id == space_id)
    if publish_status:
        q = q.filter(Products.publish_status == publish_status)
    if kw:
        like = f"%{kw.strip()}%"
        q = q.filter(or_(Products.name.like(like), Products.product_no.like(like)))
    total = q.count()
    items = q.order_by(Products.sort.asc(), Products.id.desc()).offset(p.offset).limit(p.page_size).all()
    return ok(paginate([_product_admin_out(x) for x in items], total, p))


@router.get("/products/low-stock", dependencies=[Depends(view_perm)])
def low_stock_products(db: Session = Depends(get_db)):
    """库存预警列表（stock ≤ stock_warn，PRD 7.1.1）。"""
    items = (
        db.query(Products)
        .filter(Products.is_deleted.is_(False), Products.stock <= Products.stock_warn)
        .order_by(Products.stock.asc())
        .limit(50)
        .all()
    )
    return ok([_product_admin_out(x) for x in items])


@router.post("/products", dependencies=[Depends(edit_perm)])
def create_product(body: ProductIn, db: Session = Depends(get_db)):
    """新建产品（product_no 唯一，40900 冲突）。"""
    if db.query(Products).filter(Products.product_no == body.product_no).first():
        raise BizError(CONFLICT, "产品编号已存在")
    row = Products(**body.model_dump(exclude={"spaces"}))
    db.add(row)
    db.commit()
    db.refresh(row)
    if body.spaces is not None:
        _sync_spaces(db, row, body.spaces)
        db.commit()
    return ok({"id": row.id})


@router.get("/products/{product_id}", dependencies=[Depends(view_perm)])
def get_admin_product(product_id: int, db: Session = Depends(get_db)):
    """产品详情（后台）。"""
    row = db.query(Products).filter(Products.id == product_id, Products.is_deleted.is_(False)).first()
    if not row:
        raise BizError(NOT_FOUND, "产品不存在")
    return ok(_product_admin_out(row))


@router.put("/products/{product_id}", dependencies=[Depends(edit_perm)])
def update_product(product_id: int, body: ProductIn, db: Session = Depends(get_db)):
    """编辑产品（product_no 冲突校验）。"""
    row = db.get(Products, product_id)
    if not row or row.is_deleted:
        raise BizError(NOT_FOUND, "产品不存在")
    dup = db.query(Products).filter(Products.product_no == body.product_no, Products.id != product_id).first()
    if dup:
        raise BizError(CONFLICT, "产品编号已存在")
    for k, v in body.model_dump(exclude={"spaces"}).items():
        setattr(row, k, v)
    if body.spaces is not None:
        _sync_spaces(db, row, body.spaces)
    db.commit()
    return ok({"id": row.id})


@router.delete("/products/{product_id}", dependencies=[Depends(edit_perm)])
def delete_product(product_id: int, db: Session = Depends(get_db)):
    """软删除产品（is_deleted=True，历史签单 JSON 快照不受影响，PRD 7.1.2 / ADR-003）。"""
    row = db.get(Products, product_id)
    if not row:
        raise BizError(NOT_FOUND, "产品不存在")
    row.is_deleted = True
    db.commit()
    return ok({"deleted": True})


# ---------- 批量调价（PRD 7.1.1 P1）----------
class BatchPriceIn(BaseModel):
    scope: str                           # all / series / ids
    series_id: int | None = None
    product_ids: list[int] | None = None
    mode: str                            # percent / fixed
    value: float


@router.post("/products/batch-price", dependencies=[Depends(edit_perm)])
def batch_price(body: BatchPriceIn, db: Session = Depends(get_db)):
    """批量调价：按范围（全部/系列/指定 ID）× 方式（百分比/固定值）调整零售价。"""
    q = db.query(Products).filter(Products.is_deleted.is_(False))
    if body.scope == "series":
        if body.series_id is None:
            raise BizError(40000, "scope=series 需传 series_id")
        q = q.filter(Products.series_id == body.series_id)
    elif body.scope == "ids":
        if not body.product_ids:
            raise BizError(40000, "scope=ids 需传 product_ids")
        q = q.filter(Products.id.in_(body.product_ids))

    items = q.all()
    for p in items:
        if p.retail_price is None:
            continue
        if body.mode == "percent":
            # 百分比：value=10 表示上涨 10%；-10 表示下调 10%
            p.retail_price = round(float(p.retail_price) * (1 + body.value / 100), 2)
        elif body.mode == "fixed":
            p.retail_price = max(0, round(float(p.retail_price) + body.value, 2))
    db.commit()
    return ok({"affected": len(items)})
