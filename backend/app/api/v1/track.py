"""前台埋点接口（技术文档 §7.6 / ADR-005：自建轻量统计 + ECharts）。

实现说明：
- POST /track/page-view：页面浏览（PV+1，设备首访记 UV）；
- POST /track/product-view：产品浏览（PV+1 + 产品 view_count 累加）；
- POST /track/event：自定义事件（收藏/预约/表单提交，P3 起扩展）；
- 统计口径：visit_stats 日聚合（stat_date + stat_type + target 唯一），UV 按 device_id 去重
  （visit_stat_devices，当日同设备计 1 UV，PRD 7.6.2）；
- 安全：无鉴权 + 轻量限频（内存计数，防刷）。
"""
from datetime import date

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.exceptions import ok
from app.db.session import get_db
from app.models import VisitStatDevices, VisitStats

router = APIRouter(prefix="/track", tags=["前台-埋点"])

# 简单内存频控：每 IP 每 10 秒最多 30 条埋点（防刷，技术文档 §5.2.4 精神）
_rate: dict[str, list[float]] = {}


def _limited(ip: str) -> bool:
    import time

    now = time.time()
    rec = [t for t in _rate.get(ip, []) if now - t < 10]
    if len(rec) >= 30:
        _rate[ip] = rec
        return True
    rec.append(now)
    _rate[ip] = rec
    return False


class TrackBase(BaseModel):
    device_id: str          # 前端 localStorage 生成的 UUID
    target: str             # 对象标识（如 /products、product:123）
    referer: str | None = None


def _record(db: Session, stat_type: str, target: str, device_id: str, count_uv: bool = True) -> None:
    """日聚合计数：PV+1；UV 按设备去重（当日同设备计 1）。"""
    today = date.today()
    row = db.query(VisitStats).filter(
        VisitStats.stat_date == today,
        VisitStats.stat_type == stat_type,
        VisitStats.target == target,
    ).first()
    if not row:
        row = VisitStats(stat_date=today, stat_type=stat_type, target=target, pv=0, uv=0)
        db.add(row)
        db.flush()  # 先 flush 拿到 id，供 visit_stat_devices 外键引用
    row.pv += 1
    if count_uv:
        existed = db.query(VisitStatDevices).filter(
            VisitStatDevices.stat_id == row.id,
            VisitStatDevices.device_id == device_id,
        ).first()
        if not existed:
            db.add(VisitStatDevices(stat_id=row.id, device_id=device_id))
            row.uv += 1
    db.commit()


@router.post("/page-view")
def page_view(body: TrackBase, request: Request, db: Session = Depends(get_db)):
    """页面浏览埋点（路由切换时上报，sendBeacon）。"""
    ip = request.client.host if request.client else "unknown"
    if _limited(ip):
        return ok({"accepted": False})
    _record(db, "page", body.target, body.device_id)
    return ok({"accepted": True})


@router.post("/product-view")
def product_view(body: TrackBase, db: Session = Depends(get_db)):
    """产品浏览埋点（详情页挂载时上报）。

    产品浏览量排行口径来自 visit_stats 的 product 类型聚合（PRD 7.6.1 / ADR-005）。
    """
    _record(db, "product", body.target, body.device_id)
    return ok({"accepted": True})


@router.post("/event")
def event(body: TrackBase, db: Session = Depends(get_db)):
    """自定义事件埋点（收藏/预约/表单提交，P3 起各模块接入）。"""
    _record(db, "event", body.target, body.device_id)
    return ok({"accepted": True})
