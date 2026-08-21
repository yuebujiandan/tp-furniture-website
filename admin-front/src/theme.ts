import type { ThemeConfig } from "antd";

/**
 * AntD 主题配置（技术文档 §8.2.1 ConfigProvider 权威，UIUX §12.2）
 * 功能说明：
 * - 主色金 #D4AF37、深色背景 forest 系、金色边框、暖白文字；
 * - 后台密度：圆角 8/18/12px（略小于前台，UIUX §6）；
 * - 弹层组件（Select/DatePicker）深色覆盖走 token，禁止逐组件硬编码。
 */
export const antdTheme: ThemeConfig = {
  token: {
    // 主色：香槟金（UIUX §3.1 gold）
    colorPrimary: "#D4AF37",
    // 布局与容器背景（forest 系）
    colorBgLayout: "#0C2418",
    colorBgContainer: "#123526",
    colorBgElevated: "#0A2B1E",
    // 文字：暖白
    colorTextBase: "#F1EBDD",
    // 边框：金色描边（UIUX --line-gold）
    colorBorder: "rgba(212,175,55,.28)",
    // 圆角：后台略小（UIUX §6：lg 18px / md 12px）
    borderRadius: 8,
    // 语义色（UIUX §3.3）
    colorError: "#E0705A",
    colorSuccess: "#5CC48A",
    colorWarning: "#E8A25A",
    colorInfo: "#8FB8E8",
    fontFamily: '"HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
  },
  components: {
    // 菜单：forest-0 底 + 激活项金渐变（技术文档 §8.2.1 侧栏规范）
    Menu: {
      darkItemBg: "#081A10",
      darkItemSelectedBg: "linear-gradient(135deg,#E8CE8A,#C9A227)",
      darkItemSelectedColor: "#1B2A20",
    },
    // 表格：表头金色浅显底（技术文档 §8.3 DataTable）
    Table: {
      headerBg: "rgba(212,175,55,.10)",
      headerColor: "#E6CE8A",
      rowHoverBg: "rgba(212,175,55,.05)",
    },
    // 输入框/选择器深色底
    Select: {
      optionSelectedBg: "#0A2B1E",
      selectorBg: "#0C2418",
    },
    DatePicker: {
      activeBorderColor: "#D4AF37",
      hoverBorderColor: "rgba(212,175,55,.28)",
    },
  },
};
