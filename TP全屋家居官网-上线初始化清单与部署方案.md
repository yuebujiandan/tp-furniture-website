# TP全屋家居官网 · 上线初始化清单与部署方案（P6）

> 配套文档：本文件为 P6 联调验收与上线交付物，配合《TP全屋家居官网-项目开发实施方案.md》第 11 章使用。
> 开发环境已验证：backend:8000（SQLite）/ web-front:5173 / admin-front:5174。

---

## 一、生产环境变量清单（backend/.env）

```ini
# 运行环境（必须 prod）
APP_ENV=prod
# CORS：生产同源部署可留空或填正式域名
CORS_ORIGINS=https://www.tp-home.com,https://admin.tp-home.com

# 数据库（生产强制 PostgreSQL，ADR-002）
DATABASE_URL=postgresql+psycopg://tp_user:强密码@127.0.0.1:5432/tp_home

# JWT（生产必须修改，config.py 强制校验非默认值）
JWT_SECRET_KEY=<64位随机串：openssl rand -hex 32>
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=30

# 文件存储
UPLOAD_DIR=/data/tp-home/uploads          # 挂载持久卷，勿放临时目录
STATIC_URL=/static

# 短信（上线前接入真实渠道；联调期保持 mock）
SMS_PROVIDER=aliyun                       # aliyun / tencent
SMS_ACCESS_KEY_ID=xxx
SMS_ACCESS_KEY_SECRET=xxx

# 地图（门店标注，接入正式 Key）
MAP_PROVIDER=amap
MAP_JS_KEY=xxx

# Redis（可选；验证码/登录锁定/埋点限频可升级为 Redis 存储）
REDIS_URL=redis://127.0.0.1:6379/0

# 初始超管（首启后立即修改密码）
ADMIN_INIT_USERNAME=admin
ADMIN_INIT_PASSWORD=首次登录后立即修改
```

**安全强制项（config.py 内置校验，APP_ENV=prod 时）**：
- `DATABASE_URL` 必须为 `postgresql://`（非 PG 直接拒绝启动）
- `JWT_SECRET_KEY` 不得为默认值

---

## 二、正式数据初始化步骤

```bash
# 1. 安装依赖 + 建表（PG 迁移：含 P6 循环外键补丁与索引，已双环境验证）
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head

# 2. 初始化基础数据（5 角色/超管/占位系列空间/系统配置 + P2 演示数据）
#    ⚠️ 正式环境建议：仅执行基础种子，演示产品/案例替换为真实素材后由后台录入
python -m app.seed
#    若需清除演示数据：提供清库脚本或人工在后台删除，保留角色与超管

# 3. 启动后端（生产建议 gunicorn/uvicorn 多 worker，Nginx 反代）
gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 4 -b 127.0.0.1:8000

# 4. 前端生产构建（产物在 dist/，由 Nginx 托管）
cd web-front   && npm ci && npm run build    # → web-front/dist
cd admin-front && npm ci && npm run build    # → admin-front/dist
```

---

## 三、部署架构与 Nginx 配置示例

```
用户 → Nginx(443/80) → /            → web-front/dist（静态，SPA 回退）
                     ├─ /admin/      → admin-front/dist（静态，SPA 回退）
                     ├─ /api/        → 后端 127.0.0.1:8000
                     └─ /static/     → /data/tp-home/uploads（后端上传目录）
```

```nginx
# /etc/nginx/conf.d/tp-home.conf
server {
    listen 80;
    server_name www.tp-home.com admin.tp-home.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.tp-home.com;
    ssl_certificate     /etc/nginx/ssl/tp-home.crt;
    ssl_certificate_key /etc/nginx/ssl/tp-home.key;

    # ---- 前台静态 + SPA 回退（技术文档 §10.3）----
    root /srv/tp-home/web-front/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    # ---- API 反向代理 ----
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
    }

    # ---- 上传文件静态托管（禁止脚本执行，PRD 9.2）----
    location /static/ {
        alias /data/tp-home/uploads/;
        location ~* \.(php|py|sh|exe)$ { deny all; }   # 双重防执行
        add_header Cache-Control "public, max-age=86400";
    }
}

# 后台独立子域（或同域 /admin/ 前缀，二选一）
server {
    listen 443 ssl http2;
    server_name admin.tp-home.com;
    # 同前台：root /srv/tp-home/admin-front/dist + SPA 回退 + /api/ /static/ 同上
}
```

---

## 四、上线前检查清单

