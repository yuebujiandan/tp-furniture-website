"""后台经销商审核接口（技术文档 §6.6.9 / PRD 6.9.5 V1.3 + 7.3）。

实现说明：
- GET /admin/dealer-applications：认证申请列表（状态筛选 + 分页）；
- PUT /admin/dealer-applications/{id}/review：审核（approved → users.role='dealer' + dealer_verified_at + dealer_discount；
  rejected → 记录驳回原因，用户可重新申请）；
- 权限：dealer:view / dealer:audit。
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.exceptions import CONFLICT, NOT_FOUND, BizError, ok
from app.db.session import get_db
from app.models import DealerApplications, Users
from app.utils.pagination import PaginationParams, paginate

router = APIRouter(prefix="/admin", tags=["后台-经销商审核"])

view_perm = require_permission("dealer:view")
audit_perm = require_permission("dealer:audit")


def _appl_out(a: DealerApplications, db: Session) -> dict:
    user = db.get(Users, a.user_id) if a.user_id else None
    return {
        "id": a.id, "user_id": a.user_id, "user_phone": user.phone if user else None,
        "company_name": a.company_name, "credit_code": a.credit_code,
        "license_img": a.license_img, "contact": a.contact, "phone": a.phone,
        "region": a.region, "reason": a.reason, "status": a.status,
        "reject_reason": a.reject_reason,
        "handled_at": a.handled_at.isoformat() if a.handled_at else None,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


@router.get("/dealer-applications", dependencies=[Depends(view_perm)])
def list_applications(
    status: str | None = None,
    db: Session = Depends(get_db),
    p: PaginationParams = Depends(),
):
    """认证申请列表（待审核优先）。"""
    q = db.query(DealerApplications)
    if status:
        q = q.filter(DealerApplications.status == status)
    total = q.count()
    rows = q.order_by(
        DealerApplications.status.asc(),
        DealerApplications.id.desc(),
    ).offset(p.offset).limit(p.page_size).all()
    # 待审核优先（pending 排前）
    rows.sort(key=lambda x: 0 if x.status == "pending" else 1)
    return ok(paginate([_appl_out(a, db) for a in rows], total, p))


class ReviewIn(BaseModel):
    """审核入参（PRD 6.9.5 V1.3）。"""

    action: str                           # approved / rejected
    dealer_discount: float | None = Field(default=None, ge=0, le=1, description="默认折扣率 0-1")
    reject_reason: str | None = None


@router.put("/dealer-applications/{appl_id}/review", dependencies=[Depends(audit_perm)])
def review_application(appl_id: int, body: ReviewIn, db: Session = Depends(get_db)):
    """审核：通过 → 用户升级为经销商（role+verified_at+discount）；驳回 → 记录原因可重新申请。"""
    appl = db.get(DealerApplications, appl_id)
    if not appl:
        raise BizError(NOT_FOUND, "申请不存在")
    if appl.status != "pending":
        raise BizError(CONFLICT, "该申请已审核，请勿重复操作")

    user = db.get(Users, appl.user_id) if appl.user_id else None
    if not user:
        raise BizError(NOT_FOUND, "申请用户不存在")

    if body.action == "approved":
        # 升级为经销商：角色 + 认证时间 + 默认折扣率（PRD 6.9.5）
        user.role = "dealer"
        user.dealer_verified_at = datetime.now(timezone.utc)
        user.dealer_discount = body.dealer_discount if body.dealer_discount is not None else 0.85
        appl.status = "approved"
    elif body.action == "rejected":
        appl.status = "rejected"
        appl.reject_reason = body.reject_reason
    else:
        raise BizError(40000, "action 仅支持 approved/rejected")

    appl.handled_at = datetime.now(timezone.utc)
    db.commit()
    return ok({"id": appl.id, "status": appl.status, "user_role": user.role})
