"""API v1 路由聚合。新模块在此注册（技术文档 §2.3 路由层划分）。"""
from fastapi import APIRouter

from app.api.v1 import (
    admin_announcements,
    admin_appointments,
    admin_auth,
    admin_biz,
    admin_configs,
    admin_content,
    admin_contracts,
    admin_dealers,
    admin_logs,
    admin_messages,
    admin_products,
    admin_recruit,
    admin_roles,
    admin_staffs,
    admin_statistics,
    admin_users,
    auth,
    cases,
    content,
    dealer,
    favorites,
    home,
    jobs,
    leads,
    me,
    news,
    products,
    track,
    upload,
)

api_router = APIRouter(prefix="/api/v1")

# ---- 认证 ----
api_router.include_router(auth.router)
api_router.include_router(admin_auth.router)

# ---- 通用 ----
api_router.include_router(upload.router)

# ---- 前台开放接口 ----
api_router.include_router(home.router)
api_router.include_router(products.router)
api_router.include_router(cases.router)
api_router.include_router(news.router)
api_router.include_router(content.router)
api_router.include_router(leads.router)
api_router.include_router(favorites.router)
api_router.include_router(track.router)
api_router.include_router(jobs.router)

# ---- 前台用户中心 ----
api_router.include_router(me.router)

# ---- 前台经销商域（P4）----
api_router.include_router(dealer.router)

# ---- 后台管理接口 ----
api_router.include_router(admin_products.router)
api_router.include_router(admin_content.router)
api_router.include_router(admin_messages.router)
api_router.include_router(admin_appointments.router)
api_router.include_router(admin_contracts.router)
api_router.include_router(admin_users.router)
api_router.include_router(admin_biz.router)
api_router.include_router(admin_recruit.router)
api_router.include_router(admin_dealers.router)
api_router.include_router(admin_announcements.router)

# ---- 后台统计与系统管理（P5）----
api_router.include_router(admin_statistics.router)
api_router.include_router(admin_staffs.router)
api_router.include_router(admin_roles.router)
api_router.include_router(admin_logs.router)
api_router.include_router(admin_configs.router)
