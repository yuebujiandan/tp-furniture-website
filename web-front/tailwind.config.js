/** @type {import('tailwindcss').Config} */
/**
 * 前台 Tailwind 配置 —— 深林金韵 Token 映射（UIUX §12.1 / 技术文档 §7.2 权威）
 * 功能说明：将设计 Token 映射为 Tailwind 语义类；禁止在组件中散落硬编码颜色。
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // 深林金韵色板（UIUX §3.1）
      colors: {
        // 背景四级：最深林底 → 主背景 → 次级背景 → hover/亮层
        forest: { 0: "#081A10", 1: "#0C2418", 2: "#123526", 3: "#1A4631" },
        // 绿色系：主色/亮叶绿/确认态
        moss: "#2E7D4F",
        fern: "#3FA464",
        "fern-soft": "#5CC48A",
        // 金色系：主点缀/浅金高亮/深金渐变端
        gold: { DEFAULT: "#D4AF37", soft: "#E6CE8A", deep: "#A8862A" },
        // 正文三级
        cream: { DEFAULT: "#F1EBDD", 2: "#B9C8BD", 3: "#7E9789" },
        // 语义色
        coral: "#E0705A",
        amber: "#E8A25A",
        info: "#8FB8E8",
      },
      borderColor: {
        // 金色描边 / 中性描边（UIUX §3.1）
        line: { gold: "rgba(212,175,55,.28)", green: "rgba(255,255,255,.10)" },
      },
      backgroundColor: {
        // 玻璃卡片底色（配合 backdrop-blur，UIUX §13.4）
        glass: "rgba(18,53,38,.72)",
      },
      borderRadius: {
        // 前台卡片/弹层圆角（后台略小）
        lg: "20px",
        md: "14px",
      },
      boxShadow: {
        // 层级阴影（UIUX §3.1）
        sm: "0 4px 18px rgba(0,0,0,.35)",
        md: "0 14px 40px rgba(0,0,0,.45)",
        lg: "0 24px 70px rgba(0,0,0,.55)",
        // 金色 CTA 专属光晕
        gold: "0 8px 26px rgba(212,175,55,.22)",
      },
      fontFamily: {
        // 标题宋体衬线 / 正文无衬线（UIUX §3.2）
        serif: ['"STZhongsong"', '"STSong"', '"SimSun"', '"Songti SC"', '"Noto Serif SC"', "serif"],
        sans: ['"HarmonyOS Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', "-apple-system", "sans-serif"],
      },
      transitionTimingFunction: {
        // 全局缓动曲线（UIUX §3.1）
        ease: "cubic-bezier(.4,0,.2,1)",
      },
    },
  },
  plugins: [],
};
