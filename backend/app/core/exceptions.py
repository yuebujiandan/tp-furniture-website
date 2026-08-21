"""业务异常与统一错误码（技术文档 附录 B 错误码总表）。

响应格式：{"code": 非0, "message": "...", "data": null}
"""
from typing import Any

from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class BizError(Exception):
    """业务异常：携带业务 code + 可读 message。"""

    def __init__(self, code: int = 40000, message: str = "参数校验失败", data: Any = None):
        self.code = code
        self.message = message
        self.data = data
        super().__init__(message)


# ---- 常用错误码常量（对齐附录 B）----
SUCCESS = 0
PARAM_ERROR = 40000
PHONE_FORMAT_ERROR = 40001
VERIFY_CODE_ERROR = 40002
PASSWORD_ERROR = 40003
UNAUTHORIZED = 40100
LOGIN_FAILED = 40101
REFRESH_TOKEN_INVALID = 40102
FORBIDDEN = 40300
ACCOUNT_DISABLED = 40301
NOT_DEALER = 40302
NOT_FOUND = 40400
PRODUCT_NOT_FOUND = 40401
CONFLICT = 40900
PHONE_REGISTERED = 40901
ALREADY_FAVORITED = 40902
ALREADY_APPLIED = 40903
CONTRACT_NO_CONFLICT = 40904
INVALID_STATUS_TRANSITION = 42200
SMS_TOO_FREQUENT = 42901
SMS_DAILY_LIMIT = 42902
LOGIN_FAIL_LOCKED = 42903
SERVER_ERROR = 50000


def ok(data: Any = None, message: str = "success") -> dict:
    return {"code": SUCCESS, "message": message, "data": data}


def fail(code: int = PARAM_ERROR, message: str = "参数校验失败", data: Any = None) -> dict:
    return {"code": code, "message": message, "data": data}


# ---- FastAPI 异常处理器 ----
async def biz_error_handler(request: Request, exc: BizError) -> JSONResponse:
    return JSONResponse(status_code=200, content=fail(exc.code, exc.message, exc.data))


async def http_error_handler(request: Request, exc: HTTPException) -> JSONResponse:
    # 将 HTTPException 映射为业务响应（401/403/404 → 业务 code）
    code_map = {401: UNAUTHORIZED, 403: FORBIDDEN, 404: NOT_FOUND, 422: PARAM_ERROR}
    return JSONResponse(status_code=exc.status_code, content=fail(code_map.get(exc.status_code, exc.status_code), str(exc.detail)))


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = exc.errors()
    first = errors[0] if errors else {}
    loc = ".".join(str(x) for x in first.get("loc", []) if x != "body")
    msg = first.get("msg", "参数校验失败")
    return JSONResponse(status_code=200, content=fail(PARAM_ERROR, f"{loc}: {msg}" if loc else msg))


async def server_error_handler(request: Request, exc: Exception) -> JSONResponse:
    # 兜底：不泄露堆栈（PRD 9.2）
    return JSONResponse(status_code=500, content=fail(SERVER_ERROR, "服务器内部错误"))
