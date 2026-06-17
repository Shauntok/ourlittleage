"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PasswordInput from "@/components/ui/PasswordInput";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function AccountSettingsPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    loadAccount();
  }, []);

  async function loadAccount() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/");
      return;
    }

    setEmail(user.email || "");
    setLoading(false);
  }

  function showMessage(text: string) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 3500);
  }

  function updatePassword() {
    if (!email) {
      showMessage("无法读取当前邮箱，请重新登录后再试。");
      return;
    }

    if (!currentPassword.trim()) {
      showMessage("请输入当前密码。");
      return;
    }

    if (!newPassword.trim()) {
      showMessage("请输入新密码。");
      return;
    }

    if (newPassword.length < 8) {
      showMessage("新密码至少需要 8 个字符。");
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage("两次输入的新密码不一致。");
      return;
    }

    if (currentPassword === newPassword) {
      showMessage("新密码不能和当前密码一样。");
      return;
    }

    setShowPasswordDialog(true);
  }

  async function confirmUpdatePassword() {
    setShowPasswordDialog(false);
    setSaving(true);

    const { error: verifyError } =
      await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

    if (verifyError) {
      setSaving(false);
      showMessage("当前密码不正确，请重新输入。");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setSaving(false);
      showMessage(`修改密码失败：${error.message}`);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("notifications").insert([
        {
          user_id: user.id,
          title: "🔐 账号安全通知",
          content:
            "你的登录密码刚刚被修改。如果这不是你本人操作，请尽快联系管理员。",
          type: "system",
          is_important: true,
        },
      ]);
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    setSaving(false);

    showMessage("密码已更新 🔐");
  }

  function signOut() {
    setShowLogoutDialog(true);
  }

  async function confirmSignOut() {
    setShowLogoutDialog(false);

    await supabase.auth.signOut();

    router.push("/");
  }

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 text-sm text-white/40">
        正在读取账号资料...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-xs tracking-[0.35em] text-white/25">ACCOUNT</p>

      <h1 className="mt-4 text-4xl font-light tracking-tight md:text-5xl">
        账号安全
      </h1>

      <p className="mt-5 max-w-2xl text-sm leading-7 text-white/40 md:mt-6">
        管理你的登录邮箱、密码，以及账号登入状态。
      </p>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl md:mt-12 md:p-7">
        <p className="text-xs tracking-[0.3em] text-white/25">EMAIL</p>

        <h2 className="mt-4 text-2xl font-light">当前邮箱</h2>

        <p className="mt-4 break-all rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-white/55">
          {email || "未读取到邮箱"}
        </p>

        <p className="mt-4 text-sm leading-7 text-white/30">
          Alpha 阶段暂时不开放直接更换邮箱。之后会加入邮箱验证与换绑流程。
        </p>
      </section>

      <section className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl md:mt-6 md:p-7">
        <p className="text-xs tracking-[0.3em] text-white/25">PASSWORD</p>

        <h2 className="mt-4 text-2xl font-light">修改密码</h2>

        <p className="mt-4 text-sm leading-7 text-white/35">
          为了保护账号安全，修改密码前需要先确认当前密码。
        </p>

        <div className="mt-6 space-y-4">
          <PasswordInput
            value={currentPassword}
            onChange={setCurrentPassword}
            placeholder="当前密码"
            className="bg-black/30 focus:bg-black/30"
          />

          <PasswordInput
            value={newPassword}
            onChange={setNewPassword}
            placeholder="新密码，至少 8 个字符"
            className="bg-black/30 focus:bg-black/30"
          />

          <PasswordInput
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="再次输入新密码"
            className="bg-black/30 focus:bg-black/30"
          />

          <button
            type="button"
            onClick={updatePassword}
            disabled={saving}
            className="w-full rounded-full bg-white px-8 py-4 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40 md:w-auto"
          >
            {saving ? "更新中..." : "更新密码"}
          </button>
        </div>
      </section>

      <section className="mt-5 rounded-[2rem] border border-red-500/20 bg-red-500/[0.045] p-5 backdrop-blur-2xl md:mt-6 md:p-7">
        <p className="text-xs tracking-[0.3em] text-red-100/40">SESSION</p>

        <h2 className="mt-4 text-2xl font-light text-red-100">登出账号</h2>

        <p className="mt-4 text-sm leading-7 text-red-100/45">
          登出后，你需要重新登录才能回到小时代。
        </p>

        <button
          type="button"
          onClick={signOut}
          className="mt-6 w-full rounded-full border border-red-400/30 bg-red-500/10 px-8 py-4 text-sm text-red-100/80 transition hover:bg-red-500/20 hover:text-red-100 md:w-auto"
        >
          登出
        </button>
      </section>

      {message && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-white/10 bg-zinc-900/95 px-5 py-3 text-sm text-white shadow-2xl backdrop-blur-xl">
          {message}
        </div>
      )}

      <ConfirmDialog
        open={showPasswordDialog}
        title="修改密码？"
        description="修改完成后，下次登录需要使用新密码。"
        confirmText="确认修改"
        cancelText="取消"
        loading={saving}
        onClose={() => setShowPasswordDialog(false)}
        onConfirm={confirmUpdatePassword}
      />

      <ConfirmDialog
        open={showLogoutDialog}
        title="登出小时代？"
        description="登出后，需要重新输入账号密码才能回来。"
        confirmText="登出"
        cancelText="取消"
        danger
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={confirmSignOut}
      />
    </div>
  );
}

