"""FastAPI 入口（技术文档 §2.3：CORS、路由注册、静态目录、异常处理器）。

启动：uvicorn app.main:app --reload --port 8000
Swagger：http://localhost:8000/docs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.admin_logs import op_log_middleware
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import (
    BizError,
    biz_error_handler,
    http_error_handler,
    server_error_handler,
    validation_error_handler,
)
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

app = FastAPI(
    title="TP全屋家居官网 API",
    version="0.1.0",
    description="前台展示 + 后台管理（FastAPI）· 开发技术文档 V2.1 / 数据库设计文档 V1.2.1",
    docs_url="/docs",
)

# ---- CORS（开发期前后台 5173/5174；生产由 Nginx 同源转发）----
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- 操作日志中间件（记录 /api/v1/admin/* 写操作，PRD 7.7.3）----
app.middleware("http")(op_log_middleware)

# ---- 异常处理器（统一业务响应格式）----
app.add_exception_handler(BizError, biz_error_handler)
app.add_exception_handler(StarletteHTTPException, http_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(Exception, server_error_handler)

# ---- 路由 ----
app.include_router(api_router)


@app.get("/health", tags=["系统"])
def health():
    """健康检查。"""
    return {"code": 0, "message": "ok", "data": {"env": settings.APP_ENV, "version": "0.1.0"}}


# ---- 静态文件（uploads，图片/附件，禁止脚本执行由 Nginx 侧保证）----
import os
from pathlib import Path

_upload_dir = Path(settings.UPLOAD_DIR)
_upload_dir.mkdir(parents=True, exist_ok=True)
app.mount(settings.STATIC_URL, StaticFiles(directory=str(_upload_dir)), name="static")
