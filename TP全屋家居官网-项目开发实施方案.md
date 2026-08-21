# TP全屋家居官网 项目开发实施方案

| 项目 | 内容 |
| --- | --- |
| **方案名称** | TP全屋家居官网（前台展示 + 后台管理）项目开发实施方案 |
| **版本号** | V1.0 |
| **编写人** | 高级开发工程师 |
| **编写日期** | 2026-08-19 |
| **文档状态** | 待确认（等待业务方确认后进入开发阶段） |
| **技术栈** | 后端 Python + FastAPI；前台 React 18 + Tailwind CSS；后台 React 18 + Ant Design 5 |

---

## 目录

1. [项目概述](#1-项目概述)
2. [文档基线](#2-文档基线)
3. [总体技术方案](#3-总体技术方案)
4. [数据库方案](#4-数据库方案)
5. [接口方案](#5-接口方案)
6. [前台官网开发方案](#6-前台官网开发方案)
7. [后台管理系统开发方案](#7-后台管理系统开发方案)
8. [开发环境与工程搭建](#8-开发环境与工程搭建)
9. [开发阶段计划（里程碑）](#9-开发阶段计划里程碑)
10. [测试与质量保障](#10-测试与质量保障)
11. [部署上线方案](#11-部署上线方案)
12. [风险与应对](#12-风险与应对)
13. [需确认事项（开放问题）](#13-需确认事项开放问题)
14. [交付确认机制](#14-交付确认机制)

---

## 1. 项目概述

### 1.1 项目背景

TP全屋家居是一家集设计、生产、销售于一体的全屋家居企业，目前缺乏统一的官方网站，存在品牌展示缺失、获客渠道单一、B端业务薄弱、信息更新滞后、客户沟通低效五大问题（PRD §1.1）。

### 1.2 项目目标

建设一套 **「前台展示官网 + 后台管理系统」** 的完整企业数字化门户（PRD §2）：

| 编号 | 目标 | 衡量方式 |
| --- | --- | --- |
| G1 | 建立官方线上品牌阵地 | 官网上线，首页 PV、平均停留时长 |
| G2 | 打通线上获客渠道 | 每月可跟进线索 ≥ 50 条（上线后 3 个月内） |
| G3 | 支撑 B 端业务拓展 | 6 个月内加盟意向 ≥ 20 家、工程询盘 ≥ 10 个 |
| G4 | 产品与内容统一数字化管理 | 运营无需开发介入即可维护 |
| G5 | 支撑预约到店转化、服务线下签单 | 每月预约到店 ≥ 30 组，线下签单有据可查 |

### 1.3 建设范围

- **前台官网**：品牌展示、产品中心（系列×空间双维度）、实景案例、新闻资讯、招聘入口、预约服务（4 类预约）与线下签单查询、B 端业务（加盟/询价/工程定制）、经销商专属门户、用户中心。
- **后台管理**：产品管理、内容管理、用户与咨询、预约与签单管理、B 端业务管理、招聘管理、数据统计、系统管理。

### 1.4 业务模式边界（关键约束）

> **本期不做在线电商**：不做购物车、在线下单、在线支付、订单物流跟踪。采用「**线上预约 + 线下签单**」模式——官网负责品牌展示、线索获取与预约转化，交易环节全部在线下门店完成，系统仅做登记留痕（PRD §3 非目标，V1.4 起确认）。

其他非目标：不做 SEO、不做小程序/APP、不做多语言、不做实时在线客服、不做经销商 ERP 对接、不做 3D 设计工具。

---

## 2. 文档基线

### 2.1 权威文档清单与优先级

开发严格基于以下文档，**文档冲突时的裁决顺序**：

| 优先级 | 文档 | 角色 | 版本 |
| --- | --- | --- | --- |
| 1 | `TP全屋家居官网PRD.md` | **业务权威源**（需求、功能、验收标准） | V2.0 |
| 2 | `TP全屋家居官网-开发技术文档.md` | **工程权威源**（架构、接口、开发规范、里程碑） | V2.1 |
| 3 | `TP全屋家居官网-数据库设计文档.md` | **数据库唯一权威源**（32 表字段级设计 + 建表 SQL） | V1.2.1 |
| 4 | `TP全屋家居官网-UIUX设计文档.html` | **视觉权威源**（设计 Token、组件、交互规范） | V1.0 |
| 5 | 前台原型 / 列表页原型 / 详情页原型 / 后台原型 | **页面效果权威源**（实现细节以原型为准） | V2.5/V1.4/V1.1/V1.3 |

### 2.2 冲突裁决规则（沿用技术文档 §1）

- 与 PRD 冲突 → 以 PRD 业务口径为准；
- 与 UIUX 冲突 → 以 UIUX 视觉口径为准；
- 原型已实现的细节（如签单 6 项 KPI、转签单闭环、收藏交互、Lightbox）→ 以原型为准；
- 数据库字段 → 一律以《数据库设计文档》V1.2.1 为准；
- 三处字段口径校准（技术文档 §1.3）：`contracts.source`（offline/appointment/dealer_intent）、`messages.type + source` 双字段、`resumes.apply_no` 投递编号 + 同岗位手机号唯一约束。

---

## 3. 总体技术方案

### 3.1 技术选型（PRD §5.1 / 技术文档 §2.2）

| 层级 | 技术 | 版本建议 | 说明 |
| --- | --- | --- | --- |
| 后端框架 | FastAPI | 0.115+ | 自动 OpenAPI/Swagger |
| 数据访问 | SQLAlchemy 2.x + Alembic | 2.0+ / 1.13+ | ORM + 双环境迁移 |
| 数据库 | SQLite（开发）/ PostgreSQL 15+（生产） | — | `DATABASE_URL` 切换 |
| 认证 | PyJWT + passlib[bcrypt] | 2.8+ / 1.7+ | access ≤24h + refresh 30d 双 token |
| 校验 | Pydantic v2 | 2.x | FastAPI 内置 |
| 图片处理 | Pillow | 10.x | 压缩、缩略图、文件头校验 |
| 异步服务器 | uvicorn[standard] | 0.30+ | 生产多 worker |
| 前台前端 | React 18.3 + TypeScript + Vite 5 | — | Tailwind CSS 3.4（深林金韵） |
| 后台前端 | React 18.3 + TypeScript + Vite 5 | — | Ant Design 5.16+（ConfigProvider 主题） |
| 状态管理 | 前台 Zustand 4 / 后台 Redux Toolkit 2 | — | 按需选择 |
| 路由 | React Router v6 | 6.22+ | — |
| HTTP | Axios | 1.7+ | 拦截器 + token 自动刷新 |
| 图表 | ECharts 5 | 5.5+ | 后台看板 |
| 富文本 | 前台 DOMPurify 清洗；后台 wangEditor | — | 新闻/案例/产品详情 |
| 部署 | Docker + Docker Compose + Nginx | — | 前后端分离部署 |
| 缓存（可选） | Redis 7 | — | 验证码/登录频控/UV 去重，缺失自动降级 |
| 地图 | 腾讯/高德 JS SDK | — | 门店标点，Key 缺失降级静态图 |

### 3.2 系统架构

```
用户（浏览器）PC/手机/平板
        │ HTTPS
   Nginx（网关）
   /      → 前台静态资源（web-front）
   /admin → 后台静态资源（admin-front）
   /api   → FastAPI 反向代理
        │
   FastAPI 后端（模块化单体，8 大功能域）
   ├─ 认证模块（JWT/RBAC，前后台双域隔离）
   ├─ 产品模块 / 内容模块 / 用户模块
   ├─ 预约与签单模块（含转签单闭环）
   ├─ B端模块（加盟/询价/工程/经销商门户）
   ├─ 招聘模块 / 数据统计模块 / 系统管理
        │
   ├─ 数据库（开发 SQLite / 生产 PostgreSQL）
   └─ 文件存储（uploads/ 图片、简历附件）
```

**关键架构决策（技术文档 §3 ADR）**：
- ADR-001 模块化单体：1-2 人团队，单 FastAPI 进程按 8 域分层；
- ADR-002 双环境数据库：SQLite 开发 / PG 生产，8 条双环境工程约束强制落地；
- ADR-003 签单产品清单 JSON 快照：历史签单不可变；
- ADR-004 经销商价单点规则：单品价优先 + 默认折扣率兜底（`services/pricing.py` 单点实现）；
- ADR-005 自建轻量统计 + ECharts；
- ADR-006 CSV 导出 UTF-8 BOM（Excel 无乱码）；
- ADR-007 接口双轨制（本文档评审权威 + Swagger 联调对照）；
- ADR-008 monorepo 三端结构（backend / web-front / admin-front）。

### 3.3 工程结构（monorepo）

```
F:\广州泰迪\产品prd\网站开发\
├── backend/                    # FastAPI 后端
│   ├── app/
│   │   ├── main.py             # 入口（CORS、路由、静态目录）
│   │   ├── core/               # config / security / deps / exceptions
│   │   ├── api/v1/             # 路由层（auth/home/products/cases/news/jobs/stores/
│   │   │                       #   about/appointments/messages/inquiries/franchise/
│   │   │                       #   engineering/dealer/me/track/upload/admin/*）
│   │   ├── models/             # 8 域模型文件（user/product/content/lead/contract/job/stat/system）
│   │   ├── schemas/            # Pydantic v2（+ Literal 枚举）
│   │   ├── services/           # pricing / contract_no / sms / stats / export
│   │   └── utils/              # pagination / file / verify_code / log
│   ├── alembic/                # 迁移脚本（SQLite 与 PG 双验）
│   ├── uploads/                # 本地文件存储（gitignore）
│   ├── tests/                  # pytest（单元 + 接口）
│   ├── requirements.txt / pyproject.toml
│   ├── Dockerfile
│   └── .env.example
├── web-front/                  # 前台 React（Tailwind，深林金韵）
│   ├── src/
│   │   ├── router/  api/  stores/  components/  pages/  hooks/  utils/
│   │   └── styles/index.css
│   ├── tailwind.config.js      # 深林金韵 Token 映射
│   ├── vite.config.ts          # /api /static 代理到 8000
│   └── Dockerfile
├── admin-front/                # 后台 React（AntD）
│   ├── src/
│   │   ├── router/  store/  api/  layouts/  components/  pages/
│   │   └── theme.ts            # ConfigProvider 主题
│   ├── tailwind.config.js
│   └── Dockerfile
├── deploy/
│   ├── nginx.conf              # 网关配置
│   └── docker-compose.yml      # 编排
└── README.md                   # 启动说明
```

### 3.4 设计规范（深林金韵）

以 UIUX 文档为视觉权威源，前台 Tailwind 映射、后台 AntD 主题同源 Token：

| Token | 值 | 用途 |
| --- | --- | --- |
| forest-0/1/2/3 | #081A10 / #0C2418 / #123526 / #1A4631 | 背景四级 |
| moss / fern / fern-soft | #2E7D4F / #3FA464 / #5CC48A | 数据绿 / 确认态 |
| gold / gold-soft / gold-deep | #D4AF37 / #E6CE8A / #A8862A | 主点缀 / CTA / 渐变端 |
| cream / cream-2 / cream-3 | #F1EBDD / #B9C8BD / #7E9789 | 正文三级 |
| 语义色 | 确认 #5CC48A / 待处理 #E8A25A / 完成 #E6CE8A / 取消 #E0705A / 交付 #8FB8E8（仅后台） | 状态 |
| 字体 | 标题宋体衬线（STZhongsong 系）；正文无衬线（HarmonyOS/PingFang/雅黑） | — |
| 圆角 | 前台 20/14px；后台 18/12px | 卡片/弹层 |
| 玻璃卡 | rgba(18,53,38,.72) + backdrop-blur | 卡片底 |

> 开发约束：禁止硬编码颜色（组件统一走 Token）；渐变文字统一 `linear-gradient(120deg,#F0DC9A,#D4AF37 60%,#E8CE8A)` + background-clip。

---

## 4. 数据库方案

### 4.1 总览（以《数据库设计文档》V1.2.1 为唯一权威）

**8 域 32 张表**：

| 域 | 表 | 数量 |
| --- | --- | --- |
| 用户权限域 | users / dealer_applications / staff_users / departments / roles / operation_logs | 6 |
| 产品域 | series / spaces / products / product_spaces / favorites | 5 |
| 内容域 | news / cases / banners / milestones / stores / faqs / announcements / documents | 8 |
| 业务线索域 | appointments / messages / inquiries / franchise_applications / engineering_requests | 5 |
| 签单域 | contracts / contract_logs / dealer_purchase_intents | 3 |
| 招聘域 | jobs / resumes | 2 |
| 统计域 | visit_stats / visit_stat_devices | 2 |
| 系统域 | site_configs | 1 |

### 4.2 核心业务关系（E-R 要点）

- **产品双维度**：products 属一个系列（series_id）+ 一个主空间分类（category_id）+ 多空间（product_spaces M:N 关联表）；
- **预约→签单闭环**：appointments.contract_id 回填（V1.9 转签单）；
- **签单 JSON 快照**：contracts.items 存 `[{name, product_no, unit_price, qty}]`，不存 product_id（ADR-003）；
- **游客可提交**：user_id 允许 NULL（预约/留言/询价/投递等）；
- **经销商价兜底**：dealer_price 允许 NULL，按 users.dealer_discount 折算（ADR-004）。

### 4.3 双环境强制约束（技术文档 §2.5，违反即评审缺陷）

| 约束项 | 要求 |
| --- | --- |
| 连接方式 | `DATABASE_URL` 环境变量注入，代码禁止硬编码 |
| JSON 字段 | 统一 SQLAlchemy `JSON` 类型，禁用 JSONB |
| 枚举类型 | VARCHAR + 代码层常量 + Pydantic Literal，禁 DB ENUM |
| 主键 | Integer 自增，禁 UUID |
| 分页/检索 | limit/offset 分页；LIKE 模糊搜索，禁 FTS/tsvector |
| 日期时间 | DateTime(timezone=True) + UTC 存储，展示层转 Asia/Shanghai |
| 迁移 | Alembic 脚本 SQLite 与 PostgreSQL 双环境验证后合并 |
| 测试 | 每迭代提测前 PostgreSQL 全量回归 |

### 4.4 实现步骤

1. 后端工程初始化 + `DATABASE_URL` 配置（默认 `sqlite:///./dev.db`）；
2. 8 域模型文件（models/）按数据库设计文档字段级定义落地；
3. Alembic 初始化 + 首个迁移（`init tables`），SQLite 本地验证；
4. 种子数据脚本（`python -m app.seed`）：5 角色 + 权限矩阵、初始超管（读 `ADMIN_INIT_*`）、系统配置默认值、演示数据（50+ SKU、10+ 案例、20+ 新闻、社会+校园岗位各 5+，对齐 PRD §11.2 初始化清单）。

---

## 5. 接口方案

### 5.1 规范总则（技术文档 §6.0）

- RESTful，前缀 `/api/v1`；统一响应 `{ "code": 0, "message": "success", "data": {...} }`；
- 列表统一 `{ list, total, page, page_size }`；分页 `page`（默认 1）/ `page_size`（默认 12，≤50）；
- 鉴权：`Authorization: Bearer <token>`；前后台双域隔离（user / staff_user）；
- 时间：ISO8601 带时区；错误：业务 code（附录 B 错误码表）+ 可读 message；
- Swagger `/docs` 自动生成（生产仅内网/后台可访问）。

### 5.2 接口总量

| 域 | 数量 | 说明 |
| --- | --- | --- |
| 前台开放接口 | 约 60 | 认证、首页聚合、产品/案例/新闻/招聘/门店/关于、线索提交、简历、用户中心、经销商门户、统计埋点 |
| 后台管理接口 | 约 50 | 后台认证框架、产品管理、内容管理、用户与咨询、签单管理、B 端管理、数据统计、系统管理 |

### 5.3 核心接口清单（详细定义以开发技术文档 §6 为准）

**前台**：

| 分类 | 接口示例 |
| --- | --- |
| 认证 | POST `/auth/sms-code` `/auth/register` `/auth/login` `/auth/login-sms` `/auth/refresh` `/auth/forgot-password`；GET `/auth/me` |
| 首页 | GET `/home`（聚合 banners/brand_points/series/spaces/featured_cases/news/stats/stores 等） |
| 产品 | GET `/series` `/spaces` `/products`（系列/空间/风格/价格区间/关键词/排序/分页）`/products/{id}` `/products/{id}/related` `/products/{id}/cases` |
| 收藏 | POST/DELETE `/favorites`（登录） |
| 案例/新闻 | GET `/cases` `/cases/{id}`；`/news` `/news/{id}` |
| 招聘 | GET `/jobs` `/jobs/{id}` `/recruit-intro`；POST `/jobs/{id}/resumes`（multipart 附件）；POST `/resume-query`（游客查询） |
| 关于 | GET `/stores` `/milestones` `/about` `/faqs` |
| 线索提交 | POST `/appointments` `/messages` `/inquiries` `/franchise-applications` `/engineering-requests` |
| 用户中心 | GET/PUT `/me/profile`；POST `/me/dealer-application`；GET `/me/appointments` `/me/contracts` `/me/favorites` `/me/resumes` `/me/messages` `/me/inquiries` `/me/franchise-applications` `/me/engineering-requests` |
| 经销商门户 | GET `/dealer/home` `/dealer/products`（专属价）`/dealer/purchase-intents` `/dealer/announcements` `/dealer/documents` |
| 埋点 | POST `/track/page-view` `/track/product-view` `/track/event`（无鉴权 + 限频） |

**后台**（前缀 `/api/v1/admin`）：

| 分类 | 接口示例 |
| --- | --- |
| 认证框架 | POST `/admin/auth/login` `/admin/auth/refresh`；GET `/admin/auth/me` `/admin/menus`（权限菜单） |
| 产品 | CRUD `/admin/series` `/admin/spaces` `/admin/products`（软删除）；`/admin/products/batch-price`（批量调价）`/low-stock`（库存预警）`/import` `/export`（P1） |
| 内容 | CRUD `/admin/news` `/admin/cases` `/admin/banners` `/admin/milestones` `/admin/stores` `/admin/faqs` `/admin/announcements` `/admin/documents`；`/admin/jobs` `/admin/resumes`（状态流转/附件下载）；`/admin/site-config/home` `/admin/about` |
| 用户咨询 | `/admin/users` `/admin/dealers`（审核/黑名单）`/admin/messages`（双来源）`/admin/appointments`（**转签单**）`/admin/customer-tags`（P1） |
| 签单 | `/admin/contracts`（列表 6 项 KPI + 录入）`/admin/contracts/{id}` `/admin/contracts/{id}/status` `/cancel` `/logs` `/export`（CSV BOM）；`/admin/dealer-intents`（报价/确认/转签单） |
| B 端 | `/admin/franchise-applications` `/admin/inquiries`（报价）`/admin/engineering-requests` |
| 统计 | `/admin/dashboard/overview` `/product-stats` `/appointment-contract-stats` `/content-stats` `/lead-stats` |
| 系统 | `/admin/staff-users` `/admin/roles` `/admin/operation-logs` `/admin/site-configs` `/admin/upload` |

### 5.4 认证与权限（RBAC）

- JWT 双 token：access ≤24h + refresh 30d，refresh 轮换 + 吊销，前端静默预刷新，登录态保持 30 天；
- 后台 5 固定角色（附录 C-2 权限矩阵）：超级管理员 / 内容运营 / 销售客服 / 招聘 HR / 数据查看员；
- 权限码 `模块:动作`（如 `product:edit`），菜单按权限码渲染，API 二次校验，权限变更实时生效（不做缓存）；
- 经销商价规则 `services/pricing.py` 单点实现：`dealer_price` 优先，NULL 时按经销商默认折扣率折算。

---

## 6. 前台官网开发方案

### 6.1 页面清单（对应 PRD §6）

| 页面 | 路由 | 优先级 | 核心要点 |
| --- | --- | --- | --- |
| 首页 | `/` | P0 | 聚合接口渲染；Banner 轮播 5s+手动；卖点/系列/空间导览/精选案例/新闻/数据背书/加盟入口/预约入口/门店信息；滚动渐入 + 懒加载 |
| 产品中心列表 | `/products` | P0 | 系列×空间双 Tab、筛选区（系列/空间/价格 4 档/风格）、搜索、排序（默认/价格升/降/最新）、分页 12/24、卡片操作（预约到店/批量询价自动带入）、空态一键清空筛选 |
| 产品详情 | `/products/:id` | P0 | 图集 Lightbox（缩略图切换/ESC 关闭）、基本信息（价格标注"以门店报价为准"）、富文本详情、收藏（金色高亮+Toast）、分享复制链接、预约/咨询/询价、关联推荐 4 卡、相关案例 3 卡 |
| 案例列表/详情 | `/cases` `/cases/:id` | P0 | 风格/空间/面积筛选；详情含户型/产品清单（可跳转）/客户评价/"预约同款设计"带 case_id |
| 新闻列表/详情 | `/news` `/news/:id` | P0 | 企业新闻/行业资讯双 Tab；置顶优先、前 3 条图文大卡；详情上一篇/下一篇 + 相关推荐（P1） |
| 招聘 | `/recruit` `/recruit/query` | P0 | 社会/校园双 Tab；岗位详情；在线投递（附件 ≤10MB、重复投递拦截）；游客凭手机号+验证码查询投递状态 |
| 关于我们 | `/about` | P0 | 关于 TP / 发展历程时间轴 / 品牌介绍 / 荣誉墙 |
| 联系我们 | `/contact` | P0 | 门店卡片 + 地图标点导航；留言表单；FAQ（P1） |
| 加盟介绍 | `/franchise` | P0 | 加盟政策 + 申请表单 |
| 工程定制 | `/engineering` | P0 | 服务介绍 + 定制需求表单（附件选填） |
| 用户中心 | `/user/*` | P0 | 资料/预约/签单/收藏/投递/留言/询价/加盟工程/经销商认证；预约签单状态 30s 轻刷新 |
| 经销商门户 | `/dealer/*` | P0 | 👑 守卫；门户首页（公告/待处理意向）/专属价产品库/采购意向/库存/政策文档 |

### 6.2 全局组件（UIUX §5 组件规格）

导航（80px 吸顶毛玻璃 + 五主菜单 + 下拉）、页脚、浮窗（在线咨询三入口 + 返回顶部）、按钮 4 变体（金/描边/金线/icon）、Modal + 表单、Toast、ProductCard/FilterBar/Pager/Empty、Gallery/Lightbox/ActionBar、Drawer（移动端）。

### 6.3 关键实现要求

- **深林金韵 Token** 落地 tailwind.config.js（forest/gold/cream 色板 + glass 背景 + 金色阴影 + 衬线字体）；
- 产品列表筛选状态对象驱动 + URL 同步（useSearchParams）；经销商登录自动显示经销商价；
- 详情页动态渲染：`/products/:id` 由后端按产品 ID 返回（原型 `?id=` 机制的正式化）；
- 富文本正文渲染前过 DOMPurify（防 XSS）；
- 埋点：localStorage 生成 device_id（首访生成、长期保留），路由切换/page-view、详情/product-view、收藏等操作/event，sendBeacon + 失败静默；
- 移动端响应式断点 ≤768px（汉堡菜单）/769-1024px/≥1025px。

---

## 7. 后台管理系统开发方案

### 7.1 模块清单（对应 PRD §7，9 大模块）

| 模块 | 页面 | 说明 |
| --- | --- | --- |
| 登录 | Login | 全屏渐变 + 400px 登录卡；5 次失败锁 15 分钟 |
| 总览看板 | Dashboard | PV/UV、新增用户/预约/签单、新增线索、**待处理事项清单**（点击跳转）+ ECharts 趋势 |
| 产品管理 | Series / Spaces / ProductList / ProductForm | 系列/空间 CRUD；产品列表（筛选/上下架/软删除/库存预警标红）；图集多图+富文本；批量调价；Excel 导入导出（P1） |
| 内容管理 | News / Cases / Banner / PageConfig / Jobs / Resumes / About / Stores / Faqs / Announcements / Documents | 新闻置顶/草稿/发布/下线；案例关联产品 + 工程案例标记；首页页面配置；简历状态流转+附件下载；门店经纬度地图选点；公告 scope 选择；政策文档上传 |
| 用户与咨询 | Users / Dealers / Messages / Appointments / CustomerTags | 经销商审核（营业执照预览 + 通过/驳回填原因）；预约确认/取消 + **转签单**；留言双来源统一管理（前台来源行金色高亮） |
| 签单管理 | Contracts / ContractDetail / DealerIntents | **6 项 KPI 卡 + 状态 Tab + 关键词搜索 + 金额"待定" + 侧栏签单数角标**；录入（来源字段/签单号自动生成/产品清单选择器/付款计划动态行）；详情操作日志时间线；状态流转（每步写日志，取消填原因）；**导出 CSV（UTF-8 BOM）**；经销商意向报价/确认/转签单 |
| B 端业务 | Franchise / Inquiries / Engineering | 列表 + 详情 + 状态流转 + 询价报价表单 |
| 数据统计 | DashboardTabs（5 看板） | ECharts 色值语义锁定 UIUX §11；Top3 金徽标 |
| 系统管理 | Admins / Roles / OperationLogs / SiteConfigs | 管理员 CRUD + 角色绑定；角色权限码勾选；操作日志查询；系统配置（预约时段/短信开关等） |

### 7.2 通用组件（AntD 封装）

KpiCard、StatusTag（状态胶囊）、DataTable（金色表头 + 前台来源行高亮）、AmModal、SearchForm（筛选/刷新/重置）、RichEditor（wangEditor，图片走 `/admin/upload`）。

### 7.3 主题与权限

- ConfigProvider 主题：colorPrimary #D4AF37、深色背景 forest 系、金色边框；深色组件覆盖（DatePicker/Select 弹层），禁止逐组件硬编码；
- 菜单/路由配置驱动（`router/menu.tsx` 权限码 → 菜单），登录后 `GET /admin/menus` 过滤，无权限菜单不展示，API 403 二次校验；
- 后台 density：正文 12.5-13.5px、panel padding 22px、圆角 18/12px。

---

## 8. 开发环境与工程搭建

### 8.1 环境要求

| 项 | 要求 |
| --- | --- |
| Python | 3.12+ |
| Node.js | 18+（推荐 20 LTS） |
| 包管理 | pip + npm |
| 数据库 | 开发 SQLite（零依赖）；PostgreSQL 15+（生产/回归环境，可选 Docker） |
| 代码规范 | 后端 Ruff + Black + mypy；前端 ESLint + Prettier（pre-commit / lint-staged） |

### 8.2 工程搭建步骤（P1 阶段执行）

```bash
# 1. 后端
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                 # DATABASE_URL=sqlite:///./dev.db
alembic upgrade head && python -m app.seed           # 建表 + 种子数据
uvicorn app.main:app --reload --port 8000            # Swagger: http://localhost:8000/docs

# 2. 前台
cd web-front
npm i && npm run dev                                 # http://localhost:5173（/api 代理 8000）

# 3. 后台
cd admin-front
npm i && npm run dev                                 # http://localhost:5174（/api 代理 8000）
```

### 8.3 分支与提交规范

- 分支：`main`（可发布）← `develop`（集成）← `feature/{模块}-{编号}` / `fix/{编号}`；
- 提交：Conventional Commits（`feat(products): 新增列表筛选`）；
- 提交前检查：后端 pytest 通过 + Alembic 迁移双环境可执行；前端 `tsc --noEmit` 无错误。

---

## 9. 开发阶段计划（里程碑）

> 总周期 **12-14 周**（PRD §11.1），团队假设 1 前端 + 1 后端。**产品/内容后台须与前台展示同步交付**（避免"前台有页面、后台无数据管理"空窗）。

| 阶段 | 周期 | 后端交付 | 前台交付 | 后台交付 | 里程碑出口 |
| --- | --- | --- | --- | --- | --- |
| **P0 需求冻结与设计** | 第 1-2 周 | 数据库设计落地（32 表）、API 设计定稿 | 视觉稿对齐（Token 落地） | 菜单/权限模型 | 设计评审通过 |
| **P1 基础框架** | 第 3-4 周 | 工程骨架、认证 JWT+RBAC、上传、验证码、种子数据 | 工程搭建、组件库 P0、路由骨架 | 登录、框架布局、权限菜单 | 前后台可登录、权限生效 |
| **P2 前台核心展示 + 内容后台** | 第 5-7 周 | 产品/内容/首页聚合接口 | 首页、产品中心（双维度筛选）、产品详情、案例、新闻、关于、联系我们、导航/页脚/咨询浮窗 | **产品管理、内容管理**（新闻/案例/Banner/门店/留言） | 前台核心页面完成（UAT1） |
| **P3 用户与预约** | 第 8-9 周 | 用户中心、预约、签单、留言接口 | 个人中心、预约流程、我的签单 | 用户咨询管理、预约管理、**签单管理（含转签单）** | 预约与签单链路打通（UAT2） |
| **P4 B 端业务与招聘** | 第 10-11 周 | 加盟/询价/工程/经销商门户/招聘接口 | 加盟页、询价、工程、经销商门户、招聘投递 | B 端管理、招聘管理、公告/文档 | B 端链路打通（UAT3） |
| **P5 数据统计与系统管理** | 第 12 周 | 统计聚合、埋点、系统管理接口 | 埋点上报 | 数据看板、系统管理、操作日志 | 后台全部模块完成（UAT4） |
| **P6 联调验收与上线** | 第 13-14 周 | PostgreSQL 回归、性能/安全修复 | 全链路联调、移动端专项 | 数据初始化、销售端培训 | 正式上线 |

### 9.1 每个阶段内的执行方式（小步快跑）

每个功能模块按「**写 → 验 → 报**」循环交付：
1. 写代码实现该模块；
2. 自动验证：语法检查（lint/编译）→ 构建检查 → 运行测试 → 快速冒烟；
3. 一句话汇报进度；
4. 全部完成后输出交付清单（实现功能、运行方式、已知限制）。

---

## 10. 测试与质量保障

| 层级 | 方式 | 覆盖 |
| --- | --- | --- |
| 单元测试 | pytest（service 层） | 价格规则、签单号生成、状态机迁移、频控 |
| 接口测试 | pytest + TestClient | 接口联调清单全部接口 + 权限矩阵（5 角色 × 菜单/API） |
| 前端测试 | Vitest + Testing Library | 收藏交互、表单校验、分页筛选 |
| 验收测试 | 按 PRD §6.x/§7.x 验收标准逐条勾验 | 前台 6.2.3/6.5.3/6.7.3/6.8.3/6.9.5 + 后台 7.1.2/7.2.2/7.3.2/7.4.2/7.5.4/7.6.3/7.7.2 |
| 回归 | PostgreSQL 全量 + 移动端专项 | 每迭代提测前 |

**核心闭环联调清单（上线前必须全绿）**：
- [ ] 注册/登录/刷新/忘记密码全链路（含 401 拦截回跳）
- [ ] 产品列表 6 类筛选 × 4 种排序 × 分页组合
- [ ] 经销商价规则两模式验证（单品优先 + 折扣兜底）
- [ ] 预约 → 确认 → **转签单** → 签单状态流转 → 用户端可见全闭环
- [ ] 游客投递简历 → 手机号+验证码查询投递状态
- [ ] 后台权限矩阵：无权限 API 返回 403
- [ ] CSV 导出 BOM，Excel 打开无乱码（Windows + macOS）
- [ ] PostgreSQL 环境全量回归

---

## 11. 部署上线方案

### 11.1 部署架构（技术文档 §10）

- backend：`python:3.12-slim` + uvicorn（多 worker）；
- web-front / admin-front：`node:20-alpine` 构建 → `nginx:alpine` 托管 dist；
- docker-compose 编排：db（postgres:15-alpine）+ backend + web-front + admin-front + nginx；
- Nginx 网关：`/api/` 反代 backend、`/static/uploads/` 只读托管（禁脚本执行）、`/` 走前台 SPA、`/admin` 走后台 SPA、SPA 回退 try_files；
- 备份：pg_dump 每日 2:00，保留 30 天。

### 11.2 上线检查清单（对齐 PRD §11.2）

- [ ] 数据初始化：系列/空间/50+ SKU/10+ 案例/20+ 新闻/门店/岗位各 5+/系统配置
- [ ] 生产环境变量注入（JWT_SECRET、DATABASE_URL、短信、地图 Key）
- [ ] 超管 + 5 角色管理员账号分配
- [ ] 域名与备案、HTTPS 证书
- [ ] 销售端预约/签单操作培训（SOP）

---

## 12. 风险与应对

| 编号 | 风险 | 等级 | 应对措施 |
| --- | --- | --- | --- |
| R1 | 产品图片/案例素材不足 | 高 | 提前启动素材收集；上线前预留补拍周期 |
| R2 | 产品数据量大，初始化工作量大 | 中 | Excel 批量导入工具；分批次上线（先主力系列） |
| R3 | 经销商价格体系规则未定 | 高 | `pricing.py` 单点实现 + 两模式可配置（ADR-004） |
| R4 | 短信验证码依赖第三方 | 中 | Provider 抽象 + Mock；无短信保留密码登录 |
| R5 | 地图 SDK 需企业资质与 Key | 中 | 提前申请；降级静态地图 + 导航链接 |
| R7 | 权限模型复杂 | 中 | V1 固定 5 角色 + 菜单/API 权限码，不做数据级权限 |
| R8 | 响应式工作量大 | 中 | 移动优先设计；UAT 移动端专项测试 |
| R9 | SQLite↔PostgreSQL 差异 | 中 | 双环境规范 + Alembic 双验 + PG 全量回归 |
| R10 | 线下签单依赖门店执行 | 中 | 上线前输出签单 SOP 并培训销售 |

---

## 13. 需确认事项（开放问题）

> 以下问题来自 PRD 附录 Open Questions，其中 **Q1-Q5、Q8 为阻塞项**（影响相关模块设计），需要在开发启动前或对应里程碑前确认；非阻塞项可在对应阶段前确认。请逐一确认（可直接回复编号 + 答案，或回复"按默认值处理"）。

### 13.1 阻塞项（★ 需在 P2 前确认）

| 编号 | 问题 | 影响范围 | 建议默认值 |
| --- | --- | --- | --- |
| **Q1** | ★ TP 全屋家居实际的**产品系列名称与空间分类清单**？ | 产品模块设计、种子数据 | 暂用占位（系列 A/B/C、办公、软体等），确认后替换 |
| **Q2** | ★ **经销商专属价格定价规则**（统一折扣率 / 分系列折扣 / 单品定价）？ | 价格管理、`pricing.py` | 单品价优先 + 默认折扣率兜底（已按此实现，仅需确认折扣率数值） |
| **Q3** | ★ **预约时段规则**（各门店可预约时段/容量）？ | 预约模块、系统配置 | 时段写入 `site_configs.appointment_slots`，提供后再配 |
| **Q4** | ★ **客服热线与企业微信二维码**是否已有？ | 联系模块、系统配置 | 先用占位，确认后替换 |
| **Q5** | ★ 是否已有**素材库**（产品图/案例图/企业视频）？质量标准？ | 上线时间 | 无素材则用演示图占位，上线前补齐 |
| **Q8** | ★ **部署环境**（云服务器/本地）与域名、备案状态？ | 部署方案 | 本地 Docker 演示 → 生产待定 |

### 13.2 非阻塞项（对应阶段前确认）

| 编号 | 问题 | 影响范围 |
| --- | --- | --- |
| Q6 | 后台管理员首批账号与角色分配？ | P1 阶段 |
| Q7 | 是否需要短信通知（预约/签单/简历状态）？短信预算？ | P3 阶段（3 个独立开关，默认关） |
| Q9 | 是否需要对接企业微信客户联系（线索同步企微）？ | P2 远期，本期不做 |
| Q10 | 数据统计是否需要销售业绩维度（按销售员归因）？ | P5 阶段（字段已预留，看板可扩展） |

---

## 14. 交付确认机制

### 14.1 阶段交付流程

```
方案确认（本文件） → 用户回复"已确认，执行下一步"
    ↓
P0 设计冻结 → P1 基础框架 → P2 前台核心+内容后台 → P3 用户与预约
    ↓
P4 B端与招聘 → P5 数据统计与系统 → P6 联调验收与上线
```

- 每个里程碑交付后输出**交付清单**（已实现功能 + 运行方式 + 已知限制）；
- 用户确认后进入下一阶段；发现需求偏差立即反馈修正，不积压；
- 开发过程中涉及文档口径不清、需求冲突时，**先提问确认再实施**，不做猜测式开发。

### 14.2 下一步动作

收到"**已确认，执行下一步**"回复后，将按以下顺序启动：

1. 初始化 monorepo 三端工程骨架（backend / web-front / admin-front）；
2. 后端：配置与核心模块（config/security/deps/exceptions）+ 8 域模型 + Alembic 首迁移 + 种子数据；
3. 前端：Vite + Tailwind（深林金韵 Token）+ 路由骨架 + Axios 封装；
4. 后台：Vite + AntD 主题 + 布局 + 权限菜单；
5. 完成 P1 里程碑验证（前后台可登录、权限生效）后汇报。

---

*方案文档结束（TP全屋家居官网 项目开发实施方案 V1.0 · 2026-08-19）*
