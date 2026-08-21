"""前台招聘接口（PRD 6.10 / 技术文档 §6.2.6）。

实现说明：
- GET /jobs：岗位列表（类型/关键词筛选 + 分页，仅 active）；
- GET /jobs/{id}：岗位详情；
- POST /resumes：投递（同岗位手机号唯一 uq_resumes_job_phone；返回 apply_no 供游客查询，PRD 6.10.3 V1.3）；
- GET /resumes/query：投递进度查询（apply_no + 手机号后 4 位，PRD 6.10.3 V1.3）。
"""
import random
import string

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import get_optional_user
from app.core.exceptions import CONFLICT, NOT_FOUND, BizError, ok
from app.db.session import get_db
from app.models import Jobs, Resumes, Users
from app.utils.pagination import PaginationParams, paginate

router = APIRouter(tags=["前台-招聘"])


def _gen_apply_no() -> str:
    """生成投递查询号（TP + 6 位字母数字，防猜解）。"""
    return "TP" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


def _job_out(j: Jobs) -> dict:
    return {
        "id": j.id, "title": j.title, "department": j.department, "location": j.location,
        "type": j.type, "salary": j.salary, "tags": j.tags,
        "publish_time": j.publish_time.isoformat() if j.publish_time else None,
    }


@router.get("/jobs")
def list_jobs(
    type: str | None = None,
    kw: str | None = None,
    db: Session = Depends(get_db),
    p: PaginationParams = Depends(),
):
    """岗位列表（社会/校园筛选 + 关键词，仅 active 岗位，PRD 6.10.1）。"""
    q = db.query(Jobs).filter(Jobs.is_activate.is_(True), Jobs.status == "active")
    if type:
        q = q.filter(Jobs.type == type)
    if kw:
        like = f"%{kw.strip()}%"
        q = q.filter(or_(Jobs.title.like(like), Jobs.department.like(like)))
    total = q.count()
    rows = q.order_by(Jobs.publish_time.desc().nullslast(), Jobs.id.desc()).offset(p.offset).limit(p.page_size).all()
    return ok(paginate([_job_out(j) for j in rows], total, p))


@router.get("/jobs/{job_id}")
def get_job(job_id: int, db: Session = Depends(get_db)):
    """岗位详情（含职责/要求，40400 不存在或已下线）。"""
    j = db.query(Jobs).filter(Jobs.id == job_id, Jobs.is_activate.is_(True), Jobs.status == "active").first()
    if not j:
        raise BizError(NOT_FOUND, "岗位不存在或已下线")
    data = _job_out(j)
    data.update({"duty": j.duty or "", "requirement": j.requirement or ""})
    return ok(data)


class ResumeIn(BaseModel):
    """简历投递入参（PRD 6.10.2）。"""

    job_id: int
    name: str = Field(min_length=1, max_length=50)
    phone: str
    email: str | None = None
    education: str | None = None
    school: str | None = None
    work_years: str | None = None
    intro: str | None = None


class ResumeQueryIn(BaseModel):
    """投递进度查询入参（apply_no + 手机号后 4 位，PRD 6.10.3 V1.3）。"""

    apply_no: str
    phone_tail: str = Field(min_length=4, max_length=4)


@router.post("/resumes")
def submit_resume(body: ResumeIn, db: Session = Depends(get_db), user: Users | None = Depends(get_optional_user)):
    """简历投递（同岗位手机号唯一，40900 已投递；返回 apply_no 供游客查询）。"""
    job = db.query(Jobs).filter(Jobs.id == body.job_id, Jobs.is_activate.is_(True), Jobs.status == "active").first()
    if not job:
        raise BizError(NOT_FOUND, "岗位不存在或已下线")
    existed = db.query(Resumes).filter(Resumes.job_id == body.job_id, Resumes.phone == body.phone).first()
    if existed:
        raise BizError(CONFLICT, "您已投递该岗位，请勿重复投递")
    row = Resumes(
        job_id=body.job_id,
        user_id=user.id if user else None,
        name=body.name, phone=body.phone, email=body.email,
        education=body.education, school=body.school, work_years=body.work_years,
        intro=body.intro, apply_no=_gen_apply_no(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return ok({"id": row.id, "apply_no": row.apply_no})


@router.post("/resumes/query")
def query_resume(body: ResumeQueryIn, db: Session = Depends(get_db)):
    """投递进度查询（apply_no + 手机号后 4 位，PRD 6.10.3 V1.3）。"""
    row = db.query(Resumes).filter(Resumes.apply_no == body.apply_no).first()
    if not row or not row.phone.endswith(body.phone_tail):
        raise BizError(NOT_FOUND, "未查询到投递记录，请核对查询号")
    job = db.get(Jobs, row.job_id)
    status_map = {"submitted": "已投递", "screened": "简历筛选中", "interviewing": "面试中", "hired": "已录用", "rejected": "未通过"}
    return ok({
        "job_title": job.title if job else "",
        "status": row.status, "status_label": status_map.get(row.status, row.status),
        "applied_at": row.created_at.isoformat() if row.created_at else None,
    })
