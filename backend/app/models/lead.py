"""业务线索域模型（5 表）：appointments / messages / inquiries / franchise_applications / engineering_requests

对齐《数据库设计文档》V1.2.1 §4.6。
口径校准（技术文档 §1.3）：messages 双字段 type + source；appointments.contract_id 实现 V1.9 转签单闭环。
"""
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, CommonFieldsMixin


class Appointments(Base, CommonFieldsMixin):
    """预约。"""

    __tablename__ = "appointments"
    __table_args__ = {"comment": "预约"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, comment="用户（可空=游客）")
    name: Mapped[str] = mapped_column(String(50), nullable=False, comment="姓名")
    phone: Mapped[str] = mapped_column(String(20), nullable=False, comment="手机号")
    type: Mapped[str] = mapped_column(String(30), nullable=False, comment="visit/designer/measure/case_design")
    case_id: Mapped[int | None] = mapped_column(ForeignKey("cases.id"), nullable=True, comment="关联案例")
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), nullable=True, comment="关联产品")
    city: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="城市")
    store_id: Mapped[int | None] = mapped_column(ForeignKey("stores.id"), nullable=True, comment="门店")
    expect_date: Mapped[date] = mapped_column(Date, nullable=False, comment="期望日期")
    expect_time: Mapped[str | None] = mapped_column(String(20), nullable=True, comment="期望时段")
    remark: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="备注")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", comment="pending/confirmed/done/cancelled")
    admin_note: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="后台备注")
    handler_id: Mapped[int | None] = mapped_column(ForeignKey("staff_users.id"), nullable=True, comment="处理人")
    contract_id: Mapped[int | None] = mapped_column(ForeignKey("contracts.id"), nullable=True, comment="转签单（V1.9 闭环）")


class Messages(Base, CommonFieldsMixin):
    """留言/在线咨询（双入口同表）。"""

    __tablename__ = "messages"
    __table_args__ = {"comment": "留言/在线咨询(双入口同表)"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    type: Mapped[str] = mapped_column(String(20), nullable=False, default="message", comment="message/consult")
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="contact_page", comment="contact_page/float_window")
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, comment="用户")
    name: Mapped[str] = mapped_column(String(50), nullable=False, comment="姓名")
    phone: Mapped[str] = mapped_column(String(20), nullable=False, comment="手机号")
    category: Mapped[str | None] = mapped_column(String(20), nullable=True, comment="分类")
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="内容")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", comment="pending/handled")
    reply: Mapped[str | None] = mapped_column(Text, nullable=True, comment="回复")
    handler_id: Mapped[int | None] = mapped_column(ForeignKey("staff_users.id"), nullable=True, comment="处理人")
    handled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, comment="处理时间")


class Inquiries(Base, CommonFieldsMixin):
    """批量询价。"""

    __tablename__ = "inquiries"
    __table_args__ = {"comment": "批量询价"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, comment="用户")
    company: Mapped[str] = mapped_column(String(100), nullable=False, comment="公司")
    contact: Mapped[str] = mapped_column(String(50), nullable=False, comment="联系人")
    phone: Mapped[str] = mapped_column(String(20), nullable=False, comment="电话")
    email: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="邮箱")
    purpose: Mapped[str] = mapped_column(String(20), nullable=False, comment="self_use/project/wholesale")
    items: Mapped[list] = mapped_column(JSON, nullable=False, comment="询价清单 JSON 快照")
    expect_time: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="期望时间")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", comment="pending/quoted/accepted/closed")
    quote: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="报价 JSON")
    handler_id: Mapped[int | None] = mapped_column(ForeignKey("staff_users.id"), nullable=True, comment="处理人")


class FranchiseApplications(Base, CommonFieldsMixin):
    """加盟申请。"""

    __tablename__ = "franchise_applications"
    __table_args__ = {"comment": "加盟申请"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, comment="用户")
    name: Mapped[str] = mapped_column(String(50), nullable=False, comment="姓名")
    phone: Mapped[str] = mapped_column(String(20), nullable=False, comment="电话")
    city: Mapped[str] = mapped_column(String(50), nullable=False, comment="城市")
    invest_amount: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="投资额度")
    area: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="面积")
    current_status: Mapped[str | None] = mapped_column(String(20), nullable=True, comment="new_shop/existing_shop")
    remark: Mapped[str | None] = mapped_column(Text, nullable=True, comment="备注")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", comment="pending/contacted/negotiating/signed/rejected")
    reject_reason: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="驳回原因")
    handler_id: Mapped[int | None] = mapped_column(ForeignKey("staff_users.id"), nullable=True, comment="处理人")


class EngineeringRequests(Base, CommonFieldsMixin):
    """工程定制需求。"""

    __tablename__ = "engineering_requests"
    __table_args__ = {"comment": "工程定制需求"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, comment="用户")
    company: Mapped[str] = mapped_column(String(100), nullable=False, comment="公司")
    contact: Mapped[str] = mapped_column(String(50), nullable=False, comment="联系人")
    phone: Mapped[str] = mapped_column(String(20), nullable=False, comment="电话")
    project_type: Mapped[str] = mapped_column(String(20), nullable=False, comment="hotel/office/commercial/school/other")
    location: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="地点")
    scale: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="规模")
    deadline: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="期限")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="描述")
    attachment_url: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="附件")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", comment="pending/designing/quoting/signed/closed")
    handler_id: Mapped[int | None] = mapped_column(ForeignKey("staff_users.id"), nullable=True, comment="处理人")
