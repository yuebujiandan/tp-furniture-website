import { useEffect, useRef } from "react";
import * as echarts from "echarts";

/**
 * ECharts 封装组件（技术文档 §8.5：深林金韵主题化图表）
 * 实现说明：
 * - 统一实例管理：挂载初始化、option 更新 setOption、窗口 resize 自适应、卸载 dispose；
 * - 深林金韵默认配色（金色主色/暖白文字/forest 网格线）。
 */

/** 深林金韵图表主题（UIUX §3.1 同源） */
export const chartTheme = {
  textColor: "#B9C8BD",
  splitLine: "rgba(212,175,55,.12)",
  gold: "#D4AF37",
  goldSoft: "#E6CE8A",
  fern: "#3FA464",
  cream: "#F1EBDD",
};

interface ChartProps {
  // EChartsCoreOption 为宽松类型（接受字面量，避免 strict 模式下 type 字段类型收窄问题）
  option: echarts.EChartsCoreOption;
  height?: number;
}

export default function Chart({ option, height = 300 }: ChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  // 初始化 + 更新 + 自适应 + 销毁
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chartRef.current = chart;
    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  // option 变化 → setOption（不合并以便平滑过渡）
  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  return <div ref={ref} style={{ width: "100%", height }} />;
}
