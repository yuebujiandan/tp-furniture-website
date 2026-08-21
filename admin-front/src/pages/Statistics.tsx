import { useEffect, useState } from "react";
import { Card, Col, Row, Segmented } from "antd";
import Chart, { chartTheme } from "../components/Chart";
import { getStatOverview, getStatTrend, getStatPages, getStatProducts, getStatEvents } from "../api/admin";

/**
 * 数据统计页（P5，PRD 7.6 / 技术文档 §6.6.7）
 * 实现说明：
 * - 顶部 KPI：今日/昨日/近 30 日 PV/UV + 环比；
 * - 7/30 日切换的趋势折线、页面排行饼图、产品排行柱状、事件统计；
 * - 全部 ECharts 深林金韵主题。
 */
export default function Statistics() {
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof getStatOverview>> | null>(null);
  const [days, setDays] = useState(7);
  const [trend, setTrend] = useState<{ date: string; pv: number; uv: number }[]>([]);
  const [pages, setPages] = useState<{ target: string; pv: number; uv: number }[]>([]);
  const [products, setProducts] = useState<{ name: string; pv: number }[]>([]);
  const [events, setEvents] = useState<{ event: string; count: number }[]>([]);

  useEffect(() => {
    getStatOverview().then(setOverview).catch(() => {});
    load(days);
  }, [days]);

  /** 按天数加载各维度数据 */
  async function load(d: number) {
    try {
      const [t, p, pr, e] = await Promise.all([
        getStatTrend(d), getStatPages(d, 10), getStatProducts(d), getStatEvents(d),
      ]);
      setTrend(t); setPages(p); setProducts(pr); setEvents(e);
    } catch { /* 拦截器提示 */ }
  }

  // 趋势折线
  const trendOption = {
    tooltip: { trigger: "axis" },
    legend: { data: ["PV", "UV"], textStyle: { color: chartTheme.textColor } },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: "category", data: trend.map((t) => t.date.slice(5)), axisLine: { lineStyle: { color: chartTheme.splitLine } }, axisLabel: { color: chartTheme.textColor } },
    yAxis: { type: "value", splitLine: { lineStyle: { color: chartTheme.splitLine } }, axisLabel: { color: chartTheme.textColor } },
    series: [
      { name: "PV", type: "line", smooth: true, data: trend.map((t) => t.pv), itemStyle: { color: chartTheme.gold }, areaStyle: { color: "rgba(212,175,55,.15)" } },
      { name: "UV", type: "line", smooth: true, data: trend.map((t) => t.uv), itemStyle: { color: chartTheme.fern }, areaStyle: { color: "rgba(63,164,100,.12)" } },
    ],
  };

  // 页面排行饼图
  const pageOption = {
    tooltip: { trigger: "item", formatter: "{b}: {c} PV ({d}%)" },
    legend: { type: "scroll", orient: "vertical", right: 10, top: 20, textStyle: { color: chartTheme.textColor } },
    series: [{
      type: "pie", radius: ["35%", "62%"], center: ["38%", "50%"],
      data: pages.map((p) => ({ name: p.target, value: p.pv })),
      itemStyle: { borderColor: "#0C2418", borderWidth: 2 },
      color: [chartTheme.gold, chartTheme.goldSoft, chartTheme.fern, "#8FB8E8", "#E8A25A", "#E0705A", "#5CC48A", "#A8862A"],
    }],
  };

  // 产品排行柱状
  const productOption = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 120, right: 30, top: 10, bottom: 30 },
    xAxis: { type: "value", splitLine: { lineStyle: { color: chartTheme.splitLine } }, axisLabel: { color: chartTheme.textColor } },
    yAxis: { type: "category", data: products.map((p) => p.name.length > 10 ? p.name.slice(0, 10) + "…" : p.name), axisLine: { lineStyle: { color: chartTheme.splitLine } }, axisLabel: { color: chartTheme.textColor } },
    series: [{ type: "bar", data: products.map((p) => p.pv), itemStyle: { color: chartTheme.gold, borderRadius: [0, 6, 6, 0] }, barWidth: 12 }],
  };

  // 事件柱状
  const eventOption = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: "category", data: events.map((e) => e.event), axisLine: { lineStyle: { color: chartTheme.splitLine } }, axisLabel: { color: chartTheme.textColor } },
    yAxis: { type: "value", splitLine: { lineStyle: { color: chartTheme.splitLine } }, axisLabel: { color: chartTheme.textColor } },
    series: [{ type: "bar", data: events.map((e) => e.count), itemStyle: { color: chartTheme.fern, borderRadius: [6, 6, 0, 0] }, barWidth: 20 }],
  };

  const o = overview;
  const kpi = [
    { label: "今日 PV", value: o?.today.pv ?? 0, extra: `环比 ${o?.compare.pv_change ?? 0}%` },
    { label: "今日 UV", value: o?.today.uv ?? 0, extra: `环比 ${o?.compare.uv_change ?? 0}%` },
    { label: "昨日 PV", value: o?.yesterday.pv ?? 0 },
    { label: "昨日 UV", value: o?.yesterday.uv ?? 0 },
    { label: "近 30 日 PV", value: o?.month.pv ?? 0 },
    { label: "近 30 日 UV", value: o?.month.uv ?? 0 },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-cream font-serif-title tracking-[2px]">数据统计</h2>
        <Segmented value={days} onChange={(v) => setDays(v as number)}
          options={[{ label: "近 7 日", value: 7 }, { label: "近 30 日", value: 30 }]} />
      </div>

      {/* PV/UV KPI 卡 */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {kpi.map((k) => (
          <div key={k.label} className="p-5 rounded-[18px] bg-forest-2 border border-line-gold">
            <p className="text-xs text-cream-3 mb-2">{k.label}</p>
            <p className="text-xl font-serif-title text-gold-gradient">{k.value}</p>
            {k.extra && <p className="text-[10px] text-cream-3 mt-1">{k.extra}</p>}
          </div>
        ))}
      </div>

      <Row gutter={16}>
        {/* 趋势折线 */}
        <Col xs={24} xl={14} className="mb-4">
          <Card title={<span className="text-cream-2 text-sm">PV/UV 趋势</span>} style={{ background: "#123526", borderColor: "rgba(212,175,55,.28)" }}>
            <Chart option={trendOption} height={320} />
          </Card>
        </Col>
        {/* 页面排行饼图 */}
        <Col xs={24} xl={10} className="mb-4">
          <Card title={<span className="text-cream-2 text-sm">页面访问分布</span>} style={{ background: "#123526", borderColor: "rgba(212,175,55,.28)" }}>
            <Chart option={pageOption} height={320} />
          </Card>
        </Col>
        {/* 产品排行 */}
        <Col xs={24} xl={12} className="mb-4">
          <Card title={<span className="text-cream-2 text-sm">产品浏览排行</span>} style={{ background: "#123526", borderColor: "rgba(212,175,55,.28)" }}>
            <Chart option={productOption} height={320} />
          </Card>
        </Col>
        {/* 事件统计 */}
        <Col xs={24} xl={12} className="mb-4">
          <Card title={<span className="text-cream-2 text-sm">事件统计（收藏/预约/表单）</span>} style={{ background: "#123526", borderColor: "rgba(212,175,55,.28)" }}>
            <Chart option={eventOption} height={320} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
