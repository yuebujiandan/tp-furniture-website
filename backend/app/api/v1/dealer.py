"""前台经销商域接口（PRD 6.9.5 / 技术文档 §6.2.5）。

实现说明：
- POST /dealer/apply：提交经销商认证申请（user 角色；40302 已是经销商不可重复申请）；
- GET /dealer/apply：我的申请状态（待审核/通过/驳回）；
- GET /dealer/products：经销商专属价产品列表（dealer_price 优先，NULL 按用户折扣率折算，ADR-004）；
- POST/GET /dealer/intents：采购意向提交与我的意向列表（可转正式签单 P5 联调）；
- GET /dealer/announcements：经销商公告（scope=all/dealer + 指定经销商 JSON，PRD 6.9.5 V1.2）；
- 认证通过后 users.role 由后台审核接口升级为 dealer（dealer_verified_at + dealer_discount）。
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_dealer, get_current_user
from app.core.exceptions import ALREADY_APPLIED, CONFLICT, NOT_DEALER, NOT_FOUND, BizError, ok
from app.db.session import get_db
from app.models import Announcements, DealerApplications, DealerPurchaseIntents, Products, Users
from app.utils.pagination import PaginationParams, paginate

router = APIRouter(prefix="/dealer", tags=["前台-经销商"])

# 可见产品基础条件（三条件）
_VISIBLE = (
    Products.is_activate.is_(True),
    Products.is_deleted.is_(False),
    Products.publish_status == "on_shelf",
)


class DealerApplyIn(BaseModel):
    """经销商认证申请入参（PRD 6.9.5）。"""

    company_name: str = Field(min_length=1, max_length=100)
    credit_code: str = Field(min_length=1, max_length=50)
    license_img: str = Field(min_length=1, max_length=255)
    contact: str = Field(min_length=1, max_length=50)
    phone: str
    region: str | None = None
    reason: str | None = None


class IntentIn(BaseModel):
    """采购意向入参（PRD 6.9.5）。"""

    items: list = Field(default_factory=list)   # [{id, name, qty}]


@router.post("/apply")
def apply_dealer(body: DealerApplyIn, db: Session = Depends(get_db), user: Users = Depends(get_current_user)):
    """提交经销商认证申请（40302 已是经销商 / 40903 已申请待审核）。"""
    if user.role == "dealer":
        raise BizError(NOT_DEALER, "您已是认证经销商")
    existed = db.query(DealerApplications).filter(
        DealerApplications.user_id == user.id,
        DealerApplications.status == "pending",
    ).first()
    if existed:
        raise BizError(ALREADY_APPLIED, "已有待审核的认证申请")
    row = DealerApplications(user_id=user.id, **body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return ok({"id": row.id, "status": row.status})


@router.get("/apply")
def my_apply(db: Session = Depends(get_db), user: Users = Depends(get_current_user)):
    """我的认证申请状态（最近一条，PRD 6.9.5）。"""
    row = (
        db.query(DealerApplications)
        .filter(DealerApplications.user_id == user.id)
        .order_by(DealerApplications.id.desc())
        .first()
    )
    if not row:
        return ok({"applied": False, "status": None})
    return ok({
        "applied": True, "status": row.status, "reject_reason": row.reject_reason,
        "company_name": row.company_name, "handled_at": row.handled_at.isoformat() if row.handled_at else None,
    })


def _dealer_price(p: Products, discount: float | None) -> float | None:
    """经销商价计算：dealer_price 优先，NULL 按零售价 × 用户折扣率（ADR-004）。"""
    if p.dealer_price is not None:
        return float(p.dealer_price)
    if p.retail_price is not None and discount is not None:
        return round(float(p.retail_price) * discount, 2)
    return float(p.retail_price) if p.retail_price is not None else None


@router.get("/products")
def dealer_products(
    series_id: int | None = None,
    kw: str | None = None,
    db: Session = Depends(get_db),
    dealer: Users = Depends(get_current_dealer),
    p: PaginationParams = Depends(),
):
    """经销商专属价产品列表（PRD 6.9.5：门户价格体系）。"""
    q = db.query(Products).filter(*_VISIBLE)
    if series_id:
        q = q.filter(Products.series_id == series_id)
    if kw:
        q = q.filter(Products.name.like(f"%{kw.strip()}%"))
    total = q.count()
    rows = q.order_by(Products.sort.asc()).offset(p.offset).limit(p.page_size).all()
    discount = float(dealer.dealer_discount) if dealer.dealer_discount is not None else None
    return ok(paginate([
        {
            "id": x.id, "name": x.name, "product_no": x.product_no,
            "series_name": x.series.name if x.series else None,
            "retail_price": float(x.retail_price) if x.retail_price is not None else None,
            "dealer_price": _dealer_price(x, discount),
            "cover_image_url": x.cover_image_url,
        }
        for x in rows
    ], total, p))


@router.post("/intents")
def create_intent(body: IntentIn, db: Session = Depends(get_db), dealer: Users = Depends(get_current_dealer)):
    """提交采购意向（PRD 6.9.5 V1.1，待报价）。"""
    row = DealerPurchaseIntents(dealer_id=dealer.id, items=body.items)
    db.add(row)
    db.commit()
    db.refresh(row)
    return ok({"id": row.id, "status": row.status})


@router.get("/intents")
def my_intents(
    db: Session = Depends(get_db),
    dealer: Users = Depends(get_current_dealer),
    p: PaginationParams = Depends(),
):
    """我的采购意向列表（PRD 6.9.5，含报价状态）。"""
    q = db.query(DealerPurchaseIntents).filter(DealerPurchaseIntents.dealer_id == dealer.id)
    total = q.count()
    rows = q.order_by(DealerPurchaseIntents.id.desc()).offset(p.offset).limit(p.page_size).all()
    return ok(paginate([
        {"id": i.id, "items": i.items or [], "status": i.status, "quote": i.quote or {},
         "contract_id": i.contract_id, "created_at": i.created_at.isoformat() if i.created_at else None}
        for i in rows
    ], total, p))


@router.get("/announcements")
def dealer_announcements(db: Session = Depends(get_db), dealer: Users = Depends(get_current_dealer)):
    """经销商公告（scope=all/dealer；指定经销商 JSON 含本店，PRD 6.9.5 V1.2）。"""
    rows = db.query(Announcements).filter(
        Announcements.is_activate.is_(True),
        Announcements.status == "published",
    ).order_by(Announcements.publish_time.desc().nullslast()).limit(20).all()
    result = []
    for a in rows:
        if a.scope == "dealer":
            dealer_ids = a.dealer_ids or []
            if dealer_ids and dealer.id not in dealer_ids:
                continue
        result.append({"id": a.id, "title": a.title, "content_html": a.content_html,
                       "publish_time": a.publish_time.isoformat() if a.publish_time else None})
    return ok(result)
