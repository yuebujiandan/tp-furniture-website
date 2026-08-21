"""后台操作日志接口 + 日志中间件（技术文档 §6.6.13 / PRD 7.7.3）。

实现说明：
- GET /admin/logs：操作日志列表（模块/操作人/关键词筛选 + 分页）；
- 中间件：记录 /api/v1/admin/* 的 POST/PUT/DELETE 写操作（含操作人/模块/动作/详情/IP）；
- 操作人从 Bearer token 解析（staff domain），游客写操作不记录。
"""
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.exceptions import ok
from app.core.security import decode_token
from app.db.session import SessionLocal, get_db
from app.models import OperationLogs, StaffUsers
from app.utils.pagination import PaginationParams, paginate

router = APIRouter(prefix="/admin/logs", tags=["后台-操作日志"])

log_perm = require_permission("log:view")


def _log_out(l: OperationLogs, db: Session) -> dict:
    """操作日志序列化（关联员工名，operator 字段来自 operator_id 关联）。"""
    staff = db.get(StaffUsers, l.operator_id) if l.operator_id else None
    return {
        "id": l.id, "module": l.module, "action": l.action, "target": l.target,
        "detail": l.detail, "ip": l.ip,
        "operator": staff.username if staff else f"#{l.operator_id}" if l.operator_id else "系统",
        "created_at": l.created_at.isoformat() if l.created_at else None,
    }


@router.get("", dependencies=[Depends(log_perm)])
def list_logs(
    module: str | None = None,
    kw: str | None = None,
    db: Session = Depends(get_db),
    p: PaginationParams = Depends(),
):
    """操作日志列表（模块/关键词筛选 + 分页，PRD 7.7.3）。"""
    q = db.query(OperationLogs)
    if module:
        q = q.filter(OperationLogs.module == module)
    if kw:
        like = f"%{kw.strip()}%"
        q = q.filter(or_(OperationLogs.action.like(like), OperationLogs.target.like(like)))
    total = q.count()
    rows = q.order_by(OperationLogs.id.desc()).offset(p.offset).limit(p.page_size).all()
    return ok(paginate([_log_out(x, db) for x in rows], total, p))


async def op_log_middleware(request: Request, call_next):
    """操作日志中间件：记录后台写操作（POST/PUT/DELETE）。

    说明：在响应完成后记录；同步 DB 写入（开发期 SQLite 可接受，生产可换异步/队列）。
    """
    response = await call_next(request)
    path = request.url.path
    method = request.method
    # 仅记录后台写操作
    if path.startswith("/api/v1/admin/") and method in ("POST", "PUT", "DELETE"):
        try:
            # 解析操作人（Bearer token，staff domain）
            auth = request.headers.get("authorization", "")
            operator_id = None
            if auth.startswith("Bearer "):
                payload = decode_token(auth[7:])
                if payload and payload.get("domain") == "staff":
                    operator_id = int(payload["sub"])
            # 模块 = 路由前缀（如 /admin/products 前两段）
            parts = [p for p in path.replace("/api/v1", "").split("/") if p]
            module = parts[1] if len(parts) > 1 else "admin"
            action = method
            ip = request.client.host if request.client else None

            db: Session = SessionLocal()
            try:
                db.add(OperationLogs(
                    operator_id=operator_id,
                    module=module,
                    action=action,
                    target=path,
                    detail={"status": response.status_code},
                    ip=ip,
                ))
                db.commit()
            finally:
                db.close()
        except Exception:
            # 日志记录失败不阻断业务
            pass
    return response
