"""P2 演示种子数据（对齐 PRD §11.2 初始化清单：50+ SKU / 10+ 案例 / 20+ 新闻 / 门店 / 岗位等）。

实现说明：
- 幂等：products 表已有数据时跳过（避免重复插入）；
- 图片占位：使用 picsum.photos 外部占位图（Q5 确认无素材，上线前替换为真实素材）；
- 覆盖：Banner 4 / 产品 51（3 系列 × 7 空间）/ 案例 12（含工程案例 2）/
  新闻 24（企业 14 + 行业 10）/ 门店 4 / FAQ 8 / 发展历程 6 / 品牌卖点与数据背书。
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models import (
    Banners,
    Cases,
    Faqs,
    Milestones,
    News,
    Products,
    Series,
    SiteConfigs,
    Spaces,
    Stores,
)

# 占位图服务（seed 参数保证每张图稳定且各不相同）
def img(seed: str, w: int = 800, h: int = 600) -> str:
    return f"https://picsum.photos/seed/{seed}/{w}/{h}"


SERIES_NAMES = ["系列A", "系列B", "系列C"]
SPACE_NAMES = ["客厅", "卧室", "餐厅", "书房", "茶室", "办公", "儿童房"]
STYLES = ["新中式", "现代简约", "轻奢", "原木风", "北欧", "侘寂"]
MATERIALS = ["北美黑胡桃", "白蜡木", "樱桃木", "橡木", "缅甸花梨"]
NEWS_TITLES_COMPANY = [
    "TP全屋家居 2026 秋季新品发布会圆满举行",
    "TP全屋家居荣获中国家居行业年度创新品牌奖",
    "TP全屋家居 × 意大利设计师联名系列正式发布",
    "TP全屋家居工厂开放日：见证一件家具的诞生",
    "TP全屋家居启动全国经销商服务体系升级计划",
    "TP全屋家居荣获省绿色家居示范企业称号",
    "TP全屋家居品牌形象全面焕新",
    "TP全屋家居与知名室内设计师达成战略合作",
    "TP全屋家居智能家居产品线正式亮相",
    "TP全屋家居亮相广州国际家具博览会",
    "TP全屋家居荣获消费者信赖品牌奖",
    "TP全屋家居启动校园人才招聘计划",
    "TP全屋家居年度经销商大会圆满落幕",
    "TP全屋家居新零售体验馆开业",
]
NEWS_TITLES_INDUSTRY = [
    "2026 全屋定制行业趋势报告发布",
    "家居行业数字化营销白皮书解读",
    "全屋定制 vs 成品家具：消费者如何选择",
    "实木家具保养指南：让家具历久弥新",
    "2026 家居色彩流行趋势：自然主义回归",
    "全屋定制如何避坑：五个关键点",
    "绿色环保建材标准全面升级",
    "智能家居与全屋定制融合发展观察",
    "中式美学的当代演绎：新中式家居潮流",
    "定制家具验收标准与注意事项",
]
CASE_TITLES = [
    "广州 130㎡ 三居室 · 新中式雅居",
    "深圳 89㎡ 两居室 · 现代原木风",
    "佛山 160㎡ 别墅 · 轻奢美学",
    "东莞 120㎡ 四居室 · 侘寂禅意",
    "珠海 100㎡ 三居室 · 北欧清新",
    "广州 200㎡ 大平层 · 东方意境",
    "中山 140㎡ 复式 · 工业混搭",
    "惠州 95㎡ 两居室 · 奶油风",
    "广州 180㎡ 别墅 · 现代轻奢",
    "佛山 110㎡ 三居室 · 原木治愈",
    "广州某五星级酒店 · 工程定制案例",
    "深圳某科技公司办公空间 · 工程定制",
]


def ensure_demo_data(db: Session) -> bool:
    """插入演示数据；已存在则跳过。返回是否执行。"""
    if db.query(Products).count() > 0:
        print("⏭️  演示数据已存在，跳过")
        return False

    # ---------- Banner ----------
    banners = [
        {"image": img("banner1", 1920, 780), "title": "深林金韵 · 全屋定制", "subtitle": "把原始森林的气息搬进你的家", "button_text": "预约到店", "link_url": "/contact", "sort": 1},
        {"image": img("banner2", 1920, 780), "title": "2026 秋季新品系列", "subtitle": "胡桃木 × 香槟金，东方美学新表达", "button_text": "了解更多", "link_url": "/products", "sort": 2},
        {"image": img("banner3", 1920, 780), "title": "实景案例精选", "subtitle": "每一套都是真实的家", "button_text": "查看案例", "link_url": "/cases", "sort": 3},
    ]
    db.add_all([Banners(**b) for b in banners])

    # ---------- 系列（复用占位，确认后替换）----------
    series_map: dict[str, Series] = {}
    for i, name in enumerate(SERIES_NAMES, 1):
        s = db.query(Series).filter(Series.name == name).first()
        if not s:
            s = Series(name=name, image=img(f"series{i}"), intro=f"{name} · 全屋家居系列（占位数据）", sort=i)
            db.add(s)
            db.flush()
        series_map[name] = s

    # ---------- 空间 ----------
    space_map: dict[str, Spaces] = {}
    for i, name in enumerate(SPACE_NAMES, 1):
        sp = db.query(Spaces).filter(Spaces.name == name).first()
        if not sp:
            sp = Spaces(name=name, icon="", sort=i)
            db.add(sp)
            db.flush()
        space_map[name] = sp

    # ---------- 产品 51 个（3 系列 × 17，覆盖 7 空间与多种风格/价格）----------
    products: list[Products] = []
    seq = 0
    for s_name in SERIES_NAMES:
        s = series_map[s_name]
        for k in range(17):
            seq += 1
            sp_name = SPACE_NAMES[seq % 7]
            price = round(3000 + (seq * 1377) % 32000, 2)  # 3000-35000 分散
            publish = "on_shelf" if seq % 8 != 0 else ("draft" if seq % 8 == 1 else "off_shelf")
            products.append(Products(
                name=f"{s_name}·{sp_name}·{k + 1:02d}号 定制柜",
                product_no=f"TP-{s_name[-1]}{seq:03d}",
                series_id=s.id,
                category_id=space_map[sp_name].id,
                style_tags=STYLES[seq % 6],
                specs={"尺寸": f"{1800 + seq * 10}×{600 + seq * 5}×{2200 + seq * 3}mm", "板材": "ENF 级实木多层板"},
                retail_price=price,
                dealer_price=round(price * 0.85, 2) if seq % 3 == 0 else None,  # 部分单品有经销商价
                stock=(seq * 7) % 40,
                stock_warn=5,
                cover_image_url=img(f"prod{seq}", 800, 600),
                images=[img(f"prod{seq}_a"), img(f"prod{seq}_b"), img(f"prod{seq}_c"), img(f"prod{seq}_d"), img(f"prod{seq}_e")],
                detail_html=f"<h3>产品介绍</h3><p>{s_name}·{sp_name}·{k+1:02d}号 定制柜，采用{MATERIALS[seq % 5]}材质，{STYLES[seq % 6]}风格设计。</p>",
                size=f"{1800 + seq * 10}×{600 + seq * 5}×{2200 + seq * 3}mm",
                material=MATERIALS[seq % 5],
                craft="榫卯结构 / 手工打磨",
                warranty="柜体 5 年质保，五金终身维护",
                sort=seq,
                publish_status=publish,
                is_recommend=seq % 9 == 0,
                is_new=seq % 7 == 0,
            ))
    db.add_all(products)
    db.flush()

    # ---------- 案例 12（含 2 工程案例，关联部分产品）----------
    prod_ids = [p.id for p in products[:24]]
    cases = []
    for i, title in enumerate(CASE_TITLES):
        is_eng = i >= 10
        cases.append(Cases(
            title=title,
            cover=img(f"case{i}", 800, 600),
            area="130㎡" if not is_eng else "8000㎡",
            house_type="三居室" if not is_eng else "酒店/办公",
            style_tags=STYLES[i % 6],
            space=SPACE_NAMES[i % 7],
            location_desc=title.split("·")[0].strip(),
            content_html=f"<h3>项目背景</h3><p>{title}，TP全屋家居全案定制落地实景。</p><p>整体采用{STYLES[i % 6]}风格，{MATERIALS[i % 5]}主材，定制柜体与空间完美融合。</p>",
            product_ids=prod_ids[i * 2 : i * 2 + 2],
            is_engineering=is_eng,
            customer_review="服务专业，交付准时，效果超出预期！" if not is_eng else "批量交付品质稳定，项目管理规范。",
            sort=i + 1,
        ))
    db.add_all(cases)

    # ---------- 新闻 24 条 ----------
    news = []
    now = datetime.now(timezone.utc)
    for i, t in enumerate(NEWS_TITLES_COMPANY):
        news.append(News(
            title=t, category="company_news",
            cover=img(f"news_c{i}", 800, 450),
            summary=f"TP全屋家居最新动态：{t}。",
            content_html=f"<h3>{t}</h3><p>这是 {t} 的详细内容。TP全屋家居持续深耕全屋定制领域，以匠心工艺与自然美学服务万千家庭。</p>",
            author="品牌中心", source="TP全屋家居",
            publish_time=now - timedelta(days=i * 2),
            is_published=i % 12 != 0,   # 部分草稿
            is_top=i < 2,
        ))
    for i, t in enumerate(NEWS_TITLES_INDUSTRY):
        news.append(News(
            title=t, category="industry_news",
            cover=img(f"news_i{i}", 800, 450),
            summary=f"行业观察：{t}。",
            content_html=f"<h3>{t}</h3><p>行业深度解析：{t}。为您带来家居行业最新趋势与专业建议。</p>",
            author="行业观察", source="网络整理",
            publish_time=now - timedelta(days=i * 2 + 1),
            is_published=True,
            is_top=False,
        ))
    db.add_all(news)

    # ---------- 门店 4 家 ----------
    stores = [
        {"name": "TP全屋家居·广州天河旗舰店", "address": "广州市天河区珠江新城家居大道 88 号", "lat": 23.1264, "lng": 113.3245, "phone": "020-8888-0001", "business_hours": "9:00-18:00", "sort": 1},
        {"name": "TP全屋家居·广州白云店", "address": "广州市白云区白云大道北 200 号", "lat": 23.2075, "lng": 113.2733, "phone": "020-8888-0002", "business_hours": "9:00-18:00", "sort": 2},
        {"name": "TP全屋家居·深圳宝安店", "address": "深圳市宝安区西乡大道家居城 3 层", "lat": 22.5737, "lng": 113.8832, "phone": "0755-6666-0001", "business_hours": "9:30-19:00", "sort": 3},
        {"name": "TP全屋家居·佛山店", "address": "佛山市禅城区季华路家居博览中心", "lat": 23.0167, "lng": 113.1214, "phone": "0757-3333-0001", "business_hours": "9:00-18:00", "sort": 4},
    ]
    db.add_all([Stores(**s) for s in stores])

    # ---------- FAQ 8 条 ----------
    faqs = [
        {"question": "定制周期一般需要多久？", "answer": "常规全屋定制从设计确认到安装完成约 30-45 天，具体视项目规模而定。"},
        {"question": "定制家具使用什么板材？", "answer": "我们主要采用 ENF 级环保板材与实木系列，符合国家最高环保标准。"},
        {"question": "可以上门测量吗？", "answer": "可以，预约设计师上门测量，首次测量免费。"},
        {"question": "价格如何计算？", "answer": "根据产品规格、材质与功能模块报价，到店可获取专属方案报价。"},
        {"question": "质保政策是怎样的？", "answer": "柜体 5 年质保，五金件终身维护，售后无忧。"},
        {"question": "支持全屋一站式定制吗？", "answer": "支持，涵盖全屋柜体、门墙系统、家具软装全案服务。"},
        {"question": "如何预约到店参观？", "answer": "官网提交预约或拨打客服热线，门店导购将为您安排专属接待。"},
        {"question": "是否支持经销商合作？", "answer": "支持，欢迎通过加盟申请提交合作意向，我们将尽快与您联系。"},
    ]
    db.add_all([Faqs(**f) for f in faqs])

    # ---------- 发展历程 6 条 ----------
    milestones = [
        {"year": "2016", "title": "品牌创立", "description": "TP全屋家居在广州成立，专注全屋定制。", "sort": 1},
        {"year": "2018", "title": "自建工厂投产", "description": "10 万㎡ 智能制造工厂投产，产能大幅提升。", "sort": 2},
        {"year": "2020", "title": "全国布局", "description": "门店突破 50 家，服务覆盖华南地区。", "sort": 3},
        {"year": "2022", "title": "环保升级", "description": "全面切换 ENF 级环保板材，通过绿色认证。", "sort": 4},
        {"year": "2024", "title": "工程业务拓展", "description": "酒店、办公等工程定制业务规模翻番。", "sort": 5},
        {"year": "2026", "title": "品牌焕新", "description": "全新「深林金韵」品牌形象正式发布。", "sort": 6},
    ]
    db.add_all([Milestones(**m) for m in milestones])

    # ---------- 站点配置：品牌卖点 / 数据背书 / 精选案例 / 关于品牌 ----------
    def set_cfg(key: str, value) -> None:
        row = db.query(SiteConfigs).filter(SiteConfigs.key == key).first()
        if row:
            row.value = value
        else:
            db.add(SiteConfigs(key=key, value=value))

    set_cfg("home_brand_points", [
        {"title": "原木臻选", "desc": "严选全球优质原木，纹理自然温润"},
        {"title": "匠心工艺", "desc": "20+ 道工序，榫卯与传统工艺结合"},
        {"title": "环保承诺", "desc": "ENF 级环保标准，即装即住"},
        {"title": "全案服务", "desc": "设计-生产-安装-售后一站式"},
    ])
    set_cfg("home_stats", [
        {"label": "服务家庭", "value": "100000+"},
        {"label": "自建工厂", "value": "10万㎡"},
        {"label": "全国门店", "value": "50+"},
        {"label": "环保认证", "value": "ENF级"},
    ])
    set_cfg("home_featured_case_ids", [c.id for c in db.query(Cases).filter(Cases.is_engineering.is_(False)).limit(3).all()])
    set_cfg("about_tp_html", "<p>TP全屋家居，创立于 2016 年，总部位于广州，是一家集研发、设计、生产、销售、服务于一体的全屋定制企业。</p><p>我们以「深林金韵」为品牌美学，坚持原木臻选与匠心工艺，为千家万户打造自然、舒适、有温度的家。</p>")
    set_cfg("brand_intro_html", "<p>把原始森林的气息搬进你的家 —— 我们相信，好的家具应当与自然共生。</p>")
    set_cfg("honors", [
        {"title": "中国家居行业年度创新品牌奖", "year": "2026"},
        {"title": "省绿色家居示范企业", "year": "2025"},
        {"title": "消费者信赖品牌奖", "year": "2024"},
    ])

    db.commit()
    print(f"✅ 演示数据完成：Banner {len(banners)} / 产品 {len(products)} / 案例 {len(cases)} / 新闻 {len(news)} / 门店 {len(stores)} / FAQ {len(faqs)}")
    return True


if __name__ == "__main__":
    db = SessionLocal()
    try:
        ensure_demo_data(db)
    finally:
        db.close()
