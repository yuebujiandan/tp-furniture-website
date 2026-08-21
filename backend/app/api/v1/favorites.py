"""前台产品收藏接口（技术文档 §6.3 / PRD 6.2.2，V1.7 回退恢复）。

实现说明：
- POST /favorites：收藏产品（需登录；40902 已收藏）；
- DELETE /favorites/{product_id}：取消收藏；
- GET /favorites：我的收藏列表（P3 用户中心复用）；
- 收藏排行口径来自 favorites 表聚合（PRD 7.6.1，P5 看板）。
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.exceptions import ALREADY_FAVORITED, NOT_FOUND, PRODUCT_NOT_FOUND, BizError, ok
from app.db.session import get_db
from app.models import Favorites, Products, Users
from app.utils.pagination import PaginationParams, paginate

router = APIRouter(prefix="/favorites", tags=["前台-收藏"])


@router.post("/{product_id}")
def add_favorite(product_id: int, db: Session = Depends(get_db), user: Users = Depends(get_current_user)):
    """收藏产品（需登录；产品须可见，40902 防重复）。"""
    product = db.query(Products).filter(
        Products.id == product_id,
        Products.is_activate.is_(True),
        Products.is_deleted.is_(False),
        Products.publish_status == "on_shelf",
    ).first()
    if not product:
        raise BizError(PRODUCT_NOT_FOUND, "产品不存在或已下架")
    existed = db.query(Favorites).filter(Favorites.user_id == user.id, Favorites.product_id == product_id).first()
    if existed:
        raise BizError(ALREADY_FAVORITED, "已收藏该产品")
    db.add(Favorites(user_id=user.id, product_id=product_id))
    db.commit()
    return ok({"favorited": True})


@router.delete("/{product_id}")
def remove_favorite(product_id: int, db: Session = Depends(get_db), user: Users = Depends(get_current_user)):
    """取消收藏。"""
    row = db.query(Favorites).filter(Favorites.user_id == user.id, Favorites.product_id == product_id).first()
    if row:
        db.delete(row)
        db.commit()
    return ok({"favorited": False})


@router.get("/")
def my_favorites(
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
    p: PaginationParams = Depends(),
):
    """我的收藏列表（P3 用户中心复用）。"""
    q = (
        db.query(Favorites)
        .join(Products, Favorites.product_id == Products.id)
        .filter(Favorites.user_id == user.id, Products.is_deleted.is_(False))
    )
    total = q.count()
    rows = q.order_by(Favorites.id.desc()).offset(p.offset).limit(p.page_size).all()
    items = [
        {
            "id": f.product_id,
            "name": f.product.name,
            "cover_image_url": f.product.cover_image_url,
            "retail_price": float(f.product.retail_price) if f.product.retail_price is not None else None,
            "series_name": f.product.series.name if f.product.series else None,
        }
        for f in rows
    ]
    return ok(paginate(items, total, p))
