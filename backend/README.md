# TP全屋家居官网（backend · FastAPI）

前台展示 + 后台管理系统的后端服务，遵循《开发技术文档 V2.1》与《数据库设计文档 V1.2.1》。

## 环境要求

- Python 3.12+（当前开发环境：3.13.14）
- 数据库：开发 SQLite（零依赖）/ 生产 PostgreSQL 15+（`DATABASE_URL` 切换，ADR-002）

## 快速启动

```bash
# 1. 创建并激活虚拟环境（已创建：.venv）
python -m venv .venv
source .venv/Scripts/activate        # Git Bash；PowerShell: .venv\Scripts\Activate.ps1

# 2. 安装依赖
pip install -r requirements.txt

# 3. 环境配置
cp .env.example .env                 # DATABASE_URL=sqlite:///./dev.db

# 4. 建表 + 种子数据（5 角色 / 超管 admin/admin123 / 占位系列空间 / 系统配置）
alembic upgrade head
python -m app.seed

# 5. 启动服务
uvicorn app.main:app --reload --port 8000

# Swagger 文档
# http://localhost:8000/docs
```

## 工程结构

```
backend/
├── app/
│   ├── main.py            # 入口（CORS/路由/异常处理/静态文件）
│   ├── core/              # config / security / deps / exceptions
│   ├── db/                # base（公共字段）/ session
│   ├── models/            # 8 域 32 表（user/product/content/lead/contract/job/stat/system）
│   ├── api/v1/            # 路由（auth / admin_auth 起步，按里程碑扩展）
│   ├── schemas/ services/ utils/
│   └── seed.py            # 种子数据（幂等）
├── alembic/               # 迁移（SQLite 与 PG 双环境验证）
├── tests/  uploads/
├── requirements.txt
└── .env.example
```

## 已实现（P1 骨架阶段）

- [x] 8 域 32 表 SQLAlchemy 模型 + Alembic 首迁移（SQLite 建表验证通过）
- [x] 种子数据：5 角色权限矩阵 / 超管 / 占位系列+空间 / 系统配置键
- [x] 统一响应 `{code, message, data}` + 业务错误码（附录 B）
- [x] 前后台双域认证：注册/登录/JWT（access 24h + refresh 30d）/ me
- [x] RBAC 依赖注入（require_permission 实时读库）

## 后续里程碑

P2 产品/内容/首页聚合接口 → P3 用户与预约/签单 → P4 B 端与招聘 → P5 统计与系统管理（详见《TP全屋家居官网-项目开发实施方案.md》）。
