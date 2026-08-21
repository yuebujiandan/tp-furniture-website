"""SQLAlchemy 声明基类与公共字段（技术文档 §4.0 通用约定）。

公共字段：id(Integer PK)、is_activate(Boolean)、created_by/updated_by(String 50)、
created_at/updated_at(DateTime(timezone=True), UTC)。
"""
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class CommonFieldsMixin:
    """全表公共字段（除 id 外）。"""

    is_activate: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_by: Mapped[str | None] = mapped_column(String(50), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)
