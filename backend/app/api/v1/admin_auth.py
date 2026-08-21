"""后台认证接口（PRD 7.0 / 技术文档 §6.6.1）。

实现说明：
- 账号密码登录：5 次失败锁 15 分钟（42903，内存降级实现）
- me：当前管理员 + 角色 + 权限码（前端渲染权限菜单用）
- refresh：后台 refresh token 换发新双 token（40102 失效）
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_staff
from app.core.exceptions import (
    ACCOUNT_DISABLED,
    LOGIN_FAIL_LOCKED,
    LOGIN_FAILED,
    REFRESH_TOKEN_INVALID,
    BizError,
    ok,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models import Roles, StaffUsers

router = APIRouter(prefix="/admin/auth", tags=["后台-认证"])

# 登录失败计数（内存实现，Redis 可替换：缺失自动降级，技术文档 §5.3）
_fail_map: dict[str, dict] = {}


class StaffLoginIn(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(body: StaffLoginIn, db: Session = Depends(get_db)):
    """账号密码登录；5 次失败锁 15 分钟（PRD 7.0 / 42903）。"""
    key = body.username
    rec = _fail_map.get(key)
    now = datetime.now()
    if rec and rec["count"] >= settings.LOGIN_FAIL_LIMIT and (now - rec["locked_at"]).seconds < settings.LOGIN_FAIL_LOCK_MINUTES * 60:
        remain = settings.LOGIN_FAIL_LOCK_MINUTES * 60 - (now - rec["locked_at"]).seconds
        raise BizError(LOGIN_FAIL_LOCKED, f"登录失败次数过多，请 {remain // 60 + 1} 分钟后重试")

    staff = db.query(StaffUsers).filter(StaffUsers.username == body.username).first()
    if not staff or not verify_password(body.password, staff.password_hash):
        rec = _fail_map.get(key, {"count": 0, "locked_at": now})
        rec["count"] += 1
        rec["locked_at"] = now
        _fail_map[key] = rec
        raise BizError(LOGIN_FAILED, "账号或密码错误")
    if not staff.is_activate:
        raise BizError(ACCOUNT_DISABLED, "账号被禁用")

    _fail_map.pop(key, None)
    staff.last_login_at = datetime.now(timezone.utc)
    db.commit()

    role = db.get(Roles, staff.role_id)
    return ok({
        "access_token": create_access_token(staff.id, "staff"),
        "refresh_token": create_refresh_token(staff.id, "staff"),
        "staff": {
            "id": staff.id, "username": staff.username, "name": staff.name, "nickname": staff.nickname,
            "role": {"id": role.id if role else None, "code": role.code if role else None,
                     "role_name": role.role_name if role else None,
                     "permissions": (role.permissions or []) if role else []},
        },
    })


@router.get("/me")
def me(staff: StaffUsers = Depends(get_current_staff), db: Session = Depends(get_db)):
    """当前管理员 + 角色 + 权限码（技术文档 §6.6.1）。"""
    role = db.get(Roles, staff.role_id)
    return ok({
        "id": staff.id, "username": staff.username, "name": staff.name, "nickname": staff.nickname,
        "role": {"id": role.id if role else None, "code": role.code if role else None,
                 "role_name": role.role_name if role else None,
                 "permissions": (role.permissions or []) if role else []},
    })


class RefreshIn(BaseModel):
    """后台刷新 token 入参。"""

    refresh_token: str


@router.post("/refresh")
def refresh(body: RefreshIn, db: Session = Depends(get_db)):
    """后台 refresh token 换发新双 token（40102 失效）。"""
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("domain") != "staff" or payload.get("token_type") != "refresh":
        raise BizError(REFRESH_TOKEN_INVALID, "refresh token 无效或已过期")
    staff = db.get(StaffUsers, int(payload["sub"]))
    if not staff or not staff.is_activate:
        raise BizError(REFRESH_TOKEN_INVALID, "refresh token 无效或已过期")
    return ok({
        "access_token": create_access_token(staff.id, "staff"),
        "refresh_token": create_refresh_token(staff.id, "staff"),
    })


# ---- 开发辅助：重置失败计数（后续版本并入系统管理）----
def reset_fail_map(username: str | None = None) -> None:
    if username:
        _fail_map.pop(username, None)
    else:
        _fail_map.clear()
