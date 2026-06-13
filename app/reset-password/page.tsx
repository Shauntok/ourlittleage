"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PasswordInput from "@/components/ui/PasswordInput";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function updatePassword() {
    if (password.length < 8) {
      alert("密码至少需要 8 个字符。");
      return;
    }

    if (password !== confirmPassword) {
      alert("两次输入的密码不一样。");
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({ password });

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("密码已经重新设置好了。");
    router.push("/home");
  }

  return (
    <main className="min-h-screen bg-black px-5 py-20 text-white">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />
      <div className="fixed left-1/2 top-1/3 -z-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />

      <section className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.035] p-7 backdrop-blur-2xl md:p-9">
        <p className="text-xs tracking-[0.35em] text-white/30">
          RESET PASSWORD
        </p>

        <h1 className="mt-4 text-4xl font-light">重新进入你的房间</h1>

        <p className="mt-4 text-sm leading-7 text-white/40">
          设一个新的密码。之后你就可以用它回到小时代。
        </p>

        <div className="mt-8 space-y-4">
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
      </section>
    </main>
  );
}