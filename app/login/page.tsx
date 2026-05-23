"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("登录成功");
    window.location.reload();
  }

  async function signUp() {
    const {
      data,
      error,
    } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    // ===== 创建用户 Profile =====
    const user = data.user;

    if (user) {
      const username =
        email.split("@")[0];

      await supabase
        .from("profiles")
        .insert([
          {
            id: user.id,
            username,
            role: "user",
          },
        ]);
    }

    alert("注册成功，请登录");
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-20">
      <div className="max-w-sm mx-auto space-y-6">
  <h1 className="text-4xl font-bold">
    居民登录
  </h1>

  <input
    type="email"
    placeholder="邮箱"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className="w-full p-4 bg-zinc-900 border border-zinc-700 rounded-xl outline-none focus:border-white"
  />

  <div className="relative w-full flex items-center">
    <input
      type={showPassword ? "text" : "password"}
      placeholder="密码"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      className="w-full p-4 pr-12 bg-zinc-900 border border-zinc-700 rounded-xl outline-none focus:border-white"
    />

    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
    >
      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  </div>

  <div className="flex gap-4">
    <button
      onClick={signIn}
      className="bg-white text-black px-6 py-3 font-bold rounded-xl"
    >
      登录
    </button>

    <button
      onClick={signUp}
      className="border border-zinc-600 px-6 py-3 rounded-xl"
    >
      注册
    </button>
  </div>
</div>
    </main>
  );
}