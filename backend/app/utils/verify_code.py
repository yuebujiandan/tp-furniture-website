"""验证码服务（技术文档 §5.2.4：短信防刷 1 分钟 1 次/手机号、日 5 次上限）。

实现说明：
- 本模块负责验证码的【生成 / 存储 / 校验 / 发送频控】，存储默认用进程内存（dict）；
  若配置了 REDIS_URL 则自动切换 Redis 存储（双环境降级，缺失自动降级到内存）。
- 验证码有效期 5 分钟；错误 5 次后作废（防爆破）。
"""
import random
import time
from typing import Optional

from app.core.config import settings

# 进程内存存储（无 Redis 时的降级实现）
# 结构：{ key: {"code": str, "expire_at": float, "tries": int, "send_at": float} }
_MEM_STORE: dict[str, dict] = {}

# 发送频控（1 分钟 1 次 / 日 5 次，PRD 9.2）
_SEND_RECORDS: dict[str, list[float]] = {}


def _get_redis():
    """惰性获取 Redis 客户端；未配置 REDIS_URL 返回 None（走内存降级）。"""
    if not settings.REDIS_URL:
        return None
    try:
        import redis  # 延迟导入：未安装 redis 包时走内存降级

        return redis.from_url(settings.REDIS_URL, decode_responses=True)
    except Exception:
        return None


def _store() -> Optional["object"]:
    """返回统一存储对象（redis 客户端或内存 dict 的包装）。"""
    r = _get_redis()
    return r


def generate_code(length: int = 6) -> str:
    """生成 length 位纯数字验证码（短信场景，兼容手机键盘输入）。"""
    return "".join(str(random.randint(0, 9)) for _ in range(length))


def save_code(key: str, code: str, ttl_seconds: int = 300) -> None:
    """保存验证码，key 建议为业务前缀+手机号（如 sms:13800138000）。"""
    r = _get_redis()
    if r:
        r.setex(f"vc:{key}", ttl_seconds, code)
        r.delete(f"vc_tries:{key}")  # 新码重置错误计数
    else:
        _MEM_STORE[key] = {"code": code, "expire_at": time.time() + ttl_seconds, "tries": 0}


def verify_code(key: str, code: str) -> bool:
    """校验验证码：正确则删除（一次性）；错误累计 5 次作废。"""
    r = _get_redis()
    if r:
        stored = r.get(f"vc:{key}")
        if stored is None:
            return False
        tries_key = f"vc_tries:{key}"
        tries = int(r.get(tries_key) or 0)
        if tries >= 5:
            r.delete(f"vc:{key}")
            return False
        if stored == code:
            r.delete(f"vc:{key}")
            return True
        r.incr(tries_key)
        r.expire(tries_key, 300)
        return False

    rec = _MEM_STORE.get(key)
    if not rec:
        return False
    if rec["tries"] >= 5:
        _MEM_STORE.pop(key, None)
        return False
    if rec["expire_at"] < time.time():
        _MEM_STORE.pop(key, None)
        return False
    if rec["code"] == code:
        _MEM_STORE.pop(key, None)
        return True
    rec["tries"] += 1
    return False


def check_send_limit(phone: str) -> tuple[bool, str | None]:
    """发送频控：1 分钟 1 次 / 日 5 次（42901 / 42902）。返回 (是否允许, 错误码)。"""
    now = time.time()
    records = _SEND_RECORDS.get(phone, [])
    # 清理过期记录（保留近 24h）
    records = [t for t in records if now - t < 86400]
    if len(records) >= settings.SMS_DAILY_LIMIT:
        return False, "42902"
    if records and now - records[-1] < 60:
        return False, "42901"
    records.append(now)
    _SEND_RECORDS[phone] = records
    return True, None
