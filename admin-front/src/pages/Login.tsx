import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { adminLogin } from "../api/auth";
import { setLogin } from "../store/authSlice";

/**
 * 后台登录页（UIUX §6：全屏渐变 + 400px 登录卡；PRD 7.0：5 次失败锁 15 分钟提示）
 * 功能说明：
 * - 账号密码登录；成功后写入 Redux（token+员工+权限码）并跳转 redirect 或总览看板；
 * - 登录失败提示由后端返回（42903 锁定提示）。
 */
export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const redirect = params.get("redirect") || "/admin/dashboard";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await adminLogin(username, password);
      dispatch(setLogin(res)); // 保存双 token + 员工信息（含权限码）
      navigate(redirect, { replace: true });
    } catch {
      /* 拦截器已提示（含 5 次失败锁定 42903） */
    } finally {
      setLoading(false);
    }
  }

  return (
    // 全屏深林渐变背景（UIUX §6 登录规范）
    <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(125deg,#0A2416_0%,#14402B_48%,#0C2418_100%)] px-4">
      {/* 登录卡：border-gold/55 替代 line-gold (28% 透明) 解决边框在渐变背景上视觉虚化问题；移除 shadow-lg 避免与边框叠加产生偏移 */}
      <div className="w-[min(400px,92vw)] rounded-[22px] bg-gradient-to-b from-forest-2 to-forest-1 border border-gold/55 p-8 relative">

        <div className="text-center mb-8">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#E8CE8A] to-[#A8862A] text-[#1B2A20] font-extrabold shadow-gold mb-3">
            TP
          </span>
          <h1 className="font-serif-title text-2xl tracking-[4px] text-cream">后台管理</h1>
          <p className="text-xs text-cream-3 mt-1 tracking-[2px]">TP全屋家居 · 运营管理平台</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            placeholder="账号"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none transition-all"
          />
          <input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none transition-all"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-[14px] bg-gradient-to-br from-[#E8CE8A] via-[#C9A227] to-[#A8862A] text-[#1B2A20] font-semibold shadow-gold disabled:opacity-50 hover:-translate-y-0.5 transition-all"
          >
            {loading ? "登录中..." : "登 录"}
          </button>
        </form>

        <p className="text-center text-xs text-cream-3 mt-6">默认账号 admin / admin123（种子数据初始化）</p>
      </div>
    </div>
  );
}
