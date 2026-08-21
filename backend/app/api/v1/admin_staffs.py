"""后台员工管理接口（技术文档 §6.6.11 / PRD 7.7）。

实现说明：
- GET /admin/staffs：员工列表（角色/关键词筛选 + 分页）；
- POST /admin/staffs：新建员工（username 唯一；密码 bcrypt）；
- PUT /admin/staffs/{id}：编辑（昵称/姓名/手机/邮箱/部门/角色/启用）；
- PUT /admin/staffs/{id}/password：重置密码；
- 权限：system:admin。
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.exceptions import CONFLICT, NOT_FOUND, BizError, ok
from app.core.security import hash_password
from app.db.session import get_db
from app.models import Departments, Roles, StaffUsers
from app.utils.pagination import PaginationParams, paginate

router = APIRouter(prefix="/admin/staffs", tags=["后台-员工管理"])

admin_perm = require_permission("system:admin")


def _staff_out(s: StaffUsers, db: Session) -> dict:
    role = db.get(Roles, s.role_id) if s.role_id else None
    dept = db.get(Departments, s.department_id) if s.department_id else None
    return {
        "id": s.id, "username": s.username, "name": s.name, "nickname": s.nickname,
        "phone": s.phone, "email": s.email, "gender": s.gender, "position": s.position,
        "department_id": s.department_id, "department_name": dept.department_name if dept else None,
        "role_id": s.role_id, "role_name": role.role_name if role else None,
        "role_code": role.code if role else None,
        "is_activate": s.is_activate, "last_login_at": s.last_login_at.isoformat() if s.last_login_at else None,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


@router.get("", dependencies=[Depends(admin_perm)])
def list_staffs(
    role_id: int | None = None, kw: str | None = None,
    db: Session = Depends(get_db), p: PaginationParams = Depends(),
):
    """员工列表（角色/关键词筛选 + 分页，PRD 7.7.1）。"""
    q = db.query(StaffUsers)
    if role_id:
        q = q.filter(StaffUsers.role_id == role_id)
    if kw:
        like = f"%{kw.strip()}%"
        q = q.filter(or_(StaffUsers.username.like(like), StaffUsers.name.like(like), StaffUsers.nickname.like(like)))
    total = q.count()
    rows = q.order_by(StaffUsers.id.desc()).offset(p.offset).limit(p.page_size).all()
    return ok(paginate([_staff_out(s, db) for s in rows], total, p))


class StaffIn(BaseModel):
    """员工新增/编辑入参。"""

    username: str | None = Field(default=None, min_length=3, max_length=50)
    password: str | None = Field(default=None, min_length=6, max_length=50, description="新建必填，编辑留空不改")
    name: str | None = None
    nickname: str | None = None
    phone: str | None = None
    email: str | None = None
    gender: str | None = None
    position: str | None = None
    department_id: int | None = None
    role_id: int | None = None
    is_activate: bool = True


@router.post("", dependencies=[Depends(admin_perm)])
def create_staff(body: StaffIn, db: Session = Depends(get_db)):
    """新建员工（username 唯一，40900 冲突；密码必填）。"""
    if not body.username or not body.password:
        raise BizError(40000, "username 与 password 必填")
    if db.query(StaffUsers).filter(StaffUsers.username == body.username).first():
        raise BizError(CONFLICT, "登录名已存在")
    if body.role_id and not db.get(Roles, body.role_id):
        raise BizError(NOT_FOUND, "角色不存在")
    row = StaffUsers(
        username=body.username,
        password_hash=hash_password(body.password),
        name=body.name, nickname=body.nickname, phone=body.phone, email=body.email,
        gender=body.gender, position=body.position,
        department_id=body.department_id, role_id=body.role_id, is_activate=body.is_activate,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return ok({"id": row.id})


@router.get("/{staff_id}", dependencies=[Depends(admin_perm)])
def get_staff(staff_id: int, db: Session = Depends(get_db)):
    """员工详情。"""
    s = db.get(StaffUsers, staff_id)
    if not s:
        raise BizError(NOT_FOUND, "员工不存在")
    return ok(_staff_out(s, db))


@router.put("/{staff_id}", dependencies=[Depends(admin_perm)])
def update_staff(staff_id: int, body: StaffIn, db: Session = Depends(get_db)):
    """编辑员工（密码留空不修改）。"""
    s = db.get(StaffUsers, staff_id)
    if not s:
        raise BizError(NOT_FOUND, "员工不存在")
    if body.username and body.username != s.username:
        if db.query(StaffUsers).filter(StaffUsers.username == body.username).first():
            raise BizError(CONFLICT, "登录名已存在")
        s.username = body.username
    for k in ("name", "nickname", "phone", "email", "gender", "position", "department_id", "role_id", "is_activate"):
        v = getattr(body, k)
        if v is not None:
            setattr(s, k, v)
    if body.password:
        s.password_hash = hash_password(body.password)
    db.commit()
    return ok({"id": s.id})


@router.put("/{staff_id}/password", dependencies=[Depends(admin_perm)])
def reset_password(staff_id: int, body: StaffIn, db: Session = Depends(get_db)):
    """重置密码（PRD 7.7.1）。"""
    s = db.get(StaffUsers, staff_id)
    if not s:
        raise BizError(NOT_FOUND, "员工不存在")
    if not body.password:
        raise BizError(40000, "新密码必填")
    s.password_hash = hash_password(body.password)
    db.commit()
    return ok({"updated": True})
