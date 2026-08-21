"""前台内容展示接口：关于我们 / 发展历程 / 门店 / FAQ（技术文档 §6.5 / PRD 6.6）。

实现说明：
- GET /about：关于 TP/品牌介绍/荣誉（site_configs 驱动，后台可维护）；
- GET /milestones：发展历程时间轴（启用 + 年份排序）；
- GET /stores：门店列表（启用 + 排序，含经纬度供地图标注）；
- GET /faqs：常见问题（启用 + 排序）。
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.exceptions import ok
from app.db.session import get_db
from app.models import Faqs, Milestones, SiteConfigs, Stores

router = APIRouter(tags=["前台-内容"])


def _get_config(db: Session, key: str, default=None):
    row = db.query(SiteConfigs).filter(SiteConfigs.key == key).first()
    return row.value if row else default


@router.get("/about")
def about(db: Session = Depends(get_db)):
    """关于我们聚合：品牌介绍/荣誉/企业视频。"""
    return ok({
        "about_tp_html": _get_config(db, "about_tp_html", ""),
        "brand_intro_html": _get_config(db, "brand_intro_html", ""),
        "honors": _get_config(db, "honors", []),
        "company_video": _get_config(db, "company_video", ""),
    })


@router.get("/milestones")
def milestones(db: Session = Depends(get_db)):
    """发展历程时间轴。"""
    rows = db.query(Milestones).filter(Milestones.is_activate.is_(True)).order_by(Milestones.year.asc(), Milestones.sort.asc()).all()
    return ok([
        {"id": m.id, "year": m.year, "title": m.title, "description": m.description, "image": m.image}
        for m in rows
    ])


@router.get("/stores")
def stores(db: Session = Depends(get_db)):
    """门店列表（含经纬度，供地图标点；R5 降级静态图）。"""
    rows = db.query(Stores).filter(Stores.is_activate.is_(True)).order_by(Stores.sort.asc()).all()
    return ok([
        {"id": s.id, "name": s.name, "address": s.address, "lat": float(s.lat) if s.lat else None,
         "lng": float(s.lng) if s.lng else None, "phone": s.phone, "business_hours": s.business_hours,
         "image": s.image}
        for s in rows
    ])


@router.get("/faqs")
def faqs(db: Session = Depends(get_db)):
    """常见问题（P1 档：联系我们页折叠展示）。"""
    rows = db.query(Faqs).filter(Faqs.is_activate.is_(True)).order_by(Faqs.sort.asc()).all()
    return ok([
        {"id": f.id, "question": f.question, "answer": f.answer}
        for f in rows
    ])
