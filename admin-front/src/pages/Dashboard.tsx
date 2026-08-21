import { useEffect, useState } from "react";
import { Card, Tag } from "antd";
import Chart, { chartTheme } from "../components/Chart";
import { getDashboardOverview, getStatProducts, DashboardOverview } from "../api/admin";

/**
 * 总览看板（P5 完整版，PRD 7.6.3 / 技术文档 §6.6.7）
 * 实现说明：
 * - KPI 卡片：今日 PV/UV/新增用户/新预约/新签单 + 待处理事项（留言/预约/库存预警/生产中签单）；
 * - 近 7 日 PV/UV 趋势折线（ECharts 深林金韵主题）；
 * - 产品浏览排行 TOP10 横向柱状（PRD 7.6.1）。
 */
export default function Dashboard() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [products, setProducts] = useState<{ target: string; name: string; pv: number }[]>([]);

  useEffect(() => {
    getDashboardOverview().then(setData).catch(() => {});
    getStatProducts(30).then(setProducts).catch(() => {});
  }, []);

  // 近 7 日趋势折线 option
  const trendOption = {
    tooltip: { trigger: "axis" },
    legend: { data: ["PV", "UV"], textStyle: { color: chartTheme.textColor } },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: "category", data: data?.trend_7d.map((t) => t.date.slice(5)) ?? [], axisLine: { lineStyle: { color: chartTheme.splitLine } }, axisLabel: { color: chartTheme.textColor } },
    yAxis: { type: "value", splitLine: { lineStyle: { color: chartTheme.splitLine } }, axisLabel: { color: chartTheme.textColor } },
    series: [
      { name: "PV", type: "line", smooth: true, data: data?.trend_7d.map((t) => t.pv) ?? [], itemStyle: { color: chartTheme.gold }, areaStyle: { color: "rgba(212,175,55,.15)" } },
      { name: "UV", type: "line", smooth: true, data: data?.trend_7d.map((t) => t.uv) ?? [], itemStyle: { color: chartTheme.fern }, areaStyle: { color: "rgba(63,164,100,.12)" } },
    ],
  };

  // 产品排行横向柱状 option
  const productOption = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 110, right: 30, top: 10, bottom: 30 },
    xAxis: { type: "value", splitLine: { lineStyle: { color: chartTheme.splitLine } }, axisLabel: { color: chartTheme.textColor } },
    yAxis: {
      type: "category",
      data: products.map((p) => p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name),
      axisLine: { lineStyle: { color: chartTheme.splitLine } }, axisLabel: { color: chartTheme.textColor },
    },
    series: [{ type: "bar", data: products.map((p) => p.pv), itemStyle: { color: chartTheme.gold, borderRadius: [0, 6, 6, 0] }, barWidth: 14 }],
  };

  const kpiCards = data ? [
    { label: "今日 PV", value: data.today.pv, unit: "" },
    { label: "今日 UV", value: data.today.uv, unit: "" },
    { label: "今日新增用户", value: data.today.new_users, unit: "" },
    { label: "今日新预约", value: data.today.new_appointments, unit: "" },
    { label: "今日新签单", value: data.today.new_contracts, unit: "" },
  ] : [];
  const pending = data?.pending;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-cream font-serif-title tracking-[2px]">总览看板</h2>
        {/* 待处理事项徽标（PRD 7.6.3） */}
        <div className="flex gap-2">
          {pending && <>
            <Tag color="warning">留言 {pending.messages}</Tag>
            <Tag color="processing">预约 {pending.appointments}</Tag>
            <Tag color="error">库存预警 {pending.low_stock}</Tag>
            <Tag color="blue">生产中 {pending.contracts_producing}</Tag>
          </>}
        </div>
      </div>

      {/* KPI 卡片（PRD 7.6.3） */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {kpiCards.map((k) => (
          <div key={k.label} className="p-5 rounded-[18px] bg-forest-2 border border-line-gold">
            <p className="text-xs text-cream-3 mb-2">{k.label}</p>
            <p className="text-2xl font-serif-title text-gold-gradient">{k.value}</p>
          </div>
        ))}
      </div>

      {/* 趋势折线 + 产品排行 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title={<span className="text-cream-2 text-sm">近 7 日访问趋势</span>} style={{ background: "#123526", borderColor: "rgba(212,175,55,.28)" }}>
          <Chart option={trendOption} height={300} />
        </Card>
        <Card title={<span className="text-cream-2 text-sm">产品浏览排行 TOP10（近 30 日）</span>} style={{ background: "#123526", borderColor: "rgba(212,175,55,.28)" }}>
          <Chart option={productOption} height={300} />
        </Card>
      </div>
    </div>
  );
}
