"""后台用户管理接口（技术文档 §6.6.4 / PRD 7.5）。

实现说明：
- GET /admin/users：用户列表（角色/关键词/日期筛选 + 分页）；
- PUT /admin/users/{id}/status：禁用/启用（40301 前台登录拦截）；
- 经销商认证审核在 P4 经销商门户模块交付（dealer_applications）。
"""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.exceptions import NOT_FOUND, BizError, ok
from app.db.session import get_db
from app.models import Users
from app.utils.pagination import PaginationParams, paginate

router = APIRouter(prefix="/admin/users", tags=["后台-用户管理"])

view_perm = require_permission("user:view")
edit_perm = require_permission("user:edit")


def _user_out(u: Users) -> dict:
    return {
        "id": u.id, "phone": u.phone, "nickname": u.nickname, "avatar": u.avatar,
        "role": u.role, "is_activate": u.is_activate,
        "dealer_verified_at": u.dealer_verified_at.isoformat() if u.dealer_verified_at else None,
        "dealer_discount": float(u.dealer_discount) if u.dealer_discount is not None else None,
        "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


@router.get("", dependencies=[Depends(view_perm)])
def list_users(
    role: str | None = Query(None, description="user/dealer"),
    kw: str | None = Query(None, description="关键词（手机号/昵称）"),
    is_activate: bool | None = Query(None, description="启用状态"),
    db: Session = Depends(get_db),
    p: PaginationParams = Depends(),
):
    """用户列表（筛选 + 分页，PRD 7.5.1）。"""
    q = db.query(Users)
    if role:
        q = q.filter(Users.role == role)
    if is_activate is not None:
        q = q.filter(Users.is_activate.is_(is_activate))
    if kw:
        like = f"%{kw.strip()}%"
        q = q.filter(or_(Users.phone.like(like), Users.nickname.like(like)))
    total = q.count()
    rows = q.order_by(Users.id.desc()).offset(p.offset).limit(p.page_size).all()
    return ok(paginate([_user_out(u) for u in rows], total, p))


class StatusIn(BaseModel):
    is_activate: bool


@router.put("/{user_id}/status", dependencies=[Depends(edit_perm)])
def set_user_status(user_id: int, body: StatusIn, db: Session = Depends(get_db)):
    """禁用/启用用户（PRD 7.5.2：禁用后前台登录返回 40301）。"""
    u = db.get(Users, user_id)
    if not u:
        raise BizError(NOT_FOUND, "用户不存在")
    u.is_activate = body.is_activate
    db.commit()
    return ok({"id": u.id, "is_activate": u.is_activate})
