"""统计域模型（2 表）：visit_stats / visit_stat_devices

对齐《数据库设计文档》V1.2.1 §4.9。
ADR-005：前端埋点 + 服务端日聚合；UV 按设备 UUID 去重（visit_stat_devices）。
"""
from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, CommonFieldsMixin


class VisitStats(Base, CommonFieldsMixin):
    """访问统计（日聚合）。"""

    __tablename__ = "visit_stats"
    __table_args__ = (
        UniqueConstraint("stat_date", "stat_type", "target", name="uq_visit_stats"),
        {"comment": "访问统计(日聚合)"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    stat_date: Mapped[date] = mapped_column(Date, nullable=False, comment="统计日期")
    stat_type: Mapped[str] = mapped_column(String(20), nullable=False, comment="类型（page/product/event）")
    target: Mapped[str] = mapped_column(String(255), nullable=False, comment="对象")
    pv: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="浏览量")
    uv: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="访客数")


class VisitStatDevices(Base, CommonFieldsMixin):
    """UV 去重明细。"""

    __tablename__ = "visit_stat_devices"
    __table_args__ = (
        UniqueConstraint("stat_id", "device_id", name="uq_visit_stat_devices"),
        {"comment": "UV去重明细"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    stat_id: Mapped[int] = mapped_column(ForeignKey("visit_stats.id"), nullable=False, comment="统计记录")
    device_id: Mapped[str] = mapped_column(String(64), nullable=False, comment="设备 UUID")
