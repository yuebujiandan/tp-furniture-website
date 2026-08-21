"""后台 B 端业务管理接口（技术文档 §6.6.9 / PRD 7.3）。

实现说明：
- 加盟申请 / 批量询价 / 工程定制：列表（状态筛选 + 关键词 + 分页）+ 状态流转 + 备注/报价；
- 询价报价：quote JSON（PRD 7.3.3 报价流程）；加盟处理：contacted→negotiating→signed/rejected；
- 工程定制：designing→quoting→signed/closed；
- 权限：biz:view / biz:handle（销售客服及以上）。
"""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.exceptions import NOT_FOUND, BizError, ok
from app.db.session import get_db
from app.models import EngineeringRequests, FranchiseApplications, Inquiries
from app.utils.pagination import PaginationParams, paginate

router = APIRouter(prefix="/admin/biz", tags=["后台-B端业务"])

view_perm = require_permission("biz:view")
handle_perm = require_permission("biz:handle")


# ---------- 加盟申请 ----------
def _franchise_out(f: FranchiseApplications) -> dict:
    return {
        "id": f.id, "name": f.name, "phone": f.phone, "city": f.city,
        "invest_amount": f.invest_amount, "area": f.area, "current_status": f.current_status,
        "remark": f.remark, "status": f.status, "reject_reason": f.reject_reason,
        "created_at": f.created_at.isoformat() if f.created_at else None,
    }


@router.get("/franchise", dependencies=[Depends(view_perm)])
def list_franchise(
    status: str | None = None, kw: str | None = None,
    db: Session = Depends(get_db), p: PaginationParams = Depends(),
):
    """加盟申请列表。"""
    q = db.query(FranchiseApplications)
    if status:
        q = q.filter(FranchiseApplications.status == status)
    if kw:
        like = f"%{kw.strip()}%"
        q = q.filter(or_(FranchiseApplications.name.like(like), FranchiseApplications.phone.like(like), FranchiseApplications.city.like(like)))
    total = q.count()
    rows = q.order_by(FranchiseApplications.id.desc()).offset(p.offset).limit(p.page_size).all()
    return ok(paginate([_franchise_out(x) for x in rows], total, p))


class FranchiseStatusIn(BaseModel):
    status: str                           # contacted/negotiating/signed/rejected
    reject_reason: str | None = None


@router.put("/franchise/{item_id}/status", dependencies=[Depends(handle_perm)])
def set_franchise_status(item_id: int, body: FranchiseStatusIn, db: Session = Depends(get_db)):
    """加盟申请状态流转（PRD 7.3.2：contacted→negotiating→signed / rejected）。"""
    row = db.get(FranchiseApplications, item_id)
    if not row:
        raise BizError(NOT_FOUND, "申请不存在")
    if body.status not in ("contacted", "negotiating", "signed", "rejected"):
        raise BizError(40000, "状态不合法")
    row.status = body.status
    row.reject_reason = body.reject_reason if body.status == "rejected" else None
    db.commit()
    return ok({"id": row.id, "status": row.status})


# ---------- 批量询价 ----------
def _inquiry_out(i: Inquiries) -> dict:
    return {
        "id": i.id, "company": i.company, "contact": i.contact, "phone": i.phone,
        "email": i.email, "purpose": i.purpose, "items": i.items or [],
        "expect_time": i.expect_time, "status": i.status, "quote": i.quote or {},
        "created_at": i.created_at.isoformat() if i.created_at else None,
    }


@router.get("/inquiries", dependencies=[Depends(view_perm)])
def list_inquiries(
    status: str | None = None, kw: str | None = None,
    db: Session = Depends(get_db), p: PaginationParams = Depends(),
):
    """批量询价列表。"""
    q = db.query(Inquiries)
    if status:
        q = q.filter(Inquiries.status == status)
    if kw:
        like = f"%{kw.strip()}%"
        q = q.filter(or_(Inquiries.company.like(like), Inquiries.contact.like(like), Inquiries.phone.like(like)))
    total = q.count()
    rows = q.order_by(Inquiries.id.desc()).offset(p.offset).limit(p.page_size).all()
    return ok(paginate([_inquiry_out(x) for x in rows], total, p))


class InquiryQuoteIn(BaseModel):
    """询价报价/状态入参（PRD 7.3.3 报价流程）。"""

    status: str                           # quoted/accepted/closed
    quote: dict | None = None             # {items: [{name, price, note}], total, valid_until}


@router.put("/inquiries/{item_id}/quote", dependencies=[Depends(handle_perm)])
def quote_inquiry(item_id: int, body: InquiryQuoteIn, db: Session = Depends(get_db)):
    """询价报价/状态流转（pending→quoted→accepted/closed，PRD 7.3.3）。"""
    row = db.get(Inquiries, item_id)
    if not row:
        raise BizError(NOT_FOUND, "询价不存在")
    if body.status not in ("quoted", "accepted", "closed"):
        raise BizError(40000, "状态不合法")
    row.status = body.status
    if body.quote is not None:
        row.quote = body.quote
    db.commit()
    return ok({"id": row.id, "status": row.status})


# ---------- 工程定制 ----------
def _eng_out(e: EngineeringRequests) -> dict:
    return {
        "id": e.id, "company": e.company, "contact": e.contact, "phone": e.phone,
        "project_type": e.project_type, "location": e.location, "scale": e.scale,
        "deadline": e.deadline, "description": e.description, "status": e.status,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }


@router.get("/engineering", dependencies=[Depends(view_perm)])
def list_engineering(
    status: str | None = None, kw: str | None = None,
    db: Session = Depends(get_db), p: PaginationParams = Depends(),
):
    """工程定制需求列表。"""
    q = db.query(EngineeringRequests)
    if status:
        q = q.filter(EngineeringRequests.status == status)
    if kw:
        like = f"%{kw.strip()}%"
        q = q.filter(or_(EngineeringRequests.company.like(like), EngineeringRequests.contact.like(like)))
    total = q.count()
    rows = q.order_by(EngineeringRequests.id.desc()).offset(p.offset).limit(p.page_size).all()
    return ok(paginate([_eng_out(x) for x in rows], total, p))


class EngStatusIn(BaseModel):
    status: str                           # designing/quoting/signed/closed


@router.put("/engineering/{item_id}/status", dependencies=[Depends(handle_perm)])
def set_eng_status(item_id: int, body: EngStatusIn, db: Session = Depends(get_db)):
    """工程定制状态流转（pending→designing→quoting→signed/closed，PRD 7.3.4）。"""
    row = db.get(EngineeringRequests, item_id)
    if not row:
        raise BizError(NOT_FOUND, "需求不存在")
    if body.status not in ("designing", "quoting", "signed", "closed"):
        raise BizError(40000, "状态不合法")
    row.status = body.status
    db.commit()
    return ok({"id": row.id, "status": row.status})
