"""种子数据（技术文档 §9.1 / PRD §11.2 数据初始化）。

幂等：重复执行不产生重复数据。执行：python -m app.seed

包含：
1. 5 后台角色 + 权限矩阵（附录 C-2）
2. 初始超管（读取 ADMIN_INIT_USERNAME / ADMIN_INIT_PASSWORD）
3. 占位系列 / 空间分类（Q1 默认值，确认后替换）
4. 系统配置默认键（附录 C-5 子集）
"""
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import (
    Roles,
    Series,
    SiteConfigs,
    Spaces,
    StaffUsers,
)

# 附录 C-2 权限矩阵（code → 权限码数组）
ROLE_MATRIX: dict[str, dict] = {
    "super_admin": {
        "role_name": "超级管理员",
        "description": "全部模块（含系统管理）",
        "permissions": [
            "dashboard:view", "product:view", "product:edit", "content:view", "content:edit",
            "recruit:view", "recruit:edit", "resume:view", "resume:status",
            "user:view", "user:edit", "dealer:view", "dealer:audit", "message:handle",
            "appointment:view", "appointment:handle", "contract:view", "contract:edit",
            "contract:status", "contract:export", "biz:view", "biz:handle", "stat:view",
            "system:admin", "system:role", "system:config", "log:view",
        ],
    },
    "content_admin": {
        "role_name": "内容运营",
        "description": "内容与产品维护、看板查看",
        "permissions": [
            "dashboard:view", "product:view", "product:edit", "content:view", "content:edit", "stat:view",
        ],
    },
    "sales_staff": {
        "role_name": "销售客服",
        "description": "用户咨询、预约、签单、B 端业务处理",
        "permissions": [
            "dashboard:view", "user:view", "user:edit", "dealer:view", "dealer:audit", "message:handle",
            "appointment:view", "appointment:handle", "contract:view", "contract:edit",
            "contract:status", "contract:export", "biz:view", "biz:handle", "stat:view",
        ],
    },
    "hr": {
        "role_name": "招聘HR",
        "description": "招聘岗位与简历管理",
        "permissions": [
            "dashboard:view", "recruit:view", "recruit:edit", "resume:view", "resume:status",
        ],
    },
    "viewer": {
        "role_name": "数据查看员",
        "description": "只读看板",
        "permissions": ["dashboard:view", "stat:view"],
    },
}

# 占位系列（Q1 默认值：确认后替换为真实系列名）
PLACEHOLDER_SERIES = [
    {"name": "系列A", "intro": "占位系列，待确认后替换", "sort": 1},
    {"name": "系列B", "intro": "占位系列，待确认后替换", "sort": 2},
    {"name": "系列C", "intro": "占位系列，待确认后替换", "sort": 3},
]

# 占位空间（Q1 默认值：确认后替换/增删）
PLACEHOLDER_SPACES = [
    {"name": "客厅", "sort": 1},
    {"name": "卧室", "sort": 2},
    {"name": "餐厅", "sort": 3},
    {"name": "书房", "sort": 4},
    {"name": "茶室", "sort": 5},
    {"name": "办公", "sort": 6},
    {"name": "儿童房", "sort": 7},
]

# 系统配置默认键（附录 C-5 子集，值后续在后台维护）
DEFAULT_CONFIGS: dict[str, dict] = {
    "site_name": {"name": "TP全屋家居"},
    "service_phone": {"phone": "400-000-0000"},
    "icp_no": {"value": ""},
    "appointment_slots": {"slots": ["09:00-11:00", "14:00-16:00", "16:00-18:00"]},
    "sms_switch_appointment": {"enabled": False},
    "sms_switch_contract": {"enabled": False},
    "sms_switch_resume": {"enabled": False},
}


def seed_roles(db: Session) -> None:
    for code, cfg in ROLE_MATRIX.items():
        if db.query(Roles).filter(Roles.code == code).first():
            continue
        db.add(Roles(code=code, role_name=cfg["role_name"], description=cfg["description"], permissions=cfg["permissions"]))
    db.commit()


def seed_admin(db: Session) -> None:
    if db.query(StaffUsers).filter(StaffUsers.username == settings.ADMIN_INIT_USERNAME).first():
        return
    super_role = db.query(Roles).filter(Roles.code == "super_admin").first()
    if super_role is None:
        raise RuntimeError("角色未初始化，请先执行 seed_roles")
    db.add(StaffUsers(
        username=settings.ADMIN_INIT_USERNAME,
        password_hash=hash_password(settings.ADMIN_INIT_PASSWORD),
        name="系统管理员",
        nickname="超管",
        role_id=super_role.id,
    ))
    db.commit()


def seed_series_spaces(db: Session) -> None:
    for s in PLACEHOLDER_SERIES:
        if not db.query(Series).filter(Series.name == s["name"]).first():
            db.add(Series(name=s["name"], intro=s["intro"], sort=s["sort"]))
    for sp in PLACEHOLDER_SPACES:
        if not db.query(Spaces).filter(Spaces.name == sp["name"]).first():
            db.add(Spaces(name=sp["name"], sort=sp["sort"]))
    db.commit()


def seed_configs(db: Session) -> None:
    for key, value in DEFAULT_CONFIGS.items():
        if not db.query(SiteConfigs).filter(SiteConfigs.key == key).first():
            db.add(SiteConfigs(key=key, value=value))
    db.commit()


def main() -> None:
    db = SessionLocal()
    try:
        seed_roles(db)
        seed_admin(db)
        seed_series_spaces(db)
        seed_configs(db)
        print("✅ 基础种子完成：5 角色 / 超管 / 占位系列+空间 / 系统配置")
        # P2：演示数据（产品/案例/新闻/门店等；已存在则跳过）
        from app.seed_demo import ensure_demo_data

        ensure_demo_data(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
