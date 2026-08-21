/** @type {import('tailwindcss').Config} */
/**
 * 后台 Tailwind 配置 —— 与前台同源深林金韵 Token（技术文档 §2.3：后台圆角略小）
 * 功能说明：
 * - 颜色/字体 Token 与 web-front 完全一致（同源不割裂，UIUX §2.3）；
 * - corePlugins.preflight=false：禁用全局样式重置，避免与 AntD 组件样式冲突。
 */
export default {
  corePlugins: { preflight: false }, // 关键：与 AntD 共存必须关闭 preflight
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: { 0: "#081A10", 1: "#0C2418", 2: "#123526", 3: "#1A4631" },
        moss: "#2E7D4F",
        fern: "#3FA464",
        "fern-soft": "#5CC48A",
        gold: { DEFAULT: "#D4AF37", soft: "#E6CE8A", deep: "#A8862A" },
        cream: { DEFAULT: "#F1EBDD", 2: "#B9C8BD", 3: "#7E9789" },
        coral: "#E0705A",
        amber: "#E8A25A",
        info: "#8FB8E8",
      },
      borderColor: {
        line: { gold: "rgba(212,175,55,.28)", green: "rgba(255,255,255,.10)" },
      },
      borderRadius: {
        lg: "18px", // 后台圆角略小（UIUX §6）
        md: "12px",
      },
      boxShadow: {
        sm: "0 4px 18px rgba(0,0,0,.35)",
        md: "0 14px 40px rgba(0,0,0,.45)",
        gold: "0 8px 26px rgba(212,175,55,.22)",
      },
      fontFamily: {
        serif: ['"STZhongsong"', '"STSong"', '"SimSun"', '"Songti SC"', '"Noto Serif SC"', "serif"],
        sans: ['"HarmonyOS Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
