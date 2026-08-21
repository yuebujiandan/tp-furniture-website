"""系统域模型（1 表）：site_configs

对齐《数据库设计文档》V1.2.1 §4.10。KV 配置表，key 业务唯一，value 为 JSON。
"""
from sqlalchemy import Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, CommonFieldsMixin


class SiteConfigs(Base, CommonFieldsMixin):
    """站点配置（键值表）。"""

    __tablename__ = "site_configs"
    __table_args__ = {"comment": "站点配置(键值表)"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, comment="配置键（业务唯一键）")
    value: Mapped[dict] = mapped_column(JSON, nullable=False, comment="配置值 JSON")
