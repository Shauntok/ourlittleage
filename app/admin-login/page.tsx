"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function showToast(text: string) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 3500);
  }

  async function login() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password.trim()) {
      showToast("请输入 Email 和 Password。");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    setLoading(false);

    if (error) {
      showToast(error.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      showToast("登录失败，请重新尝试。");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      showToast(profileError.message);
      return;
    }

    const allowedRoles = ["owner", "admin", "moderator"];

    if (!profile || !allowedRoles.includes(profile.role)) {
      showToast("你没有后台权限。");

      await supabase.auth.signOut();

      window.setTimeout(() => {
        router.push("/home");
      }, 900);

      return;
    }

    router.push("/admin/homepage");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      {message && (
        <div className="fixed left-1/2 top-6 z-[999] -translate-x-1/2 rounded-2xl border border-white/10 bg-zinc-900/95 px-5 py-3 text-center text-sm text-white shadow-2xl backdrop-blur-xl">
          {message}
        </div>
      )}

      <div className="w-full max-w-md space-y-6 rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold">后台登录 🔐</h1>

          <p className="text-zinc-500">仅限管理员进入。</p>
        </div>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none transition focus:border-white"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                login();
              }
            }}
            className="w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none transition focus:border-white"
          />

          <button
            type="button"
            onClick={login}
            disabled={loading}
            className="w-full rounded-2xl bg-white px-6 py-4 font-bold text-black transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "登录中..." : "进入后台"}
          </button>
        </div>
      </div>
    </main>
  );
}