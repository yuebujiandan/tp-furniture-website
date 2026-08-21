"""签单域模型（3 表）：contracts / contract_logs / dealer_purchase_intents

对齐《数据库设计文档》V1.2.1 §4.7。
口径校准（技术文档 §1.3）：contracts.source = offline / appointment / dealer_intent（替代 type）。
ADR-003：contracts.items 为 JSON 快照 [{name, product_no, unit_price, qty}]，不存 product_id。
"""
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, JSON, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, CommonFieldsMixin


class Contracts(Base, CommonFieldsMixin):
    """签单（V1.4 替代原订单）。"""

    __tablename__ = "contracts"
    __table_args__ = {"comment": "签单"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    contract_no: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, comment="签单号（唯一，TP+日期+序号）")
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, comment="用户")
    customer_name: Mapped[str] = mapped_column(String(50), nullable=False, comment="客户名")
    customer_phone: Mapped[str] = mapped_column(String(20), nullable=False, comment="客户电话")
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="offline", comment="offline/appointment/dealer_intent")
    appointment_id: Mapped[int | None] = mapped_column(ForeignKey("appointments.id"), nullable=True, comment="来源预约")
    items: Mapped[list] = mapped_column(JSON, nullable=False, comment="产品清单 JSON 快照（ADR-003）")
    total_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True, comment="总金额（NULL=待定）")
    deposit: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True, comment="定金")
    payment_plan: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="付款计划 JSON")
    delivery_date: Mapped[date | None] = mapped_column(Date, nullable=True, comment="交付日期")
    store_id: Mapped[int | None] = mapped_column(ForeignKey("stores.id"), nullable=True, comment="门店")
    admin_id: Mapped[int | None] = mapped_column(ForeignKey("staff_users.id"), nullable=True, comment="录单人")
    remark: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="备注")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="signed", comment="signed/producing/delivered/done/cancelled")
    cancel_reason: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="取消原因")
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, comment="取消时间")


class ContractLogs(Base, CommonFieldsMixin):
    """签单操作日志。"""

    __tablename__ = "contract_logs"
    __table_args__ = {"comment": "签单操作日志"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    contract_id: Mapped[int] = mapped_column(ForeignKey("contracts.id"), nullable=False, comment="签单")
    operator_id: Mapped[int | None] = mapped_column(ForeignKey("staff_users.id"), nullable=True, comment="操作人")
    operator: Mapped[str] = mapped_column(String(20), nullable=False, default="staff", comment="操作方类型")
    action: Mapped[str] = mapped_column(String(30), nullable=False, comment="动作")
    detail: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="明细 JSON")


class DealerPurchaseIntents(Base, CommonFieldsMixin):
    """经销商采购意向。"""

    __tablename__ = "dealer_purchase_intents"
    __table_args__ = {"comment": "经销商采购意向"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    dealer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, comment="经销商（users）")
    items: Mapped[list] = mapped_column(JSON, nullable=False, comment="采购清单 JSON")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending_quote", comment="pending_quote/quoted/confirmed/closed")
    quote: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="报价 JSON")
    contract_id: Mapped[int | None] = mapped_column(ForeignKey("contracts.id"), nullable=True, comment="转正式签单")
