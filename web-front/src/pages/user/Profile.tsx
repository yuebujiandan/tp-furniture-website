import { useState } from "react";
import { updateProfile, changePassword } from "../../api/me";
import { useAuthStore } from "../../stores/auth";
import { useUiStore } from "../../stores/ui";

/**
 * 个人资料页（PRD 6.7.2）
 * 实现说明：昵称/头像更新 + 修改密码（校验旧密码，验证码注册用户直接设置）。
 */
export default function Profile() {
  const { user } = useAuthStore();
  const showToast = useUiStore((s) => s.showToast);
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [pwd, setPwd] = useState({ old_password: "", new_password: "" });

  /** 保存资料 */
  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateProfile({ nickname });
      showToast("资料已更新");
    } catch { /* 拦截器已提示 */ }
  }

  /** 修改密码 */
  async function savePwd(e: React.FormEvent) {
    e.preventDefault();
    try {
      await changePassword(pwd);
      showToast("密码修改成功");
      setPwd({ old_password: "", new_password: "" });
    } catch { /* 拦截器已提示（40003 旧密码错误） */ }
  }

  return (
    <div className="space-y-8">
      <h2 className="font-serif-title text-xl tracking-[2px] text-cream">个人资料</h2>

      {/* 手机号（只读） */}
      <div className="rounded-[20px] bg-glass backdrop-blur border border-line-gold p-6">
        <p className="text-xs text-cream-3 mb-2">登录账号（手机号）</p>
        <p className="text-cream text-lg">{user?.phone}</p>
      </div>

      {/* 资料表单 */}
      <form onSubmit={saveProfile} className="rounded-[20px] bg-glass backdrop-blur border border-line-gold p-6 space-y-4">
        <div>
          <label className="block text-xs text-cream-3 mb-2">昵称</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={50}
            className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm focus:border-gold outline-none"
          />
        </div>
        <button type="submit" className="px-8 py-3 rounded-full bg-gradient-to-br from-[#E8CE8A] via-[#C9A227] to-[#A8862A] text-[#1B2A20] font-semibold text-sm shadow-gold hover:-translate-y-0.5 transition-all">
          保存资料
        </button>
      </form>

      {/* 修改密码 */}
      <form onSubmit={savePwd} className="rounded-[20px] bg-glass backdrop-blur border border-line-gold p-6 space-y-4">
        <h3 className="font-serif-title text-base text-cream">修改密码</h3>
        <div>
          <label className="block text-xs text-cream-3 mb-2">当前密码（验证码注册用户留空）</label>
          <input
            type="password" value={pwd.old_password}
            onChange={(e) => setPwd({ ...pwd, old_password: e.target.value })}
            className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm focus:border-gold outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-cream-3 mb-2">新密码（≥6 位）</label>
          <input
            type="password" value={pwd.new_password}
            onChange={(e) => setPwd({ ...pwd, new_password: e.target.value })}
            minLength={6}
            className="w-full px-4 py-3 rounded-[14px] bg-forest-1/80 border border-line-gold text-cream text-sm focus:border-gold outline-none"
          />
        </div>
        <button type="submit" className="px-8 py-3 rounded-full border-[1.5px] border-gold text-gold-soft text-sm hover:bg-gold/15 transition-all">
          修改密码
        </button>
      </form>
    </div>
  );
}
