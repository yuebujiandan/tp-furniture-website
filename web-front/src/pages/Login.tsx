import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { login, sendSmsCode } from "../api/auth";
import { useAuthStore } from "../stores/auth";
import { useUiStore } from "../stores/ui";

/**
 * 登录页（PRD 6.7：密码登录 / 验证码登录，未登录跳转登录 + 回跳 PRD 6.7.3）
 * 功能说明：
 * - 双 Tab：密码登录 / 验证码登录（验证码 Mock 通道：开发环境后端返回 mock_code 自动填充提示）；
 * - 登录成功：写入 auth store → 跳转 redirect 回跳页（默认首页）；
 * - UI：全屏深林渐变 + 中央 400px 登录卡（对应后台登录卡风格，UIUX §6）。
 */
export default function Login() {
  const [mode, setMode] = useState<"password" | "sms">("password");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mockCode, setMockCode] = useState<string | null>(null); // 开发联调提示
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const loginStore = useAuthStore((s) => s.login);
  const showToast = useUiStore((s) => s.showToast);

  // 回跳地址（PRD 6.7.3：登录后回跳原页面）
  const redirect = params.get("redirect") || "/";

  /** 发送验证码：成功回填 mock_code（开发环境）并启动 60s 倒计时 */
  async function handleSendCode() {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      showToast("请输入正确的手机号");
      return;
    }
    try {
      const res = await sendSmsCode(phone);
      setMockCode(res.mock_code);
      showToast("验证码已发送");
      setCountdown(60);
      const timer = setInterval(() => setCountdown((c) => (c <= 1 ? (clearInterval(timer), 0) : c - 1)), 1000);
    } catch {
      /* 拦截器已提示 */
    }
  }

  /** 提交登录 */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "password") {
        const res = await login(phone, password);
        loginStore(res.access_token, res.refresh_token, res.user);
      } else {
        const res = await loginBySms(phone, code);
        loginStore(res.access_token, res.refresh_token, res.user);
      }
      showToast("登录成功");
      navigate(redirect, { replace: true }); // 回跳原页面
    } catch {
      /* 拦截器已提示 */
    } finally {
      setLoading(false);
    }
  }

  /** 验证码登录函数（避免循环依赖：直接导入） */
  async function loginBySms(p: string, c: string) {
    const { loginBySms: api } = await import("../api/auth");
    return api(p, c);
  }

  return (
    // 全屏深林渐变背景 + 登录卡（UIUX §6）
    <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(125deg,#0A2416_0%,#14402B_48%,#0C2418_100%)] px-4">
      <div className="w-[min(400px,92vw)] rounded-[22px] bg-gradient-to-b from-forest-2 to-forest-1 border border-line-gold shadow-lg p-8 relative">
        {/* 顶部金色装饰线 */}
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />

        {/* 品牌标题 */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#E8CE8A] to-[#A8862A] text-[#1B2A20] font-extrabold shadow-gold mb-3">
            TP
          </span>
          <h1 className="font-serif-title text-2xl tracking-[4px] text-cream">TP全屋家居</h1>
          <p className="text-xs text-cream-3 mt-1 tracking-[2px]">欢迎回来，请登录</p>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b border-line-gold mb-6">
          {(
            [
              { key: "password", label: "密码登录" },
              { key: "sms", label: "验证码登录" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setMode(t.key)}
              className={[
                "flex-1 pb-3 text-sm tracking-wider transition-colors",
                mode === t.key ? "text-gold-soft border-b-2 border-gold" : "text-cream-3 hover:text-cream-2",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 登录表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            placeholder="手机号"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none transition-all"
          />
          {mode === "password" ? (
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none transition-all"
            />
          ) : (
            <div className="flex gap-3">
              <input
                placeholder="验证码"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="flex-1 px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm placeholder:text-cream-3 focus:border-gold outline-none transition-all"
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={countdown > 0}
                className="px-4 rounded-[14px] border border-gold text-gold-soft text-xs disabled:opacity-50 whitespace-nowrap"
              >
                {countdown > 0 ? `${countdown}s` : "获取验证码"}
              </button>
            </div>
          )}

          {/* 开发联调提示：Mock 验证码（生产环境后端不返回） */}
          {mode === "sms" && mockCode && (
            <p className="text-xs text-amber">开发环境验证码：{mockCode}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-gradient-to-br from-[#E8CE8A] via-[#C9A227] to-[#A8862A] text-[#1B2A20] font-semibold shadow-gold disabled:opacity-50 hover:-translate-y-0.5 transition-all"
          >
            {loading ? "登录中..." : "登 录"}
          </button>
        </form>

        {/* 注册引导 */}
        <p className="text-center text-xs text-cream-3 mt-6">
          还没有账号？
          <Link to="/register" className="text-gold-soft ml-1">
            注册
          </Link>
        </p>
      </div>
    </div>
  );
}
