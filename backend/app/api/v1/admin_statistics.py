"""后台统计聚合接口（技术文档 §6.6.7 / PRD 7.6）。

实现说明：
- GET /admin/dashboard/overview：全站 KPI（今日 PV/UV、新增用户、新预约、新签单、待处理留言、库存预警、近 7 日趋势）；
- GET /admin/statistics/overview：PV/UV 总览 + 昨日对比；
- GET /admin/statistics/trend：近 N 日 PV/UV 趋势（折线图数据，PRD 7.6.3）；
- GET /admin/statistics/pages：页面访问排行（饼图/列表，PRD 7.6.4）；
- GET /admin/statistics/products：产品浏览排行 TOP10（横向柱状，PRD 7.6.1）；
- GET /admin/statistics/events：事件统计（收藏/预约/表单等，PRD 7.6.5）；
- 统计口径：visit_stats 日聚合（ADR-005），KPI 实时读业务表。
"""
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.exceptions import ok
from app.db.session import get_db
from app.models import Appointments, Contracts, Messages, Products, Users, VisitStats

router = APIRouter(prefix="/admin", tags=["后台-统计"])

view_perm = require_permission("stat:view")


def _today() -> date:
    return datetime.now(timezone.utc).date()


def _fill_dates(days: int) -> list[date]:
    """生成近 N 天日期序列（含今天）。"""
    today = _today()
    return [today - timedelta(days=i) for i in range(days - 1, -1, -1)]


@router.get("/dashboard/overview", dependencies=[Depends(view_perm)])
def dashboard_overview(db: Session = Depends(get_db)):
    """全站 KPI 总览（PRD 7.6.3：今日 PV/UV/新增用户/新预约/新签单 + 待处理 + 库存预警 + 7 日趋势）。"""
    today = _today()
    week = _fill_dates(7)

    # 今日统计（visit_stats 日聚合）
    today_page = db.query(VisitStats).filter(
        VisitStats.stat_date == today, VisitStats.stat_type == "page",
    ).first()
    today_pv = today_page.pv if today_page else 0
    today_uv = today_page.uv if today_page else 0

    # 近 7 日趋势（补零）
    rows = db.query(VisitStats).filter(
        VisitStats.stat_date >= week[0], VisitStats.stat_type == "page",
    ).all()
    stat_map = {r.stat_date: r for r in rows}
    trend = [
        {
            "date": d.isoformat(),
            "pv": stat_map[d].pv if d in stat_map else 0,
            "uv": stat_map[d].uv if d in stat_map else 0,
        }
        for d in week
    ]

    return ok({
        "today": {
            "pv": today_pv, "uv": today_uv,
            "new_users": db.query(Users).filter(Users.created_at >= datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc)).count(),
            "new_appointments": db.query(Appointments).filter(Appointments.created_at >= datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc)).count(),
            "new_contracts": db.query(Contracts).filter(Contracts.created_at >= datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc)).count(),
        },
        "pending": {
            "messages": db.query(Messages).filter(Messages.status == "pending").count(),
            "appointments": db.query(Appointments).filter(Appointments.status == "pending").count(),
            "low_stock": db.query(Products).filter(Products.is_deleted.is_(False), Products.stock <= Products.stock_warn).count(),
            "contracts_producing": db.query(Contracts).filter(Contracts.status.in_(["signed", "producing"])).count(),
        },
        "trend_7d": trend,
    })


