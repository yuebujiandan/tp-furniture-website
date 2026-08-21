"""前台线索提交接口（P4 档：留言 + 预约 + 游客留言查询 + 加盟/询价/工程；技术文档 §6.2.4）。

实现说明：
- POST /messages：留言/在线咨询（双入口同表，技术文档 §1.3 校准），登录用户关联 user_id；
- POST /messages/query：游客留言查询（手机号 + 短信验证码，PRD 6.6.4）；
- POST /appointments：预约（4 类，PRD 6.8.2），可带产品/案例/门店；
- POST /franchise-applications：加盟申请（PRD 6.9.3）；
- POST /inquiries：批量询价（PRD 6.9.2，items 为清单 JSON 快照）；
- POST /engineering-requests：工程定制需求（PRD 6.9.4）；
- 手机号格式校验（40001）。
"""
import re

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_optional_user
from app.core.exceptions import PHONE_FORMAT_ERROR, VERIFY_CODE_ERROR, BizError, ok
from app.db.session import get_db
from app.models import (
    Appointments,
    EngineeringRequests,
    FranchiseApplications,
    Inquiries,
    Messages,
    Users,
)
from app.utils import verify_code as vc

router = APIRouter(tags=["前台-线索"])

PHONE_RE = re.compile(r"^1[3-9]\d{9}$")


def _check_phone(phone: str) -> None:
    """手机号格式校验（40001）。"""
    if not PHONE_RE.match(phone):
        raise BizError(PHONE_FORMAT_ERROR, "手机号格式错误")


class MessageIn(BaseModel):
    """留言/在线咨询入参。"""

    type: str = "message"                 # message / consult
    source: str = "contact_page"          # contact_page / float_window
    name: str = Field(min_length=1, max_length=50)
    phone: str
    category: str | None = None
    content: str = Field(min_length=1, max_length=2000)


class MessageQueryIn(BaseModel):
    """游客留言查询入参（手机号 + 验证码，PRD 6.6.4）。"""

    phone: str
    code: str


class AppointmentIn(BaseModel):
    """预约入参（PRD 6.8.2 统一 4 类）。"""

    type: str                             # visit/designer/measure/case_design
    name: str = Field(min_length=1, max_length=50)
    phone: str
    expect_date: str                      # YYYY-MM-DD
    expect_time: str | None = None
    city: str | None = None
    store_id: int | None = None
    product_id: int | None = None
    case_id: int | None = None
    remark: str | None = Field(default=None, max_length=500)


class FranchiseIn(BaseModel):
    """加盟申请入参（PRD 6.9.3）。"""

    name: str = Field(min_length=1, max_length=50)
    phone: str
    city: str = Field(min_length=1, max_length=50)
    invest_amount: str | None = None
    area: str | None = None
    current_status: str | None = None      # new_shop / existing_shop
    remark: str | None = None


class InquiryIn(BaseModel):
    """批量询价入参（PRD 6.9.2）。"""

    company: str = Field(min_length=1, max_length=100)
    contact: str = Field(min_length=1, max_length=50)
    phone: str
    email: str | None = None
    purpose: str = "self_use"             # self_use / project / wholesale
    items: list = Field(default_factory=list)   # [{id, name, qty, note}]
    expect_time: str | None = None


class EngineeringIn(BaseModel):
    """工程定制需求入参（PRD 6.9.4）。"""

    company: str = Field(min_length=1, max_length=100)
    contact: str = Field(min_length=1, max_length=50)
    phone: str
    project_type: str = "other"           # hotel/office/commercial/school/other
    location: str | None = None
    scale: str | None = None
    deadline: str | None = None
    description: str | None = None


