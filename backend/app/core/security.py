"""安全模块：密码散列 + JWT 双 token（PRD 9.2 / 技术文档 §2.2）。

- 密码：bcrypt（cost=12）
- JWT：access ≤24h + refresh 30d，前后台双域隔离（sub 前缀区分 user/staff）
"""
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

TokenDomain = Literal["user", "staff"]


# ---------- 密码 ----------
def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        return False


# ---------- JWT ----------
def _create_token(subject: str, domain: TokenDomain, expires_delta: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "domain": domain,
        "iat": now,
        "exp": now + expires_delta,
        "token_type": "access" if expires_delta.days == 0 else "refresh",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: int, domain: TokenDomain = "user") -> str:
    return _create_token(str(user_id), domain, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))


def create_refresh_token(user_id: int, domain: TokenDomain = "user") -> str:
    return _create_token(str(user_id), domain, timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))


def decode_token(token: str) -> Optional[dict]:
    """解码并校验签名/过期；失败返回 None。"""
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None
