"""后台留言/咨询管理接口（技术文档 §6.6.4 / PRD 7.3.1）。

实现说明：
- GET /admin/messages：留言列表（type+source 双字段筛选，前台来源行前端金色高亮）；
- PUT /admin/messages/{id}/handle：处理（reply + status=handled）；
- 权限：message:handle（销售客服及以上）。
"""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.exceptions import NOT_FOUND, BizError, ok
from app.db.session import get_db
from app.models import Messages
from app.utils.pagination import PaginationParams, paginate

router = APIRouter(prefix="/admin", tags=["后台-留言管理"])

handle_perm = require_permission("message:handle")


class MessageHandleIn(BaseModel):
    reply: str = Field(min_length=1, max_length=2000)
    status: str = "handled"


def _msg_out(m: Messages) -> dict:
    return {
        "id": m.id,
        "type": m.type,               # message / consult（双字段口径，技术文档 §1.3）
        "source": m.source,           # contact_page / float_window
        "name": m.name,
        "phone": m.phone,
        "category": m.category,
        "content": m.content,
        "status": m.status,
        "reply": m.reply,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "handled_at": m.handled_at.isoformat() if m.handled_at else None,
    }


@router.get("/messages", dependencies=[Depends(handle_perm)])
def list_messages(
    type: str | None = Query(None, description="message/consult"),
    source: str | None = Query(None, description="contact_page/float_window"),
    status: str | None = Query(None, description="pending/handled"),
    kw: str | None = Query(None, description="关键词（姓名/手机号/内容）"),
    db: Session = Depends(get_db),
    p: PaginationParams = Depends(),
):
    """留言列表（双字段筛选，PRD 7.3.1 V1.8：前台来源行金色高亮）。"""
    q = db.query(Messages)
    if type:
        q = q.filter(Messages.type == type)
    if source:
        q = q.filter(Messages.source == source)
    if status:
        q = q.filter(Messages.status == status)
    if kw:
        like = f"%{kw.strip()}%"
        q = q.filter(Messages.name.like(like) | Messages.phone.like(like) | Messages.content.like(like))
    total = q.count()
    items = q.order_by(Messages.id.desc()).offset(p.offset).limit(p.page_size).all()
    return ok(paginate([_msg_out(x) for x in items], total, p))


@router.put("/messages/{message_id}/handle", dependencies=[Depends(handle_perm)])
def handle_message(message_id: int, body: MessageHandleIn, db: Session = Depends(get_db)):
    """处理留言：填写回复并置为已处理。"""
    from datetime import datetime, timezone

    row = db.get(Messages, message_id)
    if not row:
        raise BizError(NOT_FOUND, "留言不存在")
    row.reply = body.reply
    row.status = body.status
    row.handled_at = datetime.now(timezone.utc)
    db.commit()
    return ok({"id": row.id, "status": row.status})
