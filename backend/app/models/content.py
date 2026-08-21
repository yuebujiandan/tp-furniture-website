"""内容域模型（8 表）：news / cases / banners / milestones / stores / faqs / announcements / documents

对齐《数据库设计文档》V1.2.1 §4.5。
新闻可见性规则：is_activate=TRUE AND is_published=TRUE AND (expire_at IS NULL OR expire_at >= 当前日期)。
"""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, CommonFieldsMixin


class News(Base, CommonFieldsMixin):
    """新闻。"""

    __tablename__ = "news"
    __table_args__ = {"comment": "新闻"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, comment="标题")
    category: Mapped[str] = mapped_column(String(20), nullable=False, default="company_news", comment="company_news/industry_news")
    cover: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="封面图")
    summary: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="摘要")
    content_html: Mapped[str] = mapped_column(Text, nullable=False, comment="富文本正文")
    author: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="作者")
    source: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="来源（转载标注）")
    publish_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, comment="发布时间（倒序）")
    expire_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, comment="截止时间（NULL=长期）")
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, comment="是否发布（布尔 0/1）")
    is_top: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, comment="是否置顶/推荐")
    view_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="浏览量")


class Cases(Base, CommonFieldsMixin):
    """实景案例。"""

    __tablename__ = "cases"
    __table_args__ = {"comment": "实景案例"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, comment="案例标题")
    cover: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="封面")
    area: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="户型面积（如 130㎡）")
    house_type: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="户型结构")
    style_tags: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="风格标签")
    space: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="所属空间")
    location_desc: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="脱敏描述（如 广州·130㎡三居室）")
    content_html: Mapped[str] = mapped_column(Text, nullable=False, comment="图文正文")
    product_ids: Mapped[list | None] = mapped_column(JSON, nullable=True, comment="关联产品 ID 数组")
    is_engineering: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, comment="是否工程案例")
    customer_review: Mapped[str | None] = mapped_column(Text, nullable=True, comment="脱敏客户评价")
    sort: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="排序")
    view_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="浏览量")


class Banners(Base, CommonFieldsMixin):
    """首页 Banner。"""

    __tablename__ = "banners"
    __table_args__ = {"comment": "首页Banner"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    image: Mapped[str] = mapped_column(String(255), nullable=False, comment="图片（1920×780）")
    title: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="标题")
    subtitle: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="副标题")
    button_text: Mapped[str | None] = mapped_column(String(20), nullable=True, comment="按钮文字")
    link_url: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="跳转链接")
    sort: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="排序")


class Milestones(Base, CommonFieldsMixin):
    """发展历程。"""

    __tablename__ = "milestones"
    __table_args__ = {"comment": "发展历程"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    year: Mapped[str] = mapped_column(String(10), nullable=False, comment="年份")
    title: Mapped[str] = mapped_column(String(100), nullable=False, comment="事件标题")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="事件描述")
    image: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="配图")
    sort: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="排序")


class Stores(Base, CommonFieldsMixin):
    """门店。"""

    __tablename__ = "stores"
    __table_args__ = {"comment": "门店"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="门店名")
    address: Mapped[str] = mapped_column(String(255), nullable=False, comment="地址")
    lat: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True, comment="纬度")
    lng: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True, comment="经度")
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True, comment="电话")
    business_hours: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="营业时间")
    image: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="门店图")
    sort: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="排序")


class Faqs(Base, CommonFieldsMixin):
    """常见问题。"""

    __tablename__ = "faqs"
    __table_args__ = {"comment": "常见问题"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question: Mapped[str] = mapped_column(String(255), nullable=False, comment="问题")
    answer: Mapped[str] = mapped_column(Text, nullable=False, comment="答案")
    sort: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="排序")


class Announcements(Base, CommonFieldsMixin):
    """经销商公告。"""

    __tablename__ = "announcements"
    __table_args__ = {"comment": "经销商公告"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, comment="标题")
    content_html: Mapped[str] = mapped_column(Text, nullable=False, comment="正文")
    scope: Mapped[str] = mapped_column(String(20), nullable=False, default="all", comment="all/dealer")
    dealer_ids: Mapped[list | None] = mapped_column(JSON, nullable=True, comment="指定经销商 JSON")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft", comment="draft/published")
    publish_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, comment="发布时间")


class Documents(Base, CommonFieldsMixin):
    """合作政策文档。"""

    __tablename__ = "documents"
    __table_args__ = {"comment": "合作政策文档"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, comment="标题")
    file_url: Mapped[str] = mapped_column(String(255), nullable=False, comment="文件 URL")
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="文件大小")
    sort: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="排序")
