import { Link } from "react-router-dom";

/**
 * 前台页脚（UIUX：forest-0 最深林底 + 金色分隔线）
 * 功能说明：品牌信息 + 主导航链接 + 版权/备案号（备案号从系统配置读取，P2 接入）。
 */
export default function Footer() {
  return (
    <footer className="bg-forest-0 border-t border-line-gold mt-20">
      {/* 顶部金色装饰线 */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      <div className="max-w-[1200px] mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* 品牌信息 */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#E8CE8A] to-[#A8862A] text-[#1B2A20] font-extrabold flex items-center justify-center">
              TP
            </span>
            <span className="font-serif-title text-base tracking-[2px] text-cream">TP全屋家居</span>
          </div>
          <p className="text-sm text-cream-3 leading-relaxed max-w-[280px]">
            把原始森林的气息搬进你的家 —— 全屋家居定制专家
          </p>
        </div>

        {/* 快速导航 */}
        <div>
          <h4 className="text-sm text-gold-soft tracking-[2px] mb-4">快速导航</h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "产品中心", to: "/products" },
              { label: "实景案例", to: "/cases" },
              { label: "新闻资讯", to: "/news" },
              { label: "招聘", to: "/recruit" },
              { label: "加盟合作", to: "/franchise" },
              { label: "联系我们", to: "/contact" },
            ].map((l) => (
              <Link key={l.to} to={l.to} className="text-sm text-cream-2 hover:text-gold-soft transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* 联系方式（Q4 默认占位，确认后替换） */}
        <div>
          <h4 className="text-sm text-gold-soft tracking-[2px] mb-4">联系我们</h4>
          <p className="text-sm text-cream-3">客服热线：400-000-0000</p>
          <p className="text-sm text-cream-3 mt-1">营业时间：周一至周日 9:00-18:00</p>
        </div>
      </div>

      {/* 版权行（备案号占位） */}
      <div className="border-t border-line-green py-4 text-center text-xs text-cream-3">
        © {new Date().getFullYear()} TP全屋家居 · 备案号：粤ICP备XXXXXX号
      </div>
    </footer>
  );
}
