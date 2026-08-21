"""后台公告与政策文档管理接口（技术文档 §6.6.10 / PRD 7.3.6）。

实现说明：
- 公告 CRUD（scope=all/dealer + dealer_ids 指定经销商 JSON；draft/published 双态，发布自动置时间）；
- 政策文档 CRUD（合作政策下载，sort 排序）；
- 权限：content:view / content:edit。
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.exceptions import NOT_FOUND, BizError, ok
from app.db.session import get_db
from app.models import Announcements, Documents
from app.utils.pagination import PaginationParams, paginate

router = APIRouter(prefix="/admin", tags=["后台-公告文档"])

view_perm = require_permission("content:view")
edit_perm = require_permission("content:edit")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------- 公告 ----------
class AnnouncementIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content_html: str = ""
    scope: str = "all"                    # all / dealer
    dealer_ids: list[int] | None = None   # scope=dealer 时指定经销商
    status: str = "draft"                 # draft / published


@router.get("/announcements", dependencies=[Depends(view_perm)])
def list_announcements(
    scope: str | None = None, status: str | None = None,
    db: Session = Depends(get_db), p: PaginationParams = Depends(),
):
    """公告列表。"""
    q = db.query(Announcements)
    if scope:
        q = q.filter(Announcements.scope == scope)
    if status:
        q = q.filter(Announcements.status == status)
    total = q.count()
    rows = q.order_by(Announcements.id.desc()).offset(p.offset).limit(p.page_size).all()
    return ok(paginate([
        {"id": a.id, "title": a.title, "scope": a.scope, "dealer_ids": a.dealer_ids or [],
         "status": a.status, "publish_time": a.publish_time.isoformat() if a.publish_time else None,
         "created_at": a.created_at.isoformat() if a.created_at else None}
        for a in rows
    ], total, p))


@router.post("/announcements", dependencies=[Depends(edit_perm)])
def create_announcement(body: AnnouncementIn, db: Session = Depends(get_db)):
    """新建公告。"""
    row = Announcements(**body.model_dump())
    if row.status == "published":
        row.publish_time = utcnow()
    db.add(row)
    db.commit()
    db.refresh(row)
    return ok({"id": row.id})


@router.get("/announcements/{ann_id}", dependencies=[Depends(view_perm)])
def get_announcement(ann_id: int, db: Session = Depends(get_db)):
    """公告详情。"""
    row = db.get(Announcements, ann_id)
    if not row:
        raise BizError(NOT_FOUND, "公告不存在")
    data = {"id": row.id, "title": row.title, "scope": row.scope, "dealer_ids": row.dealer_ids or [],
            "status": row.status, "publish_time": row.publish_time.isoformat() if row.publish_time else None}
    data["content_html"] = row.content_html
    return ok(data)


@router.put("/announcements/{ann_id}", dependencies=[Depends(edit_perm)])
def update_announcement(ann_id: int, body: AnnouncementIn, db: Session = Depends(get_db)):
    """编辑公告（草稿→发布自动置时间）。"""
    row = db.get(Announcements, ann_id)
    if not row:
        raise BizError(NOT_FOUND, "公告不存在")
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    if row.status == "published" and not row.publish_time:
        row.publish_time = utcnow()
    db.commit()
    return ok({"id": row.id})


@router.delete("/announcements/{ann_id}", dependencies=[Depends(edit_perm)])
def delete_announcement(ann_id: int, db: Session = Depends(get_db)):
    """删除公告。"""
    row = db.get(Announcements, ann_id)
    if not row:
        raise BizError(NOT_FOUND, "公告不存在")
    db.delete(row)
    db.commit()
    return ok({"deleted": True})


# ---------- 政策文档 ----------
class DocumentIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    file_url: str = Field(min_length=1, max_length=255)
    file_size: int | None = None
    sort: int = 0


@router.get("/documents", dependencies=[Depends(view_perm)])
def list_documents(db: Session = Depends(get_db)):
    """政策文档列表。"""
    rows = db.query(Documents).order_by(Documents.sort.asc()).all()
    return ok([
        {"id": d.id, "title": d.title, "file_url": d.file_url, "file_size": d.file_size, "sort": d.sort}
        for d in rows
    ])


@router.post("/documents", dependencies=[Depends(edit_perm)])
def create_document(body: DocumentIn, db: Session = Depends(get_db)):
    """新建文档。"""
    row = Documents(**body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return ok({"id": row.id})


@router.put("/documents/{doc_id}", dependencies=[Depends(edit_perm)])
def update_document(doc_id: int, body: DocumentIn, db: Session = Depends(get_db)):
    """编辑文档。"""
    row = db.get(Documents, doc_id)
    if not row:
        raise BizError(NOT_FOUND, "文档不存在")
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    db.commit()
    return ok({"id": row.id})


@router.delete("/documents/{doc_id}", dependencies=[Depends(edit_perm)])
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    """删除文档。"""
    row = db.get(Documents, doc_id)
    if not row:
        raise BizError(NOT_FOUND, "文档不存在")
    db.delete(row)
    db.commit()
    return ok({"deleted": True})
