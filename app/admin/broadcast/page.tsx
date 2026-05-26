"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminBroadcastPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentRole, setCurrentRole] = useState("user");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [sendToSelfOnly, setSendToSelfOnly] = useState(true);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function checkPermission() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/";
        return;
      }

      setCurrentUser(user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setCurrentRole(profile?.role || "user");
      setLoading(false);
    }

    checkPermission();
  }, []);

  async function sendBroadcast() {
    if (!currentUser) return;

    if (!["owner", "admin"].includes(currentRole)) {
      alert("只有 owner / admin 可以发送全站信件。");
      return;
    }

    if (!title.trim() || !content.trim()) {
      alert("请填写标题和内容。");
      return;
    }

    const confirmed = confirm(
      sendToSelfOnly
        ? "确定只发送给自己测试吗？"
        : "确定要发送给所有 active 用户吗？这封信会进入每个人的小时代信箱。"
    );

    if (!confirmed) return;

    setSending(true);

    const { data: users, error: usersError } = sendToSelfOnly
      ? await supabase
          .from("profiles")
          .select("id")
          .eq("id", currentUser.id)
      : await supabase
          .from("profiles")
          .select("id")
          .eq("status", "active");

    if (usersError) {
      alert(usersError.message);
      setSending(false);
      return;
    }

    if (!users || users.length === 0) {
      alert(sendToSelfOnly ? "找不到你的用户资料。" : "没有找到 active 用户。");
      setSending(false);
      return;
    }

    const rows = users.map((user) => ({
      user_id: user.id,
      title: title.trim(),
      content: content.trim(),
      type: "system",
      is_read: false,
      is_important: isImportant,
      is_starred: false,
    }));

    const { error: insertError } = await supabase
      .from("notifications")
      .insert(rows);

    if (insertError) {
      alert(insertError.message);
      setSending(false);
      return;
    }

    await supabase.from("admin_logs").insert([
      {
        admin_id: currentUser.id,
        action: sendToSelfOnly
          ? "test_broadcast_notification"
          : "broadcast_notification",
        target_type: "notifications",
        target_id: null,
        details: `${sendToSelfOnly ? "测试发送" : "群发系统信件"}给 ${
          users.length
        } 位用户：${title.trim()}`,
      },
    ]);

    setSending(false);
    setTitle("");
    setContent("");
    setIsImportant(false);

    alert(
      sendToSelfOnly
        ? "测试信件已发送给你自己。"
        : `已成功发送给 ${users.length} 位用户。`
    );
  }

  if (loading) {
    return <div className="text-zinc-500">正在确认发送权限...</div>;
  }

  if (!["owner", "admin"].includes(currentRole)) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-red-200">
        你没有权限发送全站信件。
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-4xl font-bold">📬 全站信件</h1>

        <p className="mt-2 text-zinc-500">
          给居民发送一封来自小时代的系统信件。
        </p>
      </div>

      <div className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-950/50 p-7">
        <div className="space-y-2">
          <p className="text-sm text-zinc-400">信件标题</p>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：🌙 中秋快乐，今晚月色很好"
            className="w-full rounded-2xl border border-zinc-800 bg-black px-5 py-4 outline-none transition focus:border-white"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm text-zinc-400">信件内容</p>

          <textarea
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写给居民的话..."
            className="w-full resize-none rounded-2xl border border-zinc-800 bg-black px-5 py-4 leading-8 outline-none transition focus:border-white"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setSendToSelfOnly(!sendToSelfOnly)}
            className={
              sendToSelfOnly
                ? "rounded-full border border-yellow-400/40 bg-yellow-400/10 px-5 py-3 text-sm text-yellow-100"
                : "rounded-full border border-green-400/30 bg-green-500/10 px-5 py-3 text-sm text-green-200"
            }
          >
            {sendToSelfOnly
              ? "🧪 目前只发给自己测试"
              : "🌍 目前发送给所有 active 用户"}
          </button>

          <button
            type="button"
            onClick={() => setIsImportant(!isImportant)}
            className={
              isImportant
                ? "rounded-full border border-red-400/40 bg-red-500/10 px-5 py-3 text-sm text-red-200"
                : "rounded-full border border-zinc-700 bg-black px-5 py-3 text-sm text-zinc-400 hover:border-zinc-500"
            }
          >
            {isImportant ? "🚨 已标记重要" : "标记为重要信件"}
          </button>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-black/50 p-5">
          <p className="text-sm text-zinc-500">预览</p>

          <h2 className="mt-4 text-2xl font-bold">
            {title || "信件标题会显示在这里"}
          </h2>

          <p className="mt-4 whitespace-pre-wrap leading-8 text-zinc-300">
            {content || "信件内容会显示在这里。"}
          </p>
        </div>

        <button
          onClick={sendBroadcast}
          disabled={sending}
          className={
            sendToSelfOnly
              ? "rounded-full bg-yellow-100 px-8 py-4 text-sm font-bold text-black transition hover:bg-yellow-50 disabled:opacity-40"
              : "rounded-full bg-white px-8 py-4 text-sm font-bold text-black transition hover:bg-white/90 disabled:opacity-40"
          }
        >
          {sending
            ? "发送中..."
            : sendToSelfOnly
            ? "发送测试信给自己"
            : "发送给所有居民"}
        </button>
      </div>
    </div>
  );
}