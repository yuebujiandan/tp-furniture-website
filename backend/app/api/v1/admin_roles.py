"""后台角色管理接口（技术文档 §6.6.12 / PRD 7.7.2）。

实现说明：
- GET /admin/roles：角色列表（含权限码）；GET /admin/roles/permissions：全部权限码清单（附录 C-1）；
- POST/PUT/DELETE：角色 CRUD（删除校验引用，超管角色禁删）；
- 权限变更即时生效（require_permission 实时读库，PRD 7.7.2）。
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.exceptions import CONFLICT, NOT_FOUND, BizError, ok
from app.db.session import get_db
from app.models import Roles, StaffUsers

router = APIRouter(prefix="/admin/roles", tags=["后台-角色管理"])

role_perm = require_permission("system:role")

# 全部权限码清单（附录 C-1，供权限矩阵编辑器勾选）
PERMISSION_CATALOG: list[dict] = [
    {"group": "看板", "perms": ["dashboard:view"]},
    {"group": "产品", "perms": ["product:view", "product:edit"]},
    {"group": "内容", "perms": ["content:view", "content:edit"]},
    {"group": "招聘", "perms": ["recruit:view", "recruit:edit", "resume:view", "resume:status"]},
    {"group": "用户", "perms": ["user:view", "user:edit", "dealer:view", "dealer:audit", "message:handle"]},
    {"group": "预约签单", "perms": ["appointment:view", "appointment:handle", "contract:view", "contract:edit", "contract:status", "contract:export"]},
    {"group": "B 端", "perms": ["biz:view", "biz:handle"]},
    {"group": "统计", "perms": ["stat:view"]},
    {"group": "系统", "perms": ["system:admin", "system:role", "system:config", "log:view"]},
]


class RoleIn(BaseModel):
    role_name: str = Field(min_length=1, max_length=50)
    description: str | None = None
    permissions: list[str] = Field(default_factory=list)


@router.get("", dependencies=[Depends(role_perm)])
def list_roles(db: Session = Depends(get_db)):
    """角色列表（含权限码，PRD 7.7.2）。"""
    rows = db.query(Roles).order_by(Roles.id.asc()).all()
    return ok([
        {"id": r.id, "role_name": r.role_name, "code": r.code, "description": r.description,
         "permissions": r.permissions or []}
        for r in rows
    ])


@router.get("/permissions", dependencies=[Depends(role_perm)])
def permission_catalog():
    """权限码清单（附录 C-1，权限矩阵编辑器数据源）。"""
    return ok(PERMISSION_CATALOG)


@router.post("", dependencies=[Depends(role_perm)])
def create_role(body: RoleIn, db: Session = Depends(get_db)):
    """新建角色（role_name 唯一）。"""
    if db.query(Roles).filter(Roles.role_name == body.role_name).first():
        raise BizError(CONFLICT, "角色名称已存在")
    # 生成唯一 code：拼音不可靠，用 role_{时间戳后 4 位}
    import time

    code = f"custom_{int(time.time()) % 100000}"
    while db.query(Roles).filter(Roles.code == code).first():
        code = f"custom_{int(time.time()) % 100000}_{code[-1]}"
    row = Roles(role_name=body.role_name, code=code, description=body.description, permissions=body.permissions)
    db.add(row)
    db.commit()
    db.refresh(row)
    return ok({"id": row.id, "code": row.code})


@router.put("/{role_id}", dependencies=[Depends(role_perm)])
def update_role(role_id: int, body: RoleIn, db: Session = Depends(get_db)):
    """编辑角色（名称/描述/权限码；权限变更即时生效，PRD 7.7.2）。"""
    row = db.get(Roles, role_id)
    if not row:
        raise BizError(NOT_FOUND, "角色不存在")
    dup = db.query(Roles).filter(Roles.role_name == body.role_name, Roles.id != role_id).first()
    if dup:
        raise BizError(CONFLICT, "角色名称已存在")
    row.role_name = body.role_name
    row.description = body.description
    row.permissions = body.permissions
    db.commit()
    return ok({"id": row.id})


@router.delete("/{role_id}", dependencies=[Depends(role_perm)])
def delete_role(role_id: int, db: Session = Depends(get_db)):
    """删除角色（有员工引用或为超管时禁止，PRD 7.7.2）。"""
    row = db.get(Roles, role_id)
    if not row:
        raise BizError(NOT_FOUND, "角色不存在")
    if row.code == "super_admin":
        raise BizError(CONFLICT, "超级管理员角色不可删除")
    if db.query(StaffUsers).filter(StaffUsers.role_id == role_id).first():
        raise BizError(CONFLICT, "该角色下存在员工，请先调整员工角色")
    db.delete(row)
    db.commit()
    return ok({"deleted": True})
