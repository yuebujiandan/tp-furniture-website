"""FastAPI 依赖注入：get_db / 当前用户 / 当前员工 + RBAC 权限校验（PRD 7.7.2）。

前后台双域隔离：
- 前台用户：Bearer token（domain=user）→ Users
- 后台员工：Bearer token（domain=staff）→ StaffUsers + 权限码校验
"""
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import FORBIDDEN, NOT_DEALER, UNAUTHORIZED, BizError
from app.core.security import decode_token
from app.db.session import get_db
from app.models import Roles, StaffUsers, Users

bearer_scheme = HTTPBearer(auto_error=False)


def _extract_token(cred: HTTPAuthorizationCredentials | None) -> str:
    if cred is None or not cred.credentials:
        raise BizError(UNAUTHORIZED, "未认证")
    return cred.credentials


def _decode(token: str, domain: str) -> dict:
    payload = decode_token(token)
    if not payload or payload.get("domain") != domain:
        raise BizError(UNAUTHORIZED, "token 无效或已过期")
    return payload


# ---------- 前台用户 ----------
def get_current_user(
    cred: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Users:
    payload = _decode(_extract_token(cred), "user")
    user = db.get(Users, int(payload["sub"]))
    if not user or not user.is_activate:
        raise BizError(40301, "账号被禁用")
    return user


def get_optional_user(
    cred: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Users | None:
    """可选登录：token 有效则返回用户，否则返回 None（游客场景，如留言/预约提交）。"""
    if cred is None or not cred.credentials:
        return None
    payload = decode_token(cred.credentials)
    if not payload or payload.get("domain") != "user":
        return None
    user = db.get(Users, int(payload["sub"]))
    if not user or not user.is_activate:
        return None
    return user


def get_current_dealer(user: Users = Depends(get_current_user)) -> Users:
    """经销商门户守卫（PRD 6.9.5）：非 dealer 引导认证。"""
    if user.role != "dealer":
        raise BizError(NOT_DEALER, "未认证经销商，请先完成经销商认证")
    return user


# ---------- 后台员工 ----------
def get_current_staff(
    cred: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> StaffUsers:
    payload = _decode(_extract_token(cred), "staff")
    staff = db.get(StaffUsers, int(payload["sub"]))
    if not staff or not staff.is_activate:
        raise BizError(40301, "账号被禁用")
    return staff


def require_permission(perm: str):
    """RBAC 二次校验：实时读库（权限变更即时生效，PRD 7.7.2）。"""

    def checker(staff: StaffUsers = Depends(get_current_staff), db: Session = Depends(get_db)) -> StaffUsers:
        role = db.get(Roles, staff.role_id)
        perms = (role.permissions if role and role.permissions else []) or []
        # 超级管理员放行全部
        if role and role.code == "super_admin":
            return staff
        if perm not in perms:
            raise BizError(FORBIDDEN, "无权限")
        return staff

    return checker
