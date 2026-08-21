import { Card, Empty } from "antd";

/**
 * 后台通用占位页（P1 骨架阶段：未实现模块页面统一展示）
 * 功能说明：后续里程碑（P2-P5）按《开发技术文档 §8.4 页面清单》逐个替换为真实管理页面。
 */
export default function Placeholder({ title }: { title: string }) {
  return (
    <Card
      title={<span className="text-cream text-sm tracking-wider">{title}</span>}
      style={{ background: "#123526", borderColor: "rgba(212,175,55,.28)" }}
    >
      <Empty
        description={<span className="text-cream-3 text-xs">该模块将在后续里程碑交付</span>}
        style={{ padding: "60px 0" }}
      />
    </Card>
  );
}