@router.get("/statistics/overview", dependencies=[Depends(view_perm)])
def stat_overview(db: Session = Depends(get_db)):
    """PV/UV 总览：今日、昨日、近 30 日累计 + 环比。"""
    today = _today()
    yesterday = today - timedelta(days=1)
    month_start = today - timedelta(days=29)

    def page_stat(d: date):
        row = db.query(VisitStats).filter(VisitStats.stat_date == d, VisitStats.stat_type == "page").first()
        return (row.pv, row.uv) if row else (0, 0)

    t_pv, t_uv = page_stat(today)
    y_pv, y_uv = page_stat(yesterday)
    m_rows = db.query(VisitStats).filter(
        VisitStats.stat_date >= month_start, VisitStats.stat_type == "page",
    ).all()
    m_pv = sum(r.pv for r in m_rows)
    m_uv = sum(r.uv for r in m_rows)

    def pct(cur: int, prev: int) -> float:
        return round((cur - prev) / prev * 100, 1) if prev else 0.0

    return ok({
        "today": {"pv": t_pv, "uv": t_uv},
        "yesterday": {"pv": y_pv, "uv": y_uv},
        "month": {"pv": m_pv, "uv": m_uv},
        "compare": {"pv_change": pct(t_pv, y_pv), "uv_change": pct(t_uv, y_uv)},
    })


@router.get("/statistics/trend", dependencies=[Depends(view_perm)])
def stat_trend(days: int = Query(30, ge=1, le=90), db: Session = Depends(get_db)):
    """近 N 日 PV/UV 趋势（折线图数据，PRD 7.6.3）。"""
    dates = _fill_dates(days)
    rows = db.query(VisitStats).filter(
        VisitStats.stat_date >= dates[0], VisitStats.stat_type == "page",
    ).all()
    stat_map = {r.stat_date: r for r in rows}
    return ok([
        {"date": d.isoformat(), "pv": stat_map[d].pv if d in stat_map else 0, "uv": stat_map[d].uv if d in stat_map else 0}
        for d in dates
    ])


@router.get("/statistics/pages", dependencies=[Depends(view_perm)])
def stat_pages(
    days: int = Query(30, ge=1, le=90), limit: int = Query(10, ge=1, le=20),
    db: Session = Depends(get_db),
):
    """页面访问排行 TOP（PRD 7.6.4：target=page 聚合，按 PV 倒序）。"""
    since = _today() - timedelta(days=days - 1)
    rows = (
        db.query(VisitStats.target, func.sum(VisitStats.pv).label("pv"), func.sum(VisitStats.uv).label("uv"))
        .filter(VisitStats.stat_date >= since, VisitStats.stat_type == "page")
        .group_by(VisitStats.target)
        .order_by(func.sum(VisitStats.pv).desc())
        .limit(limit)
        .all()
    )
    return ok([
        {"target": t, "pv": int(pv), "uv": int(uv)} for t, pv, uv in rows
    ])


@router.get("/statistics/products", dependencies=[Depends(view_perm)])
def stat_products(days: int = Query(30, ge=1, le=90), db: Session = Depends(get_db)):
    """产品浏览排行 TOP10（PRD 7.6.1：target=product 聚合）。"""
    since = _today() - timedelta(days=days - 1)
    rows = (
        db.query(VisitStats.target, func.sum(VisitStats.pv).label("pv"), func.sum(VisitStats.uv).label("uv"))
        .filter(VisitStats.stat_date >= since, VisitStats.stat_type == "product")
        .group_by(VisitStats.target)
        .order_by(func.sum(VisitStats.pv).desc())
        .limit(10)
        .all()
    )
    # 关联产品名称
    result = []
    for t, pv, uv in rows:
        product = None
        if t.isdigit():
            product = db.get(Products, int(t))
        result.append({
            "target": t,
            "name": product.name if product else f"产品#{t}",
            "pv": int(pv), "uv": int(uv),
        })
    return ok(result)


@router.get("/statistics/events", dependencies=[Depends(view_perm)])
def stat_events(days: int = Query(30, ge=1, le=90), db: Session = Depends(get_db)):
    """事件统计（收藏/预约/表单等，PRD 7.6.5：target=event 聚合）。"""
    since = _today() - timedelta(days=days - 1)
    rows = (
        db.query(VisitStats.target, func.sum(VisitStats.pv).label("count"))
        .filter(VisitStats.stat_date >= since, VisitStats.stat_type == "event")
        .group_by(VisitStats.target)
        .order_by(func.sum(VisitStats.pv).desc())
        .all()
    )
    return ok([{"event": t, "count": int(c)} for t, c in rows])
