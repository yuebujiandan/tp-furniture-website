"""后台系统配置管理接口（技术文档 §6.6.14 / PRD 7.7.4）。

实现说明：
- GET /admin/configs：配置键列表（分组展示，KV 结构）；
- PUT /admin/configs/{key}：更新配置值（JSON）；
- 配置生效：读取接口实时读库（前台 /home、/about 等直接读 site_configs）。
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.exceptions import NOT_FOUND, BizError, ok
from app.db.session import get_db
from app.models import SiteConfigs

router = APIRouter(prefix="/admin/configs", tags=["后台-系统配置"])

config_perm = require_permission("system:config")

# 配置键分组说明（后台展示用）
CONFIG_META = {
    "site_name": ("站点信息", "站点名称"),
    "service_phone": ("站点信息", "客服热线"),
    "icp_no": ("站点信息", "ICP 备案号"),
    "about_tp_html": ("内容", "关于 TP 富文本"),
    "brand_intro_html": ("内容", "品牌介绍富文本"),
    "honors": ("内容", "品牌荣誉 JSON"),
    "company_video": ("内容", "企业视频 URL"),
    "home_brand_points": ("首页", "品牌卖点 JSON"),
    "home_stats": ("首页", "数据背书 JSON"),
    "home_featured_case_ids": ("首页", "精选案例 ID"),
    "appointment_slots": ("预约", "可预约时段"),
    "sms_switch_appointment": ("短信", "预约短信开关"),
    "sms_switch_contract": ("短信", "签单短信开关"),
    "sms_switch_resume": ("短信", "投递短信开关"),
}


@router.get("", dependencies=[Depends(config_perm)])
def list_configs(db: Session = Depends(get_db)):
    """配置键列表（含分组与说明）。"""
    rows = db.query(SiteConfigs).order_by(SiteConfigs.id.asc()).all()
    return ok([
        {
            "key": c.key, "value": c.value,
            "group": CONFIG_META.get(c.key, ("其他", ""))[0],
            "desc": CONFIG_META.get(c.key, ("其他", ""))[1],
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        }
        for c in rows
    ])


class ConfigIn(BaseModel):
    value: dict


@router.put("/{key}", dependencies=[Depends(config_perm)])
def update_config(key: str, body: ConfigIn, db: Session = Depends(get_db)):
    """更新配置值（JSON）。"""
    row = db.query(SiteConfigs).filter(SiteConfigs.key == key).first()
    if not row:
        raise BizError(NOT_FOUND, "配置键不存在")
    row.value = body.value
    db.commit()
    return ok({"key": key, "updated": True})
