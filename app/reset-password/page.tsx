"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createPasswordRecoveryClient,
  PASSWORD_RECOVERY_STORAGE_KEY,
} from "@/lib/auth/passwordRecovery";
import PasswordInput from "@/components/ui/PasswordInput";

export default function ResetPasswordPage() {
  const [recoveryState, setRecoveryState] = useState<
    "checking" | "ready" | "error" | "success"
  >("checking");
  const [recoveryUser, setRecoveryUser] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const recoveryClientRef = useRef<SupabaseClient | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const authError = params.get("error") || params.get("error_description");
    const isRecoveryLink =
      params.get("type") === "recovery" &&
      Boolean(params.get("access_token")) &&
      Boolean(params.get("refresh_token"));

    if (authError || !isRecoveryLink) {
      window.sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
      const invalidLinkTimeout = window.setTimeout(() => {
        setRecoveryState("error");
      }, 0);

      return () => window.clearTimeout(invalidLinkTimeout);
    }

    const recoveryClient = createPasswordRecoveryClient();
    recoveryClientRef.current = recoveryClient;
    let recoveryVerified = false;

    const {
      data: { subscription },
    } = recoveryClient.auth.onAuthStateChange((event, session) => {
      if (event !== "PASSWORD_RECOVERY" || !session?.user) return;

      recoveryVerified = true;
      setRecoveryUser({
        id: session.user.id,
        email: session.user.email || "已验证邮箱",
      });
      setMessage("");
      setRecoveryState("ready");
    });

    const verificationTimeout = window.setTimeout(() => {
      if (!recoveryVerified) setRecoveryState("error");
    }, 4500);

    return () => {
      window.clearTimeout(verificationTimeout);
      subscription.unsubscribe();
      recoveryClientRef.current = null;
    };
  }, []);

  function showMessage(text: string) {
    setMessage(text);
  }

  async function updatePassword() {
    if (password.length < 8) {
      showMessage("密码至少需要 8 个字符。");
      return;
    }

    if (password !== confirmPassword) {
      showMessage("两次输入的密码不一样。");
      return;
    }

    const recoveryClient = recoveryClientRef.current;
    if (recoveryState !== "ready" || !recoveryClient || !recoveryUser) {
      setRecoveryState("error");
      return;
    }

    setSaving(true);

    const {
      data: { user: verifiedUser },
      error: verificationError,
    } = await recoveryClient.auth.getUser();

    if (
      verificationError ||
      !verifiedUser ||
      verifiedUser.id !== recoveryUser.id
    ) {
      setSaving(false);
      setRecoveryState("error");
      return;
    }

    const { error } = await recoveryClient.auth.updateUser({ password });

    setSaving(false);

    if (error) {
      showMessage(`密码重设失败：${error.message}`);
      return;
    }

    await recoveryClient.auth.signOut({ scope: "local" });
    window.sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);

    const { supabase } = await import("@/lib/supabase");
    await supabase.auth.signOut({ scope: "local" });

    setPassword("");
    setConfirmPassword("");
    setMessage("");
    setRecoveryState("success");
  }

  return (
    <main className="min-h-screen bg-black px-5 py-20 text-white">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />
      <div className="fixed left-1/2 top-1/3 -z-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />

      {message && recoveryState === "ready" && (
        <div
          role="alert"
          className="fixed left-1/2 top-6 z-[999] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-2xl border border-white/10 bg-zinc-900/95 px-5 py-3 text-center text-sm text-white shadow-2xl backdrop-blur-xl"
        >
          {message}
        </div>
      )}

      <section className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.035] p-7 backdrop-blur-2xl md:p-9">
        <p className="text-xs tracking-[0.35em] text-white/30">
          RESET PASSWORD
        </p>

        <h1 className="mt-4 text-4xl font-light">重新进入你的房间</h1>

        <p className="mt-4 text-sm leading-7 text-white/40">
          设一个新的密码。之后你就可以用它回到小时代。
        </p>

        {recoveryState === "checking" && (
          <p className="mt-8 text-sm text-white/45">正在确认这封重设邮件...</p>
        )}

        {recoveryState === "error" && (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-red-500/25 bg-red-500/[0.08] px-5 py-4 text-sm leading-7 text-red-100/80"
          >
            <p className="font-medium">无法确认这封重设邮件。</p>
            <p className="mt-2 text-red-100/60">
              链接可能已过期、已使用，或没有完成身份验证。密码没有被修改，请重新申请一封重设邮件。
            </p>
            <Link
              href="/forgot-password"
              className="mt-4 inline-block text-red-100 underline decoration-red-200/30 underline-offset-4"
            >
              重新申请重设邮件
            </Link>
          </div>
        )}

        {recoveryState === "ready" && (
          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm leading-7 text-white/55">
              这次会为{" "}
              <strong className="font-medium text-white/80">
                {recoveryUser?.email}
              </strong>{" "}
              重设密码。
            </div>
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder="新密码"
            />

            <PasswordInput
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="再输入一次新密码"
            />

            <button
              type="button"
              onClick={updatePassword}
              disabled={saving}
              className="w-full rounded-full bg-white px-6 py-4 text-sm font-bold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "正在收好..." : "重设密码"}
            </button>
          </div>
        )}

        {recoveryState === "success" && (
          <div
            role="status"
            className="mt-8 rounded-2xl border border-green-500/25 bg-green-500/[0.08] px-5 py-4 text-sm leading-7 text-green-100/80"
          >
            <p className="font-medium">密码已经重新设置好了。</p>
            <p className="mt-2 text-green-100/60">
              旧的本机登录状态已经清除，请使用这封邮件对应的邮箱和新密码重新登录。
            </p>
            <Link
              href="/"
              className="mt-4 inline-block text-green-100 underline decoration-green-200/30 underline-offset-4"
            >
              回到居民入口
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
