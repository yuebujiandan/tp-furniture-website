"""招聘域模型（2 表）：jobs / resumes

对齐《数据库设计文档》V1.2.1 §4.8。
口径校准（技术文档 §1.3）：resumes.apply_no 投递编号 + uq_resumes_job_phone 同岗位手机号唯一（游客查询闭环）。
"""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, CommonFieldsMixin


class Jobs(Base, CommonFieldsMixin):
    """招聘岗位。"""

    __tablename__ = "jobs"
    __table_args__ = {"comment": "招聘岗位"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(100), nullable=False, comment="职位")
    department: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="部门")
    location: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="地点")
    type: Mapped[str] = mapped_column(String(20), nullable=False, comment="类型（社会/校园）")
    duty: Mapped[str | None] = mapped_column(Text, nullable=True, comment="职责")
    requirement: Mapped[str | None] = mapped_column(Text, nullable=True, comment="要求")
    salary: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="薪资")
    tags: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="标签")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active", comment="active/closed")
    publish_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, comment="发布时间")


class Resumes(Base, CommonFieldsMixin):
    """简历投递。"""

    __tablename__ = "resumes"
    __table_args__ = (
        UniqueConstraint("job_id", "phone", name="uq_resumes_job_phone"),
        {"comment": "简历投递"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), nullable=False, comment="职位")
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, comment="用户")
    name: Mapped[str] = mapped_column(String(50), nullable=False, comment="姓名")
    phone: Mapped[str] = mapped_column(String(20), nullable=False, comment="电话")
    email: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="邮箱")
    education: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="学历")
    school: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="学校")
    work_years: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="工作年限")
    attachment_url: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="附件")
    intro: Mapped[str | None] = mapped_column(Text, nullable=True, comment="自我介绍")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="submitted", comment="submitted/screened/interviewing/hired/rejected")
    apply_no: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, comment="投递查询号")
