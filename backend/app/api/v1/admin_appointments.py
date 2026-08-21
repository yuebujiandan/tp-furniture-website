"""后台预约管理接口（技术文档 §6.6.5 / PRD 7.4）。

实现说明：
- GET /admin/appointments：预约列表（状态/类型/日期/关键词筛选 + 分页）；
- PUT /admin/appointments/{id}/status：确认/取消（pending→confirmed→done；任意→cancelled）；
- PUT /admin/appointments/{id}/note：后台备注；
- POST /admin/appointments/{id}/to-contract：转签单（V1.9 闭环：创建 Contracts，source=appointment，
  回写 appointment.contract_id，PRD 7.4.4）；
- 权限：appointment:view / appointment:handle。
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.exceptions import CONFLICT, NOT_FOUND, BizError, ok
from app.db.session import get_db
from app.models import Appointments, ContractLogs, Contracts, Stores, Users
from app.utils.pagination import PaginationParams, paginate

router = APIRouter(prefix="/admin", tags=["后台-预约管理"])

view_perm = require_permission("appointment:view")
handle_perm = require_permission("appointment:handle")


def _appt_out(a: Appointments, db: Session) -> dict:
    """预约序列化（带门店名/产品名/用户名）。"""
    store = db.get(Stores, a.store_id) if a.store_id else None
    user = db.get(Users, a.user_id) if a.user_id else None
    return {
        "id": a.id, "user_id": a.user_id, "user_phone": user.phone if user else None,
        "name": a.name, "phone": a.phone, "type": a.type, "status": a.status,
        "expect_date": a.expect_date.isoformat(), "expect_time": a.expect_time,
        "city": a.city, "store_id": a.store_id, "store_name": store.name if store else None,
        "product_id": a.product_id, "case_id": a.case_id,
        "remark": a.remark, "admin_note": a.admin_note, "contract_id": a.contract_id,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


@router.get("/appointments", dependencies=[Depends(view_perm)])
def list_appointments(
    status: str | None = Query(None, description="pending/confirmed/done/cancelled"),
    type: str | None = Query(None, description="visit/designer/measure/case_design"),
    date_from: str | None = Query(None, description="期望日期起 YYYY-MM-DD"),
    date_to: str | None = Query(None, description="期望日期止 YYYY-MM-DD"),
    kw: str | None = Query(None, description="关键词（姓名/手机号）"),
    db: Session = Depends(get_db),
    p: PaginationParams = Depends(),
):
    """预约列表（筛选 + 分页，PRD 7.4.1）。"""
    q = db.query(Appointments)
    if status:
        q = q.filter(Appointments.status == status)
    if type:
        q = q.filter(Appointments.type == type)
    if date_from:
        q = q.filter(Appointments.expect_date >= date_from)
    if date_to:
        q = q.filter(Appointments.expect_date <= date_to)
    if kw:
        like = f"%{kw.strip()}%"
        q = q.filter(or_(Appointments.name.like(like), Appointments.phone.like(like)))
    total = q.count()
    rows = q.order_by(Appointments.id.desc()).offset(p.offset).limit(p.page_size).all()
    return ok(paginate([_appt_out(a, db) for a in rows], total, p))


class StatusIn(BaseModel):
    status: str                           # confirmed / cancelled


@router.put("/appointments/{appointment_id}/status", dependencies=[Depends(handle_perm)])
def set_appointment_status(appointment_id: int, body: StatusIn, db: Session = Depends(get_db)):
    """确认/取消预约（PRD 7.4.2：状态机 pending→confirmed→done / →cancelled）。"""
    row = db.get(Appointments, appointment_id)
    if not row:
        raise BizError(NOT_FOUND, "预约不存在")
    if body.status not in ("confirmed", "cancelled"):
        raise BizError(40000, "仅支持确认/取消操作")
    # 状态机校验：已取消不可再操作；已 done 不可回退
    if row.status == "cancelled":
        raise BizError(CONFLICT, "预约已取消，不可再操作")
    if row.status == "done":
        raise BizError(CONFLICT, "预约已完成，不可再操作")
    if row.status == "confirmed" and body.status == "confirmed":
        raise BizError(CONFLICT, "预约已确认")
    row.status = body.status
    if body.status == "confirmed":
        row.handler_id = None  # 实际处理人由前端传 staff id（P3 档简化）
    db.commit()
    return ok({"id": row.id, "status": row.status})


class NoteIn(BaseModel):
    admin_note: str | None = Field(default=None, max_length=500)


@router.put("/appointments/{appointment_id}/note", dependencies=[Depends(handle_perm)])
def set_appointment_note(appointment_id: int, body: NoteIn, db: Session = Depends(get_db)):
    """设置后台备注（PRD 7.4.2）。"""
    row = db.get(Appointments, appointment_id)
    if not row:
        raise BizError(NOT_FOUND, "预约不存在")
    row.admin_note = body.admin_note
    db.commit()
    return ok({"id": row.id})


class ToContractIn(BaseModel):
    """转签单入参（V1.9 闭环，PRD 7.4.4）。"""

    customer_name: str = Field(min_length=1, max_length=50)
    customer_phone: str
    items: list = Field(default_factory=list)   # [{name, product_no, unit_price, qty}]（ADR-003 JSON 快照）
    total_amount: float | None = None
    deposit: float | None = None
    remark: str | None = Field(default=None, max_length=500)


@router.post("/appointments/{appointment_id}/to-contract", dependencies=[Depends(handle_perm)])
def to_contract(appointment_id: int, body: ToContractIn, db: Session = Depends(get_db)):
    """预约转签单（V1.9：创建签单并回写预约 contract_id，PRD 7.4.4）。

    口径：仅 pending/confirmed 预约可转；转后预约标记 done。
    """
    appt = db.get(Appointments, appointment_id)
    if not appt:
        raise BizError(NOT_FOUND, "预约不存在")
    if appt.contract_id:
        raise BizError(CONFLICT, "该预约已转签单")
    if appt.status not in ("pending", "confirmed"):
        raise BizError(CONFLICT, "仅待处理/已确认的预约可转签单")

    # 生成签单号：TP + 日期 + 4 位当日序号（技术文档 §6.6.6）
    from app.utils.contract_no import generate_contract_no

    contract_no = generate_contract_no(db)
    contract = Contracts(
        contract_no=contract_no,
        user_id=appt.user_id,
        customer_name=body.customer_name or appt.name,
        customer_phone=body.customer_phone or appt.phone,
        source="appointment",
        appointment_id=appt.id,
        items=body.items,
        total_amount=body.total_amount,
        deposit=body.deposit,
        remark=body.remark,
        status="signed",
    )
    db.add(contract)
    db.flush()
    # 回写预约 contract_id（闭环）+ 标记完成
    appt.contract_id = contract.id
    appt.status = "done"
    # 记录签单日志
    db.add(ContractLogs(contract_id=contract.id, operator="staff", action="create_from_appointment",
                        detail={"appointment_id": appt.id}))
    db.commit()
    db.refresh(contract)
    return ok({"id": contract.id, "contract_no": contract.contract_no, "appointment_status": appt.status})
