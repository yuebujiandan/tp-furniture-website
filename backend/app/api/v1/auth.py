"""前台认证接口（PRD 6.7.1 / 技术文档 §6.2）。

实现说明：
- 注册：手机号+密码（密码 bcrypt 散列，40901 防重复）
- 登录：密码登录（40101 账号或密码错误）
- 验证码登录：未注册手机号自动注册（验证码登录用户 password_hash 为空）
- 刷新：refresh token（30d）换发 access+refresh 双 token（轮换，40102 失效）
- 频控：短信发送 1 分钟 1 次 / 日 5 次（42901/42902）
"""
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.exceptions import (
    LOGIN_FAILED,
    PHONE_FORMAT_ERROR,
    PHONE_REGISTERED,
    REFRESH_TOKEN_INVALID,
    VERIFY_CODE_ERROR,
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
from app.models import Users
from app.services import sms
from app.utils import verify_code as vc

router = APIRouter(prefix="/auth", tags=["前台-认证"])

PHONE_RE = re.compile(r"^1[3-9]\d{9}$")


def _validate_phone(phone: str) -> None:
    """手机号格式校验（40001）。"""
    if not PHONE_RE.match(phone):
        raise BizError(PHONE_FORMAT_ERROR, "手机号格式错误")


class RegisterIn(BaseModel):
    """注册入参。"""

    phone: str = Field(min_length=11, max_length=20)
    password: str = Field(min_length=6, max_length=50)
    nickname: str | None = None


class LoginIn(BaseModel):
    """密码登录入参。"""

    phone: str
    password: str


class SmsCodeIn(BaseModel):
    """发送验证码入参。"""

    phone: str


class LoginSmsIn(BaseModel):
    """验证码登录入参。"""

    phone: str
    code: str


class RefreshIn(BaseModel):
    """刷新 token 入参。"""

    refresh_token: str


def _user_out(user: Users) -> dict:
    """用户信息序列化（统一输出字段）。"""
    return {
        "id": user.id,
        "phone": user.phone,
        "nickname": user.nickname,
        "role": user.role,
        "avatar": user.avatar,
        "dealer_discount": float(user.dealer_discount) if user.dealer_discount else None,
    }


def _token_pair(user: Users) -> dict:
    """生成双 token 响应体（含用户信息）。"""
    return {
        "access_token": create_access_token(user.id, "user"),
        "refresh_token": create_refresh_token(user.id, "user"),
        "user": _user_out(user),
    }


@router.post("/register")
def register(body: RegisterIn, db: Session = Depends(get_db)):
    """手机号+密码注册（40901 手机号已注册）。"""
    _validate_phone(body.phone)
    if db.query(Users).filter(Users.phone == body.phone).first():
        raise BizError(PHONE_REGISTERED, "手机号已注册")
    user = Users(phone=body.phone, password_hash=hash_password(body.password), nickname=body.nickname)
    db.add(user)
    db.commit()
    db.refresh(user)
    return ok({"id": user.id, "phone": user.phone, "nickname": user.nickname})


@router.post("/sms-code")
def send_sms_code(body: SmsCodeIn, db: Session = Depends(get_db)):
    """发送短信验证码（频控：1 分钟 1 次 / 日 5 次）。

    Mock 通道下验证码打印在服务端控制台（开发联调用）。
    """
    _validate_phone(body.phone)
    allowed, err_code = vc.check_send_limit(body.phone)
    if not allowed:
        raise BizError(int(err_code), "发送过于频繁" if err_code == "42901" else "当日发送次数已达上限")
    code = sms.send_verify_code(body.phone)
    # Mock 通道下返回验证码便于开发联调；生产环境不回传明文
    return ok({"sent": True, "mock_code": code if settings.APP_ENV != "prod" else None})


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    """手机号+密码登录（40101 账号或密码错误 / 40301 账号被禁用）。"""
    _validate_phone(body.phone)
    user = db.query(Users).filter(Users.phone == body.phone).first()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise BizError(LOGIN_FAILED, "账号或密码错误")
    if not user.is_activate:
        raise BizError(40301, "账号被禁用")
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    return ok(_token_pair(user))


@router.post("/login-sms")
def login_sms(body: LoginSmsIn, db: Session = Depends(get_db)):
    """验证码登录：未注册手机号自动注册（password_hash 为空，后续可设密码）。"""
    _validate_phone(body.phone)
    if not vc.verify_code(f"sms:{body.phone}", body.code):
        raise BizError(VERIFY_CODE_ERROR, "验证码错误或过期")
    user = db.query(Users).filter(Users.phone == body.phone).first()
    if not user:
        user = Users(phone=body.phone)
        db.add(user)
        db.flush()  # 立即填充默认值（is_activate=True），避免 None 误判
    if user.is_activate is False:
        raise BizError(40301, "账号被禁用")
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return ok(_token_pair(user))


@router.post("/refresh")
def refresh(body: RefreshIn, db: Session = Depends(get_db)):
    """refresh token 换发新双 token（40102 失效）。"""
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("domain") != "user" or payload.get("token_type") != "refresh":
        raise BizError(REFRESH_TOKEN_INVALID, "refresh token 无效或已过期")
    user = db.get(Users, int(payload["sub"]))
    if not user or not user.is_activate:
        raise BizError(REFRESH_TOKEN_INVALID, "refresh token 无效或已过期")
    return ok(_token_pair(user))


@router.get("/me")
def me(user: Users = Depends(get_current_user)):
    """当前登录用户信息（前端刷新登录态恢复用）。"""
    return ok(_user_out(user))
