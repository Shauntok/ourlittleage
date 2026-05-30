"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function signIn() {
    if (!email.trim() || !password.trim()) {
      alert("请填写邮箱和密码。");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/home";
  }

  async function signUp() {
    if (!username.trim()) {
      alert("请填写居民名字。");
      return;
    }

    if (!email.trim() || !password.trim()) {
      alert("请填写邮箱和密码。");
      return;
    }

    const finalUsername = username.trim();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    const user = data.user;

    if (user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([
          {
            id: user.id,
            username: finalUsername,
            role: "user",
            theme: "midnight",
          },
        ]);

      if (profileError) {
        alert(profileError.message);
        return;
      }

      await supabase.from("notifications").insert([
        {
          user_id: user.id,
          title: "欢迎来到小时代 🌙",
          content:
            "这里是一个可以慢慢生活、写故事、留下回忆的小世界。\n\n希望你能在这里找到属于自己的角落。",
          type: "system",
        },
      ]);
    }

    alert("注册成功，请登录");
  }

  return (
    <main className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="mx-auto max-w-sm space-y-6">
        <h1 className="text-4xl font-bold">
          居民登录
        </h1>

        <input
          type="text"
          placeholder="居民名字"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 outline-none focus:border-white"
        />

        <input
          type="email"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 outline-none focus:border-white"
        />

        <div className="relative flex w-full items-center">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 pr-12 outline-none focus:border-white"
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
            className="rounded-xl bg-white px-6 py-3 font-bold text-black"
          >
            登录
          </button>

          <button
            onClick={signUp}
            className="rounded-xl border border-zinc-600 px-6 py-3"
          >
            注册
          </button>
        </div>
      </div>
    </main>
  );
}