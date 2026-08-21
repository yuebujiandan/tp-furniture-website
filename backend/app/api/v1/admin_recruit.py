"""后台招聘管理接口（技术文档 §6.6.10 / PRD 7.3.5）。

实现说明：
- 岗位 CRUD（发布/下线 active/closed；publish_time 自动）；
- 简历列表（岗位/状态筛选 + 关键词 + 分页）+ 状态流转（submitted→screened→interviewing→hired/rejected）；
- 权限：recruit:view / recruit:edit / resume:view / resume:status。
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.exceptions import NOT_FOUND, BizError, ok
from app.db.session import get_db
from app.models import Jobs, Resumes
from app.utils.pagination import PaginationParams, paginate

router = APIRouter(prefix="/admin", tags=["后台-招聘管理"])

job_view = require_permission("recruit:view")
job_edit = require_permission("recruit:edit")
resume_view = require_permission("resume:view")
resume_status = require_permission("resume:status")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------- 岗位 ----------
class JobIn(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    department: str | None = None
    location: str | None = None
    type: str = "社会"                    # 社会 / 校园
    duty: str | None = None
    requirement: str | None = None
    salary: str | None = None
    tags: str | None = None
    status: str = "active"                # active / closed


def _job_admin_out(j: Jobs) -> dict:
    return {
        "id": j.id, "title": j.title, "department": j.department, "location": j.location,
        "type": j.type, "salary": j.salary, "tags": j.tags, "status": j.status,
        "is_activate": j.is_activate,
        "publish_time": j.publish_time.isoformat() if j.publish_time else None,
        "created_at": j.created_at.isoformat() if j.created_at else None,
    }


@router.get("/jobs", dependencies=[Depends(job_view)])
def list_jobs(
    type: str | None = None, status: str | None = None, kw: str | None = None,
    db: Session = Depends(get_db), p: PaginationParams = Depends(),
):
    """岗位列表。"""
    q = db.query(Jobs)
    if type:
        q = q.filter(Jobs.type == type)
    if status:
        q = q.filter(Jobs.status == status)
    if kw:
        q = q.filter(Jobs.title.like(f"%{kw.strip()}%"))
    total = q.count()
    rows = q.order_by(Jobs.id.desc()).offset(p.offset).limit(p.page_size).all()
    return ok(paginate([_job_admin_out(x) for x in rows], total, p))


@router.post("/jobs", dependencies=[Depends(job_edit)])
def create_job(body: JobIn, db: Session = Depends(get_db)):
    """新建岗位（active 时自动置发布时间）。"""
    row = Jobs(**body.model_dump())
    if row.status == "active":
        row.publish_time = utcnow()
    db.add(row)
    db.commit()
    db.refresh(row)
    return ok({"id": row.id})


@router.get("/jobs/{job_id}", dependencies=[Depends(job_view)])
def get_job(job_id: int, db: Session = Depends(get_db)):
    """岗位详情（后台）。"""
    row = db.get(Jobs, job_id)
    if not row:
        raise BizError(NOT_FOUND, "岗位不存在")
    data = _job_admin_out(row)
    data.update({"duty": row.duty or "", "requirement": row.requirement or ""})
    return ok(data)


@router.put("/jobs/{job_id}", dependencies=[Depends(job_edit)])
def update_job(job_id: int, body: JobIn, db: Session = Depends(get_db)):
    """编辑岗位（发布/下线）。"""
    row = db.get(Jobs, job_id)
    if not row:
        raise BizError(NOT_FOUND, "岗位不存在")
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    if row.status == "active" and not row.publish_time:
        row.publish_time = utcnow()
    db.commit()
    return ok({"id": row.id})


@router.delete("/jobs/{job_id}", dependencies=[Depends(job_edit)])
def delete_job(job_id: int, db: Session = Depends(get_db)):
    """删除岗位（有简历时禁用）。"""
    row = db.get(Jobs, job_id)
    if not row:
        raise BizError(NOT_FOUND, "岗位不存在")
    has_resume = db.query(Resumes).filter(Resumes.job_id == job_id).first()
    if has_resume:
        row.is_activate = False
        row.status = "closed"
        db.commit()
        return ok({"deleted": False, "note": "该岗位存在简历投递，已下线"})
    db.delete(row)
    db.commit()
    return ok({"deleted": True})


# ---------- 简历 ----------
def _resume_out(r: Resumes, db: Session) -> dict:
    job = db.get(Jobs, r.job_id)
    return {
        "id": r.id, "job_id": r.job_id, "job_title": job.title if job else "",
        "name": r.name, "phone": r.phone, "email": r.email,
        "education": r.education, "school": r.school, "work_years": r.work_years,
        "intro": r.intro, "status": r.status, "apply_no": r.apply_no,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@router.get("/resumes", dependencies=[Depends(resume_view)])
def list_resumes(
    status: str | None = None, job_id: int | None = None, kw: str | None = None,
    db: Session = Depends(get_db), p: PaginationParams = Depends(),
):
    """简历列表（岗位/状态/关键词筛选）。"""
    q = db.query(Resumes)
    if status:
        q = q.filter(Resumes.status == status)
    if job_id:
        q = q.filter(Resumes.job_id == job_id)
    if kw:
        like = f"%{kw.strip()}%"
        q = q.filter(or_(Resumes.name.like(like), Resumes.phone.like(like)))
    total = q.count()
    rows = q.order_by(Resumes.id.desc()).offset(p.offset).limit(p.page_size).all()
    return ok(paginate([_resume_out(x, db) for x in rows], total, p))


class ResumeStatusIn(BaseModel):
    status: str                           # screened/interviewing/hired/rejected


@router.put("/resumes/{resume_id}/status", dependencies=[Depends(resume_status)])
def set_resume_status(resume_id: int, body: ResumeStatusIn, db: Session = Depends(get_db)):
    """简历状态流转（submitted→screened→interviewing→hired/rejected，PRD 7.3.5）。"""
    row = db.get(Resumes, resume_id)
    if not row:
        raise BizError(NOT_FOUND, "简历不存在")
    if body.status not in ("screened", "interviewing", "hired", "rejected"):
        raise BizError(40000, "状态不合法")
    row.status = body.status
    db.commit()
    return ok({"id": row.id, "status": row.status})
