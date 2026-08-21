"""前台用户中心接口（PRD 6.7.2 / 技术文档 §6.2.3）。

实现说明：
- GET/PUT /me：个人资料（昵称/头像）；PUT /me/password：修改密码（校验旧密码）；
- GET /me/appointments：我的预约（+取消）；GET /me/contracts：我的签单；
- GET /me/favorites：我的收藏（复用 favorites 表）；GET /me/messages：我的留言；
- 均为登录态接口（domain=user token）。
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.exceptions import NOT_FOUND, PASSWORD_ERROR, BizError, ok
from app.db.session import get_db
from app.models import Appointments, Contracts, Favorites, Messages, Products, Users
from app.core.security import hash_password, verify_password
from app.utils.pagination import PaginationParams, paginate

router = APIRouter(prefix="/me", tags=["前台-用户中心"])


class ProfileIn(BaseModel):
    """个人资料更新入参。"""

    nickname: str | None = Field(default=None, max_length=50)
    avatar: str | None = Field(default=None, max_length=255)


class PasswordIn(BaseModel):
    """修改密码入参。"""

    old_password: str
    new_password: str = Field(min_length=6, max_length=50)


@router.put("/")
def update_profile(body: ProfileIn, db: Session = Depends(get_db), user: Users = Depends(get_current_user)):
    """更新个人资料（昵称/头像，PRD 6.7.2）。"""
    if body.nickname is not None:
        user.nickname = body.nickname
    if body.avatar is not None:
        user.avatar = body.avatar
    db.commit()
    return ok({"id": user.id, "nickname": user.nickname, "avatar": user.avatar})


@router.put("/password")
def change_password(body: PasswordIn, db: Session = Depends(get_db), user: Users = Depends(get_current_user)):
    """修改密码（40003 旧密码错误；验证码注册用户无密码需先设置，PRD 6.7.2）。"""
    # 验证码登录注册的用户 password_hash 为空 → 直接设置新密码
    if user.password_hash and not verify_password(body.old_password, user.password_hash):
        raise BizError(PASSWORD_ERROR, "旧密码错误")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return ok({"updated": True})


@router.get("/appointments")
def my_appointments(
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
    p: PaginationParams = Depends(),
):
    """我的预约列表（倒序，PRD 6.8.4）。"""
    q = db.query(Appointments).filter(Appointments.user_id == user.id)
    total = q.count()
    rows = q.order_by(Appointments.id.desc()).offset(p.offset).limit(p.page_size).all()
    return ok(paginate([
        {
            "id": a.id, "type": a.type, "status": a.status,
            "expect_date": a.expect_date.isoformat(), "expect_time": a.expect_time,
            "city": a.city, "store_id": a.store_id, "product_id": a.product_id,
            "case_id": a.case_id, "remark": a.remark, "admin_note": a.admin_note,
            "contract_id": a.contract_id, "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in rows
    ], total, p))


@router.put("/appointments/{appointment_id}/cancel")
def cancel_my_appointment(appointment_id: int, db: Session = Depends(get_db), user: Users = Depends(get_current_user)):
    """取消我的预约（仅 pending/confirmed 可取消，PRD 6.8.4）。"""
    row = db.query(Appointments).filter(Appointments.id == appointment_id, Appointments.user_id == user.id).first()
    if not row:
        raise BizError(NOT_FOUND, "预约不存在")
    if row.status not in ("pending", "confirmed"):
        raise BizError(40000, "当前状态不可取消")
    row.status = "cancelled"
    db.commit()
    return ok({"id": row.id, "status": row.status})


@router.get("/contracts")
def my_contracts(
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
    p: PaginationParams = Depends(),
):
    """我的签单列表（PRD 6.8.5：用户可查看自己的签单）。"""
    q = db.query(Contracts).filter(Contracts.user_id == user.id)
    total = q.count()
    rows = q.order_by(Contracts.id.desc()).offset(p.offset).limit(p.page_size).all()
    return ok(paginate([
        {
            "id": c.id, "contract_no": c.contract_no, "status": c.status, "source": c.source,
            "total_amount": float(c.total_amount) if c.total_amount is not None else None,
            "deposit": float(c.deposit) if c.deposit is not None else None,
            "delivery_date": c.delivery_date.isoformat() if c.delivery_date else None,
            "items": c.items or [], "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in rows
    ], total, p))


@router.get("/contracts/{contract_id}")
def my_contract_detail(contract_id: int, db: Session = Depends(get_db), user: Users = Depends(get_current_user)):
    """我的签单详情（含明细与状态流转日志，PRD 6.8.5）。"""
    c = db.query(Contracts).filter(Contracts.id == contract_id, Contracts.user_id == user.id).first()
    if not c:
        raise BizError(NOT_FOUND, "签单不存在")
    from app.models import ContractLogs

    logs = db.query(ContractLogs).filter(ContractLogs.contract_id == c.id).order_by(ContractLogs.id.desc()).limit(20).all()
    return ok({
        "id": c.id, "contract_no": c.contract_no, "status": c.status, "source": c.source,
        "customer_name": c.customer_name, "customer_phone": c.customer_phone,
        "total_amount": float(c.total_amount) if c.total_amount is not None else None,
        "deposit": float(c.deposit) if c.deposit is not None else None,
        "payment_plan": c.payment_plan or {}, "delivery_date": c.delivery_date.isoformat() if c.delivery_date else None,
        "items": c.items or [], "remark": c.remark,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "logs": [{"action": x.action, "detail": x.detail, "created_at": x.created_at.isoformat() if x.created_at else None} for x in logs],
    })


@router.get("/favorites")
def my_favorites(
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
    p: PaginationParams = Depends(),
):
    """我的收藏列表（PRD 6.7.2）。"""
    q = (
        db.query(Favorites)
        .join(Products, Favorites.product_id == Products.id)
        .filter(Favorites.user_id == user.id, Products.is_deleted.is_(False))
    )
    total = q.count()
    rows = q.order_by(Favorites.id.desc()).offset(p.offset).limit(p.page_size).all()
    return ok(paginate([
        {
            "id": f.product_id, "name": f.product.name,
            "cover_image_url": f.product.cover_image_url,
            "retail_price": float(f.product.retail_price) if f.product.retail_price is not None else None,
            "series_name": f.product.series.name if f.product.series else None,
        }
        for f in rows
    ], total, p))


@router.get("/messages")
def my_messages(
    db: Session = Depends(get_db),
    user: Users = Depends(get_current_user),
    p: PaginationParams = Depends(),
):
    """我的留言/咨询（P3：登录用户提交的留言回填 user_id 后可在此查看）。"""
    q = db.query(Messages).filter(Messages.user_id == user.id)
    total = q.count()
    rows = q.order_by(Messages.id.desc()).offset(p.offset).limit(p.page_size).all()
    return ok(paginate([
        {
            "id": m.id, "type": m.type, "source": m.source, "content": m.content,
            "status": m.status, "reply": m.reply,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "handled_at": m.handled_at.isoformat() if m.handled_at else None,
        }
        for m in rows
    ], total, p))
