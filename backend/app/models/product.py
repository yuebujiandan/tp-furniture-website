"""产品域模型（5 表）：series / spaces / products / product_spaces / favorites

对齐《数据库设计文档》V1.2.1 §4.4。
可见性规则：前台产品须同时满足 is_activate=TRUE AND is_deleted=FALSE AND publish_status='on_shelf'。
"""
from sqlalchemy import Boolean, ForeignKey, Integer, JSON, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, CommonFieldsMixin


class Series(Base, CommonFieldsMixin):
    """产品系列。"""

    __tablename__ = "series"
    __table_args__ = {"comment": "产品系列"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, comment="系列名")
    image: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="系列图")
    intro: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="简介")
    sort: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="排序（小在前）")


class Spaces(Base, CommonFieldsMixin):
    """空间分类。"""

    __tablename__ = "spaces"
    __table_args__ = {"comment": "空间分类"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, comment="空间名")
    icon: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="图标")
    sort: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="排序")


class Products(Base, CommonFieldsMixin):
    """产品。"""

    __tablename__ = "products"
    __table_args__ = {"comment": "产品"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="产品名")
    product_no: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, comment="产品编号（唯一）")
    series_id: Mapped[int] = mapped_column(ForeignKey("series.id"), nullable=False, comment="所属系列")
    category_id: Mapped[int | None] = mapped_column(ForeignKey("spaces.id"), nullable=True, comment="所属空间分类主分类")
    style_tags: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="风格标签（逗号分隔）")
    specs: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="规格参数 JSON")
    retail_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True, comment="零售参考价（NULL=按方案报价）")
    dealer_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True, comment="经销商单品价；NULL 按折扣率折算")
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="库存")
    stock_warn: Mapped[int] = mapped_column(Integer, nullable=False, default=5, comment="库存预警阈值")
    cover_image_url: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="封面图片 URL")
    images: Mapped[list | None] = mapped_column(JSON, nullable=True, comment="图集 URL 数组")
    detail_html: Mapped[str | None] = mapped_column(Text, nullable=True, comment="富文本详情")
    size: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="尺寸参数")
    material: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="材质")
    craft: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="工艺参数")
    warranty: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="质保/售后说明")
    sort: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="默认排序")
    publish_status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft", comment="on_shelf/off_shelf/draft")
    is_top: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, comment="是否置顶")
    is_recommend: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, comment="首页精选")
    is_new: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, comment="新品标签")
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, comment="软删除（PRD 7.1.2）")

    series: Mapped["Series"] = relationship()
    category: Mapped["Spaces | None"] = relationship()
    spaces: Mapped[list["Spaces"]] = relationship(secondary="product_spaces", lazy="selectin")
    favorites: Mapped[list["Favorites"]] = relationship(back_populates="product")


class ProductSpaces(Base, CommonFieldsMixin):
    """产品-空间关联（M:N）。"""

    __tablename__ = "product_spaces"
    __table_args__ = (
        UniqueConstraint("product_id", "space_id", name="uq_product_spaces"),
        {"comment": "产品-空间关联(M:N)"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, comment="产品")
    space_id: Mapped[int] = mapped_column(ForeignKey("spaces.id"), nullable=False, comment="空间")


class Favorites(Base, CommonFieldsMixin):
    """产品收藏（V1.7 回退恢复）。"""

    __tablename__ = "favorites"
    __table_args__ = (
        UniqueConstraint("user_id", "product_id", name="uq_favorites"),
        {"comment": "产品收藏"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, comment="收藏人")
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, comment="产品")

    user: Mapped["Users"] = relationship(back_populates="favorites")
    product: Mapped["Products"] = relationship(back_populates="favorites")