@router.post("/messages")
def create_message(body: MessageIn, db: Session = Depends(get_db), user: Users | None = Depends(get_optional_user)):
    """留言提交（游客/登录均可；登录用户自动关联 user_id，个人中心可见）。"""
    _check_phone(body.phone)
    row = Messages(
        type=body.type,
        source=body.source,
        user_id=user.id if user else None,  # 登录用户关联（PRD 6.7.2 我的留言）
        name=body.name,
        phone=body.phone,
        category=body.category,
        content=body.content,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return ok({"id": row.id})


@router.post("/messages/query")
def query_messages(body: MessageQueryIn, db: Session = Depends(get_db)):
    """游客留言查询：手机号 + 验证码（PRD 6.6.4；40002 验证码错误或过期）。"""
    _check_phone(body.phone)
    if not vc.verify_code(f"sms:{body.phone}", body.code):
        raise BizError(VERIFY_CODE_ERROR, "验证码错误或过期")
    rows = db.query(Messages).filter(Messages.phone == body.phone).order_by(Messages.id.desc()).limit(20).all()
    return ok([
        {
            "id": m.id, "type": m.type, "source": m.source, "content": m.content,
            "status": m.status, "reply": m.reply,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in rows
    ])


@router.post("/appointments")
def create_appointment(body: AppointmentIn, db: Session = Depends(get_db), user: Users | None = Depends(get_optional_user)):
    """预约提交（游客/登录均可，登录用户自动关联 user_id，status 默认 pending，PRD 6.8.2）。"""
    from datetime import date

    _check_phone(body.phone)
    try:
        expect_date = date.fromisoformat(body.expect_date)
    except ValueError:
        raise BizError(40000, "期望日期格式错误（YYYY-MM-DD）")
    if body.type not in ("visit", "designer", "measure", "case_design"):
        raise BizError(40000, "预约类型不合法")

    row = Appointments(
        user_id=user.id if user else None,  # 登录用户关联（我的预约，PRD 6.8.4）
        name=body.name,
        phone=body.phone,
        type=body.type,
        city=body.city,
        store_id=body.store_id,
        product_id=body.product_id,
        case_id=body.case_id,
        expect_date=expect_date,
        expect_time=body.expect_time,
        remark=body.remark,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return ok({"id": row.id, "status": row.status})


@router.post("/franchise-applications")
def create_franchise(body: FranchiseIn, db: Session = Depends(get_db), user: Users | None = Depends(get_optional_user)):
    """加盟申请提交（游客/登录均可，status 默认 pending，PRD 6.9.3）。"""
    _check_phone(body.phone)
    row = FranchiseApplications(
        user_id=user.id if user else None,
        name=body.name, phone=body.phone, city=body.city,
        invest_amount=body.invest_amount, area=body.area,
        current_status=body.current_status, remark=body.remark,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return ok({"id": row.id, "status": row.status})


@router.post("/inquiries")
def create_inquiry(body: InquiryIn, db: Session = Depends(get_db), user: Users | None = Depends(get_optional_user)):
    """批量询价提交（items 为清单 JSON 快照，PRD 6.9.2）。"""
    _check_phone(body.phone)
    if body.purpose not in ("self_use", "project", "wholesale"):
        raise BizError(40000, "用途类型不合法")
    row = Inquiries(
        user_id=user.id if user else None,
        company=body.company, contact=body.contact, phone=body.phone, email=body.email,
        purpose=body.purpose, items=body.items, expect_time=body.expect_time,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return ok({"id": row.id, "status": row.status})


@router.post("/engineering-requests")
def create_engineering(body: EngineeringIn, db: Session = Depends(get_db), user: Users | None = Depends(get_optional_user)):
    """工程定制需求提交（PRD 6.9.4）。"""
    _check_phone(body.phone)
    if body.project_type not in ("hotel", "office", "commercial", "school", "other"):
        raise BizError(40000, "工程类型不合法")
    row = EngineeringRequests(
        user_id=user.id if user else None,
        company=body.company, contact=body.contact, phone=body.phone,
        project_type=body.project_type, location=body.location, scale=body.scale,
        deadline=body.deadline, description=body.description,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return ok({"id": row.id, "status": row.status})
