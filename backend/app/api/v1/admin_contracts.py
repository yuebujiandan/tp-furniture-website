"""后台签单管理接口（技术文档 §6.6.6 / PRD 7.4.5-7.4.6）。

实现说明：
- GET /admin/contracts/dashboard：6 项 KPI（总签单/总金额/本月签单/本月金额/待交付/已取消，PRD 7.6.3）；
- GET /admin/contracts：列表（状态/来源/关键词/日期区间 + 分页）；
- POST /admin/contracts：线下录单（source=offline）；GET/PUT：详情/编辑；
- PUT /admin/contracts/{id}/status：状态流转（signed→producing→delivered→done / →cancelled，写 contract_logs）；
- GET /admin/contracts/export：CSV 导出（技术文档 §6.6.6）；
- 权限：contract:view / contract:edit / contract:status / contract:export。
"""
import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.exceptions import NOT_FOUND, BizError, ok
from app.db.session import get_db
from app.models import ContractLogs, Contracts, Stores
from app.utils.contract_no import generate_contract_no
from app.utils.pagination import PaginationParams, paginate

router = APIRouter(prefix="/admin/contracts", tags=["后台-签单管理"])

view_perm = require_permission("contract:view")
edit_perm = require_permission("contract:edit")
status_perm = require_permission("contract:status")
export_perm = require_permission("contract:export")

# 状态流转白名单（PRD 7.4.6 状态机：signed→producing→delivered→done；任意→cancelled）
STATUS_FLOW: dict[str, list[str]] = {
    "signed": ["producing", "cancelled"],
    "producing": ["delivered", "cancelled"],
    "delivered": ["done"],
    "done": [],
    "cancelled": [],
}


def _contract_out(c: Contracts, db: Session) -> dict:
    """签单序列化（带门店名）。"""
    store = db.get(Stores, c.store_id) if c.store_id else None
    return {
        "id": c.id, "contract_no": c.contract_no, "user_id": c.user_id,
        "customer_name": c.customer_name, "customer_phone": c.customer_phone,
        "source": c.source, "appointment_id": c.appointment_id,
        "items": c.items or [], "total_amount": float(c.total_amount) if c.total_amount is not None else None,
        "deposit": float(c.deposit) if c.deposit is not None else None,
        "payment_plan": c.payment_plan or {},
        "delivery_date": c.delivery_date.isoformat() if c.delivery_date else None,
        "store_id": c.store_id, "store_name": store.name if store else None,
        "remark": c.remark, "status": c.status, "cancel_reason": c.cancel_reason,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


@router.get("/dashboard", dependencies=[Depends(view_perm)])
def contract_dashboard(db: Session = Depends(get_db)):
    """签单 6 项 KPI（PRD 7.6.3 / 技术文档 §6.6.6）。"""
    from datetime import date
    from sqlalchemy import func

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    q_total = db.query(Contracts)
    q_month = db.query(Contracts).filter(Contracts.created_at >= month_start)

    def sum_amount(q, statuses: list[str] | None = None):
        query = q
        if statuses:
            query = query.filter(Contracts.status.in_(statuses))
        return (query.with_entities(func.coalesce(func.sum(Contracts.total_amount), 0)).scalar()) or 0

    return ok({
        "total_contracts": q_total.count(),
        "total_amount": float(sum_amount(q_total, ["signed", "producing", "delivered", "done"])),
        "month_contracts": q_month.count(),
        "month_amount": float(sum_amount(q_month, ["signed", "producing", "delivered", "done"])),
        "pending_delivery": q_total.filter(Contracts.status.in_(["signed", "producing"])).count(),
        "cancelled": q_total.filter(Contracts.status == "cancelled").count(),
    })


@router.get("", dependencies=[Depends(view_perm)])
def list_contracts(
    status: str | None = Query(None, description="signed/producing/delivered/done/cancelled"),
    source: str | None = Query(None, description="offline/appointment/dealer_intent"),
    date_from: str | None = Query(None, description="创建日期起"),
    date_to: str | None = Query(None, description="创建日期止"),
    kw: str | None = Query(None, description="关键词（签单号/客户名/手机号）"),
    db: Session = Depends(get_db),
    p: PaginationParams = Depends(),
):
    """签单列表（筛选 + 分页，PRD 7.4.5）。"""
    q = db.query(Contracts)
    if status:
        q = q.filter(Contracts.status == status)
    if source:
        q = q.filter(Contracts.source == source)
    if date_from:
        q = q.filter(Contracts.created_at >= date_from)
    if date_to:
        q = q.filter(Contracts.created_at <= f"{date_to}T23:59:59")
    if kw:
        like = f"%{kw.strip()}%"
        q = q.filter(or_(Contracts.contract_no.like(like), Contracts.customer_name.like(like), Contracts.customer_phone.like(like)))
    total = q.count()
    rows = q.order_by(Contracts.id.desc()).offset(p.offset).limit(p.page_size).all()
    return ok(paginate([_contract_out(c, db) for c in rows], total, p))


class ContractIn(BaseModel):
    """签单入参（线下录单/编辑，ADR-003 items 为 JSON 快照）。"""

    customer_name: str = Field(min_length=1, max_length=50)
    customer_phone: str
    items: list = Field(default_factory=list)
    total_amount: float | None = None
    deposit: float | None = None
    delivery_date: str | None = None       # YYYY-MM-DD
    store_id: int | None = None
    remark: str | None = Field(default=None, max_length=500)


@router.post("", dependencies=[Depends(edit_perm)])
def create_contract(body: ContractIn, db: Session = Depends(get_db)):
    """新建签单（线下录单，source=offline，PRD 7.4.5）。"""
    contract = Contracts(
        contract_no=generate_contract_no(db),
        customer_name=body.customer_name,
        customer_phone=body.customer_phone,
        source="offline",
        items=body.items,
        total_amount=body.total_amount,
        deposit=body.deposit,
        delivery_date=body.delivery_date,
        store_id=body.store_id,
        remark=body.remark,
        status="signed",
    )
    db.add(contract)
    db.flush()
    db.add(ContractLogs(contract_id=contract.id, operator="staff", action="create",
                        detail={"customer": body.customer_name}))
    db.commit()
    db.refresh(contract)
    return ok({"id": contract.id, "contract_no": contract.contract_no})


@router.get("/export", dependencies=[Depends(export_perm)])
def export_contracts(db: Session = Depends(get_db)):
    """CSV 导出全部签单（技术文档 §6.6.6，UTF-8 BOM 兼容 Excel）。"""
    rows = db.query(Contracts).order_by(Contracts.id.desc()).all()
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["签单号", "客户", "手机号", "来源", "总金额", "定金", "状态", "交付日期", "创建时间"])
    status_map = {"signed": "已签单", "producing": "生产中", "delivered": "已交付", "done": "已完成", "cancelled": "已取消"}
    source_map = {"offline": "线下录单", "appointment": "预约转签单", "dealer_intent": "经销商意向"}
    for c in rows:
        writer.writerow([
            c.contract_no, c.customer_name, c.customer_phone, source_map.get(c.source, c.source),
            c.total_amount or "", c.deposit or "", status_map.get(c.status, c.status),
            c.delivery_date.isoformat() if c.delivery_date else "",
            c.created_at.strftime("%Y-%m-%d %H:%M") if c.created_at else "",
        ])
    content = "\ufeff" + buf.getvalue()  # BOM 让 Excel 正确识别 UTF-8
    return StreamingResponse(
        io.BytesIO(content.encode("utf-8")),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=contracts.csv"},
    )


