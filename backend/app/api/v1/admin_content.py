"""后台内容管理接口（技术文档 §6.6.3 / PRD 7.2）。

实现说明：
- 新闻 CRUD（置顶/草稿/发布/下线：is_published + expire_at 双态，PRD 7.2.1）；
- 案例 CRUD（关联产品 product_ids + 工程案例标记）；
- Banner CRUD、门店 CRUD、FAQ CRUD；
- 首页页面配置 GET/PUT（Banner 排序/品牌卖点/数据背书/精选案例，PRD 7.2.1）、关于品牌维护；
- 权限：content:view / content:edit（RBAC）。
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.exceptions import NOT_FOUND, BizError, ok
from app.db.session import get_db
from app.models import Banners, Cases, Faqs, Milestones, News, SiteConfigs, Stores
from app.utils.pagination import PaginationParams, paginate

router = APIRouter(prefix="/admin", tags=["后台-内容管理"])

view_perm = require_permission("content:view")
edit_perm = require_permission("content:edit")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------- 新闻 ----------
class NewsIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    category: str = "company_news"        # company_news / industry_news
    cover: str | None = None
    summary: str | None = Field(default=None, max_length=500)
    content_html: str = ""
    author: str | None = None
    source: str | None = None
    is_published: bool = False
    is_top: bool = False
    expire_at: str | None = None          # ISO 时间，NULL=长期有效


def _news_admin_out(n: News) -> dict:
    return {
        "id": n.id, "title": n.title, "category": n.category, "cover": n.cover,
        "summary": n.summary, "author": n.author, "source": n.source,
        "is_published": n.is_published, "is_top": n.is_top,
        "expire_at": n.expire_at.isoformat() if n.expire_at else None,
        "view_count": n.view_count,
        "publish_time": n.publish_time.isoformat() if n.publish_time else None,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }


@router.get("/news", dependencies=[Depends(view_perm)])
def list_news(
    category: str | None = None,
    is_published: bool | None = None,
    kw: str | None = None,
    db: Session = Depends(get_db),
    p: PaginationParams = Depends(),
):
    """新闻列表（分类/发布态/关键词筛选）。"""
    q = db.query(News)
    if category:
        q = q.filter(News.category == category)
    if is_published is not None:
        q = q.filter(News.is_published.is_(is_published))
    if kw:
        like = f"%{kw.strip()}%"
        q = q.filter(News.title.like(like))
    total = q.count()
    items = q.order_by(News.is_top.desc(), News.publish_time.desc().nullslast(), News.id.desc()).offset(p.offset).limit(p.page_size).all()
    return ok(paginate([_news_admin_out(x) for x in items], total, p))


@router.post("/news", dependencies=[Depends(edit_perm)])
def create_news(body: NewsIn, db: Session = Depends(get_db)):
    """新建新闻（is_published=True 时自动置发布/过期时间）。"""
    row = News(**body.model_dump(exclude={"expire_at"}))
    if body.expire_at:
        row.expire_at = datetime.fromisoformat(body.expire_at)
    if body.is_published:
        row.publish_time = utcnow()
    db.add(row)
    db.commit()
    db.refresh(row)
    return ok({"id": row.id})


@router.get("/news/{news_id}", dependencies=[Depends(view_perm)])
def get_news(news_id: int, db: Session = Depends(get_db)):
    """新闻详情（后台）。"""
    row = db.get(News, news_id)
    if not row:
        raise BizError(NOT_FOUND, "新闻不存在")
    data = _news_admin_out(row)
    data["content_html"] = row.content_html
    return ok(data)


@router.put("/news/{news_id}", dependencies=[Depends(edit_perm)])
def update_news(news_id: int, body: NewsIn, db: Session = Depends(get_db)):
    """编辑新闻（置顶/草稿发布下线）。"""
    row = db.get(News, news_id)
    if not row:
        raise BizError(NOT_FOUND, "新闻不存在")
    for k, v in body.model_dump(exclude={"expire_at"}).items():
        setattr(row, k, v)
    row.expire_at = datetime.fromisoformat(body.expire_at) if body.expire_at else None
    # 从草稿转为发布时补发布时间；未发布清空发布时间
    row.publish_time = utcnow() if body.is_published and not row.publish_time else row.publish_time
    db.commit()
    return ok({"id": row.id})


@router.delete("/news/{news_id}", dependencies=[Depends(edit_perm)])
def delete_news(news_id: int, db: Session = Depends(get_db)):
    """删除新闻。"""
    row = db.get(News, news_id)
    if not row:
        raise BizError(NOT_FOUND, "新闻不存在")
    db.delete(row)
    db.commit()
    return ok({"deleted": True})


# ---------- 案例 ----------
class CaseIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    cover: str | None = None
    area: str | None = None
    house_type: str | None = None
    style_tags: str | None = None
    space: str | None = None
    location_desc: str | None = None
    content_html: str = ""
    product_ids: list[int] | None = None
    is_engineering: bool = False
    customer_review: str | None = None
    sort: int = 0
    is_activate: bool = True


def _case_admin_out(c: Cases) -> dict:
    return {
        "id": c.id, "title": c.title, "cover": c.cover, "area": c.area,
        "house_type": c.house_type, "style_tags": c.style_tags, "space": c.space,
        "location_desc": c.location_desc, "product_ids": c.product_ids or [],
        "is_engineering": c.is_engineering, "customer_review": c.customer_review,
        "sort": c.sort, "is_activate": c.is_activate, "view_count": c.view_count,
    }


@router.get("/cases", dependencies=[Depends(view_perm)])
def list_cases(
    is_engineering: bool | None = None,
    kw: str | None = None,
    db: Session = Depends(get_db),
    p: PaginationParams = Depends(),
):
    """案例列表（工程案例标记/关键词筛选）。"""
    q = db.query(Cases)
    if is_engineering is not None:
        q = q.filter(Cases.is_engineering.is_(is_engineering))
    if kw:
        q = q.filter(Cases.title.like(f"%{kw.strip()}%"))
    total = q.count()
    items = q.order_by(Cases.sort.asc(), Cases.id.desc()).offset(p.offset).limit(p.page_size).all()
    return ok(paginate([_case_admin_out(x) for x in items], total, p))


@router.post("/cases", dependencies=[Depends(edit_perm)])
def create_case(body: CaseIn, db: Session = Depends(get_db)):
    """新建案例。"""
    row = Cases(**body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return ok({"id": row.id})


@router.get("/cases/{case_id}", dependencies=[Depends(view_perm)])
def get_case(case_id: int, db: Session = Depends(get_db)):
    """案例详情（后台）。"""
    row = db.get(Cases, case_id)
    if not row:
        raise BizError(NOT_FOUND, "案例不存在")
    data = _case_admin_out(row)
    data["content_html"] = row.content_html
    return ok(data)


@router.put("/cases/{case_id}", dependencies=[Depends(edit_perm)])
def update_case(case_id: int, body: CaseIn, db: Session = Depends(get_db)):
    """编辑案例。"""
    row = db.get(Cases, case_id)
    if not row:
        raise BizError(NOT_FOUND, "案例不存在")
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    db.commit()
    return ok({"id": row.id})


@router.delete("/cases/{case_id}", dependencies=[Depends(edit_perm)])
def delete_case(case_id: int, db: Session = Depends(get_db)):
    """删除案例。"""
    row = db.get(Cases, case_id)
    if not row:
        raise BizError(NOT_FOUND, "案例不存在")
    db.delete(row)
    db.commit()
    return ok({"deleted": True})


# ---------- Banner ----------
class BannerIn(BaseModel):
    image: str = Field(min_length=1, max_length=255)
    title: str | None = None
    subtitle: str | None = None
    button_text: str | None = Field(default=None, max_length=20)
    link_url: str | None = None
    sort: int = 0
    is_activate: bool = True


@router.get("/banners", dependencies=[Depends(view_perm)])
def list_banners(db: Session = Depends(get_db)):
    """Banner 列表。"""
    rows = db.query(Banners).order_by(Banners.sort.asc()).all()
    return ok([
        {"id": b.id, "image": b.image, "title": b.title, "subtitle": b.subtitle,
         "button_text": b.button_text, "link_url": b.link_url, "sort": b.sort, "is_activate": b.is_activate}
        for b in rows
    ])


@router.post("/banners", dependencies=[Depends(edit_perm)])
def create_banner(body: BannerIn, db: Session = Depends(get_db)):
    """新建 Banner。"""
    row = Banners(**body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return ok({"id": row.id})


@router.put("/banners/{banner_id}", dependencies=[Depends(edit_perm)])
def update_banner(banner_id: int, body: BannerIn, db: Session = Depends(get_db)):
    """编辑 Banner。"""
    row = db.get(Banners, banner_id)
    if not row:
        raise BizError(NOT_FOUND, "Banner 不存在")
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    db.commit()
    return ok({"id": row.id})


@router.delete("/banners/{banner_id}", dependencies=[Depends(edit_perm)])
def delete_banner(banner_id: int, db: Session = Depends(get_db)):
    """删除 Banner。"""
    row = db.get(Banners, banner_id)
    if not row:
        raise BizError(NOT_FOUND, "Banner 不存在")
    db.delete(row)
    db.commit()
    return ok({"deleted": True})


# ---------- 门店 ----------
class StoreIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    address: str = Field(min_length=1, max_length=255)
    lat: float | None = None
    lng: float | None = None
    phone: str | None = None
    business_hours: str | None = None
    image: str | None = None
    sort: int = 0
    is_activate: bool = True


@router.get("/stores", dependencies=[Depends(view_perm)])
def list_stores(db: Session = Depends(get_db)):
    """门店列表。"""
    rows = db.query(Stores).order_by(Stores.sort.asc()).all()
    return ok([
        {"id": s.id, "name": s.name, "address": s.address, "lat": float(s.lat) if s.lat else None,
         "lng": float(s.lng) if s.lng else None, "phone": s.phone, "business_hours": s.business_hours,
         "image": s.image, "sort": s.sort, "is_activate": s.is_activate}
        for s in rows
    ])


@router.post("/stores", dependencies=[Depends(edit_perm)])
def create_store(body: StoreIn, db: Session = Depends(get_db)):
    """新建门店。"""
    row = Stores(**body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return ok({"id": row.id})


@router.put("/stores/{store_id}", dependencies=[Depends(edit_perm)])
def update_store(store_id: int, body: StoreIn, db: Session = Depends(get_db)):
    """编辑门店。"""
    row = db.get(Stores, store_id)
    if not row:
        raise BizError(NOT_FOUND, "门店不存在")
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    db.commit()
    return ok({"id": row.id})


@router.delete("/stores/{store_id}", dependencies=[Depends(edit_perm)])
def delete_store(store_id: int, db: Session = Depends(get_db)):
    """删除门店。"""
    row = db.get(Stores, store_id)
    if not row:
        raise BizError(NOT_FOUND, "门店不存在")
    db.delete(row)
    db.commit()
    return ok({"deleted": True})


# ---------- FAQ ----------
class FaqIn(BaseModel):
    question: str = Field(min_length=1, max_length=255)
    answer: str = Field(min_length=1)
    sort: int = 0
    is_activate: bool = True


@router.get("/faqs", dependencies=[Depends(view_perm)])
def list_faqs(db: Session = Depends(get_db)):
    """FAQ 列表。"""
    rows = db.query(Faqs).order_by(Faqs.sort.asc()).all()
    return ok([
        {"id": f.id, "question": f.question, "answer": f.answer, "sort": f.sort, "is_activate": f.is_activate}
        for f in rows
    ])


@router.post("/faqs", dependencies=[Depends(edit_perm)])
def create_faq(body: FaqIn, db: Session = Depends(get_db)):
    """新建 FAQ。"""
    row = Faqs(**body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return ok({"id": row.id})


@router.put("/faqs/{faq_id}", dependencies=[Depends(edit_perm)])
def update_faq(faq_id: int, body: FaqIn, db: Session = Depends(get_db)):
    """编辑 FAQ。"""
    row = db.get(Faqs, faq_id)
    if not row:
        raise BizError(NOT_FOUND, "FAQ 不存在")
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    db.commit()
    return ok({"id": row.id})


@router.delete("/faqs/{faq_id}", dependencies=[Depends(edit_perm)])
def delete_faq(faq_id: int, db: Session = Depends(get_db)):
    """删除 FAQ。"""
    row = db.get(Faqs, faq_id)
    if not row:
        raise BizError(NOT_FOUND, "FAQ 不存在")
    db.delete(row)
    db.commit()
    return ok({"deleted": True})


# ---------- 首页页面配置 / 关于品牌（PRD 7.2.1）----------
class HomeConfigIn(BaseModel):
    home_brand_points: list | None = None      # 品牌卖点
    home_stats: list | None = None             # 数据背书
    home_featured_case_ids: list[int] | None = None  # 精选案例 ID


class AboutIn(BaseModel):
    about_tp_html: str | None = None
    brand_intro_html: str | None = None
    honors: list | None = None
    company_video: str | None = None


def _set_config(db: Session, key: str, value) -> None:
    row = db.query(SiteConfigs).filter(SiteConfigs.key == key).first()
    if row:
        row.value = value
    else:
        db.add(SiteConfigs(key=key, value=value))


def _get_config(db: Session, key: str, default=None):
    row = db.query(SiteConfigs).filter(SiteConfigs.key == key).first()
    return row.value if row else default


@router.get("/site-config/home", dependencies=[Depends(view_perm)])
def get_home_config(db: Session = Depends(get_db)):
    """首页页面配置读取。"""
    return ok({
        "home_brand_points": _get_config(db, "home_brand_points", []),
        "home_stats": _get_config(db, "home_stats", []),
        "home_featured_case_ids": _get_config(db, "home_featured_case_ids", []),
    })


@router.put("/site-config/home", dependencies=[Depends(edit_perm)])
def put_home_config(body: HomeConfigIn, db: Session = Depends(get_db)):
    """首页页面配置保存。"""
    for key, value in body.model_dump().items():
        if value is not None:
            _set_config(db, key, value)
    db.commit()
    return ok({"saved": True})


@router.get("/about", dependencies=[Depends(view_perm)])
def get_about(db: Session = Depends(get_db)):
    """关于品牌配置读取。"""
    return ok({
        "about_tp_html": _get_config(db, "about_tp_html", ""),
        "brand_intro_html": _get_config(db, "brand_intro_html", ""),
        "honors": _get_config(db, "honors", []),
        "company_video": _get_config(db, "company_video", ""),
    })


@router.put("/about", dependencies=[Depends(edit_perm)])
def put_about(body: AboutIn, db: Session = Depends(get_db)):
    """关于品牌配置保存。"""
    for key, value in body.model_dump().items():
        if value is not None:
            _set_config(db, key, value)
    db.commit()
    return ok({"saved": True})


# ---------- 发展历程（P2 档基础 CRUD）----------
class MilestoneIn(BaseModel):
    year: str = Field(min_length=1, max_length=10)
    title: str = Field(min_length=1, max_length=100)
    description: str | None = None
    image: str | None = None
    sort: int = 0


@router.get("/milestones", dependencies=[Depends(view_perm)])
def list_milestones(db: Session = Depends(get_db)):
    """发展历程列表。"""
    rows = db.query(Milestones).order_by(Milestones.year.asc(), Milestones.sort.asc()).all()
    return ok([
        {"id": m.id, "year": m.year, "title": m.title, "description": m.description, "image": m.image, "sort": m.sort}
        for m in rows
    ])


@router.post("/milestones", dependencies=[Depends(edit_perm)])
def create_milestone(body: MilestoneIn, db: Session = Depends(get_db)):
    """新建发展历程。"""
    row = Milestones(**body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return ok({"id": row.id})


@router.put("/milestones/{ms_id}", dependencies=[Depends(edit_perm)])
def update_milestone(ms_id: int, body: MilestoneIn, db: Session = Depends(get_db)):
    """编辑发展历程。"""
    row = db.get(Milestones, ms_id)
    if not row:
        raise BizError(NOT_FOUND, "发展历程不存在")
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    db.commit()
    return ok({"id": row.id})


@router.delete("/milestones/{ms_id}", dependencies=[Depends(edit_perm)])
def delete_milestone(ms_id: int, db: Session = Depends(get_db)):
    """删除发展历程。"""
    row = db.get(Milestones, ms_id)
    if not row:
        raise BizError(NOT_FOUND, "发展历程不存在")
    db.delete(row)
    db.commit()
    return ok({"deleted": True})
