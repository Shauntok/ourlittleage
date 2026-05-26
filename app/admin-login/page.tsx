"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {

  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function login() {

    setLoading(true);

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    // ===== 检查 role =====
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("登录失败");
      return;
    }

    const { data: profile } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    const allowedRoles = [
      "owner",
      "admin",
      "moderator",
    ];

    if (
      !profile ||
      !allowedRoles.includes(
        profile.role
      )
    ) {
      alert("你没有后台权限");

      await supabase.auth.signOut();

      router.push("/home");
      return;
    }

    router.push("/admin/homepage");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black px-6">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 space-y-6">

        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold">
            后台登录 🔐
          </h1>

          <p className="text-zinc-500">
            仅限管理员进入。
          </p>
        </div>

        <div className="space-y-4">

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            className="w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none focus:border-white"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            className="w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none focus:border-white"
          />

          <button
            onClick={login}
            disabled={loading}
            className="w-full rounded-2xl bg-white px-6 py-4 font-bold text-black hover:opacity-80 transition"
          >
            {loading
              ? "登录中..."
              : "进入后台"}
          </button>

        </div>
      </div>
    </main>
  );
}