@router.get("/{contract_id}", dependencies=[Depends(view_perm)])
def get_contract(contract_id: int, db: Session = Depends(get_db)):
    """签单详情（含状态流转日志，PRD 7.4.5）。"""
    c = db.get(Contracts, contract_id)
    if not c:
        raise BizError(NOT_FOUND, "签单不存在")
    logs = db.query(ContractLogs).filter(ContractLogs.contract_id == c.id).order_by(ContractLogs.id.desc()).limit(50).all()
    data = _contract_out(c, db)
    data["logs"] = [
        {"action": x.action, "detail": x.detail, "created_at": x.created_at.isoformat() if x.created_at else None}
        for x in logs
    ]
    return ok(data)


@router.put("/{contract_id}", dependencies=[Depends(edit_perm)])
def update_contract(contract_id: int, body: ContractIn, db: Session = Depends(get_db)):
    """编辑签单（仅 signed/producing 可编辑，PRD 7.4.6）。"""
    c = db.get(Contracts, contract_id)
    if not c:
        raise BizError(NOT_FOUND, "签单不存在")
    if c.status not in ("signed", "producing"):
        raise BizError(40000, "当前状态不可编辑")
    for k, v in body.model_dump().items():
        setattr(c, k, v)
    db.add(ContractLogs(contract_id=c.id, operator="staff", action="update"))
    db.commit()
    return ok({"id": c.id})


class StatusIn(BaseModel):
    status: str                           # producing/delivered/done/cancelled
    cancel_reason: str | None = Field(default=None, max_length=255)


@router.put("/{contract_id}/status", dependencies=[Depends(status_perm)])
def set_contract_status(contract_id: int, body: StatusIn, db: Session = Depends(get_db)):
    """签单状态流转（状态机白名单 + 操作日志，PRD 7.4.6）。"""
    c = db.get(Contracts, contract_id)
    if not c:
        raise BizError(NOT_FOUND, "签单不存在")
    if c.status == "cancelled":
        raise BizError(40000, "已取消签单不可再流转")
    allowed = STATUS_FLOW.get(c.status, [])
    if body.status not in allowed:
        raise BizError(40000, f"状态流转不允许：{c.status} → {body.status}")
    old_status = c.status  # 先记录旧状态（日志 from 字段）
    c.status = body.status
    if body.status == "cancelled":
        c.cancel_reason = body.cancel_reason
    db.add(ContractLogs(contract_id=c.id, operator="staff", action=f"status:{body.status}",
                        detail={"from": old_status, "to": body.status, "reason": body.cancel_reason}))
    db.commit()
    return ok({"id": c.id, "status": c.status})