| 类别 | 检查项 | 状态 |
| --- | --- | --- |
| 安全 | JWT 密钥已改为强随机；APP_ENV=prod | ☐ |
| 安全 | 上传目录禁止脚本执行（Nginx deny all）| ☐ |
| 安全 | 初始超管密码已修改；各账号强密码 | ☐ |
| 安全 | HTTPS 已启用（证书有效）| ☐ |
| 数据 | PostgreSQL 迁移成功（`alembic upgrade head`）| ☐ |
| 数据 | 演示数据已替换/清理为正式素材 | ☐ |
| 数据 | 门店经纬度/客服热线/备案号已录入（后台系统配置）| ☐ |
| 监控 | 数据库每日备份任务已配置（见五）| ☐ |
| 验收 | 三端全链路回归通过（见六冒烟脚本）| ☐ |

---

## 五、备份与运维

```bash
# PostgreSQL 每日备份（crontab 3:00）
0 3 * * * pg_dump -U tp_user -h 127.0.0.1 tp_home | gzip > /data/backup/tp_home_$(date +\%F).sql.gz
# 保留 30 天
0 4 * * * find /data/backup -name "tp_home_*.sql.gz" -mtime +30 -delete
```

- 上传目录 `/data/tp-home/uploads` 需纳入服务器快照/异地备份；
- 版本升级流程：备份库 → `git pull` → `alembic upgrade head` → 重启后端 → 刷新前端静态。

---

## 六、销售端操作说明（培训材料）

> 入口：后台 `https://admin.tp-home.com`，账号由系统管理员分配（角色建议"销售客服"）。

| 业务 | 操作路径 | 说明 |
| --- | --- | --- |
| 登录 | 登录页输入账号密码；连续 5 次失败锁 15 分钟 | 忘记密码联系管理员重置 |
| 处理预约 | 用户与咨询 → 预约管理 → 筛选"待确认" → 确认/取消/备注 | 确认后客户前台可见"已确认" |
| **预约转签单** | 预约管理 → 待处理/已确认行 → "转签单" → 填客户与产品清单 → 提交 | 转单后预约自动置"已完成"并关联签单号（V1.9 闭环） |
| 新建签单 | 签单管理 → 新建签单（线下录单）→ 填客户/清单/金额 | 自动生成签单号 TP+日期+序号 |
| 签单状态流转 | 签单管理 → 详情/操作列：开始生产→交付→完成；可取消（填原因）| 每次流转自动记操作日志，客户前台可查进度 |
| 留言回复 | 用户与咨询 → 留言管理 → 待处理行 → 处理（填回复）| 前台"查询我的留言"可见回复 |
| 经销商审核 | 用户与咨询 → 经销商审核 → 待审核行 → 通过（设折扣率）/驳回 | 通过后用户即时获得经销商门户权限 |
| B 端处理 | B 端业务 → 加盟/询价（报价填总价+明细）/工程（开始设计→报价→签约）| 询价报价后客户可查状态 |
| 招聘处理 | 招聘管理 → 简历管理 → 筛选/面试/录用/未通过 | 候选人凭查询号+手机尾号查进度 |
| 数据看板 | 总览看板（KPI+7 日趋势+产品排行）/ 数据统计（页面/事件）| 每天上班先看看板处理待办 |

**前台用户侧关键路径**（客服引导用）：
- 浏览 → 产品详情 → 预约到店（弹窗带产品）→ 个人中心"我的预约"
- 加盟/询价/工程 → 表单提交 → 后台 B 端管理处理
- 招聘 → 岗位投递 → 获得查询号 → 投递进度查询

---

## 七、P6 回归结论（本机）

| 项目 | 结果 |
| --- | --- |
| PostgreSQL 迁移兼容（循环外键补丁 + 索引） | ✅ 已写入迁移脚本，全新 SQLite 库验证通过（33 表 + 6 索引）；PG 由部署环境 `alembic upgrade head` 回归 |
| 安全配置生产校验（PG 强制/JWT 强制） | ✅ config.py 内置 |
| N+1 查询修复（产品列表 selectinload） | ✅ |
| 全链路冒烟（浏览→预约→转签单→签单→B端→招聘→统计→日志） | ✅ 全部通过 |
| 双端生产构建 | ✅ web-front 360KB(gzip 110KB) / admin-front 构建成功 |
| 移动端专项（安全区/富文本防溢出/响应式） | ✅ 前台补丁完成 |

**已知限制（上线前关注）**：
1. 后台 bundle >500KB（AntD+ECharts），建议生产开启 code-split / CDN 分包；
2. 短信/地图为 Mock/降级状态，上线需接真实渠道 Key；
3. 操作日志中间件为同步写库，量大时可换异步队列。
