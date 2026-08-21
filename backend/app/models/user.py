"""用户权限域模型（6 表）：users / dealer_applications / staff_users / departments / roles / operation_logs

对齐《数据库设计文档》V1.2.1 §4.3。
"""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, CommonFieldsMixin


class Users(Base, CommonFieldsMixin):
    """前台用户（客户）。"""

    __tablename__ = "users"
    __table_args__ = {"comment": "前台用户（客户）"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, comment="登录账号（手机号）")
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="bcrypt；验证码登录可为空")
    nickname: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="昵称")
    avatar: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="头像 URL")
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="user", comment="user/dealer")
    dealer_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, comment="经销商认证通过时间")
    dealer_discount: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True, comment="默认折扣率 0.00~1.00")
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, comment="最后登录时间")

    favorites: Mapped[list["Favorites"]] = relationship(back_populates="user")
    dealer_applications: Mapped[list["DealerApplications"]] = relationship(back_populates="user")


class DealerApplications(Base, CommonFieldsMixin):
    """经销商认证申请。"""

    __tablename__ = "dealer_applications"
    __table_args__ = {"comment": "经销商认证申请"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, comment="申请人")
    company_name: Mapped[str] = mapped_column(String(100), nullable=False, comment="企业名称")
    credit_code: Mapped[str] = mapped_column(String(50), nullable=False, comment="统一社会信用代码")
    license_img: Mapped[str] = mapped_column(String(255), nullable=False, comment="营业执照图片")
    contact: Mapped[str] = mapped_column(String(50), nullable=False, comment="联系人")
    phone: Mapped[str] = mapped_column(String(20), nullable=False, comment="联系电话")
    region: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="所在地区")
    reason: Mapped[str | None] = mapped_column(Text, nullable=True, comment="申请理由")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", comment="pending/approved/rejected")
    reject_reason: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="驳回原因")
    handled_by: Mapped[int | None] = mapped_column(ForeignKey("staff_users.id"), nullable=True, comment="审核人")
    handled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, comment="审核时间")

    user: Mapped["Users"] = relationship(back_populates="dealer_applications")


class StaffUsers(Base, CommonFieldsMixin):
    """内部员工/管理员（替代原 admins）。"""

    __tablename__ = "staff_users"
    __table_args__ = {"comment": "内部员工/管理员"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, comment="登录名")
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False, comment="bcrypt")
    name: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="姓名")
    nickname: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="昵称")
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True, comment="手机号")
    email: Mapped[str | None] = mapped_column(String(120), nullable=True, comment="邮箱")
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True, comment="性别")
    position: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="岗位")
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True, comment="部门")
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False, comment="角色（RBAC）")
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, comment="最后登录时间")

    role: Mapped["Roles"] = relationship()
    department: Mapped["Departments | None"] = relationship()


class Departments(Base, CommonFieldsMixin):
    """部门（部门树，自引用）。"""

    __tablename__ = "departments"
    __table_args__ = {"comment": "部门（部门树）"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    department_name: Mapped[str] = mapped_column(String(100), nullable=False, comment="部门名称")
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True, comment="上级部门（NULL=顶级）")


class Roles(Base, CommonFieldsMixin):
    """角色（RBAC）。V1 固定 5 角色（附录 C-2）。"""

    __tablename__ = "roles"
    __table_args__ = {"comment": "角色（RBAC）"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    role_name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, comment="角色名称")
    code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, comment="RBAC 标识")
    permissions: Mapped[list] = mapped_column(JSON, nullable=False, comment="权限码数组")
    description: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="描述")


class OperationLogs(Base, CommonFieldsMixin):
    """操作日志。"""

    __tablename__ = "operation_logs"
    __table_args__ = {"comment": "操作日志"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    operator_id: Mapped[int | None] = mapped_column(ForeignKey("staff_users.id"), nullable=True, comment="操作人")
    module: Mapped[str] = mapped_column(String(50), nullable=False, comment="模块")
    action: Mapped[str] = mapped_column(String(50), nullable=False, comment="动作")
    target: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="操作对象")
    detail: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="变更前后值")
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True, comment="来源 IP")
