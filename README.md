# TP全屋家居官网（monorepo）

前台展示官网 + 后台管理系统，严格遵循《TP全屋家居官网-项目开发实施方案.md》开发。

## 三端结构（ADR-008）

| 目录 | 说明 | 端口 | 技术栈 |
| --- | --- | --- | --- |
| `backend/` | FastAPI 后端 | 8000 | FastAPI + SQLAlchemy + Alembic（SQLite/PG 双环境） |
| `web-front/` | 前台官网 | 5173 | React 18 + Tailwind（深林金韵） |
| `admin-front/` | 后台管理 | 5174 | React 18 + AntD 5（深林金韵主题） |

## 启动方式（开发环境）

```bash
# 1. 后端（先建表 + 种子数据）
cd backend
.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
# 首次：alembic upgrade head && python -m app.seed
# Swagger: http://localhost:8000/docs

# 2. 前台
cd web-front && npm run dev          # http://localhost:5173

# 3. 后台（默认账号 admin / admin123）
cd admin-front && npm run dev        # http://localhost:5174
```

## 当前进度（P6 联调验收与上线 ✅ —— 全部里程碑完成）

- **PG 兼容**：循环外键建表后追加补丁（对齐数据库文档 §2.4）+ 6 个性能索引，全新库验证 33 表通过
- **安全/性能**：生产强制校验（PG+JWT 密钥）、产品列表 N+1 修复（selectinload）、移动端专项（安全区/富文本防溢出）
- **全链路联调**：浏览→预约→转签单→签单→B端→招聘→统计→日志 全链路冒烟通过；双端生产构建成功
- **交付物**：《TP全屋家居官网-上线初始化清单与部署方案.md》（env 清单/初始化步骤/Nginx 配置/检查清单/备份/销售端培训材料）

## 阶段计划

P0-P6 全部完成。上线操作见《上线初始化清单与部署方案.md》（详见《TP全屋家居官网-项目开发实施方案.md》第 9 章）
