"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminBroadcastPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentRole, setCurrentRole] = useState("user");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [isImportant, setIsImportant] = useState(false);

  const [sendToSelfOnly, setSendToSelfOnly] =
    useState(true);

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

      const role = profile?.role || "user";

      setCurrentRole(role);

      if (!["owner", "admin"].includes(role)) {
        window.location.href = "/";
        return;
      }

      setLoading(false);
    }

    checkPermission();
  }, []);

  async function sendBroadcast() {
    if (!currentUser) return;

    if (!title.trim()) {
      alert("请输入信件标题。");
      return;
    }

    if (!content.trim()) {
      alert("请输入信件内容。");
      return;
    }

    const confirmed = confirm(
      sendToSelfOnly
        ? "确定只发送给自己测试吗？"
        : "确定发送给所有 active 用户吗？"
    );

    if (!confirmed) return;

    setSending(true);

    const { data: users, error: usersError } =
      sendToSelfOnly
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
      alert("没有找到目标用户。");
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

    const { error: insertError } =
      await supabase
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
          ? "test_broadcast"
          : "broadcast",

        target_type: "notifications",

        target_id: null,

        details: `${
          sendToSelfOnly
            ? "测试发送"
            : "全站广播"
        }：${title.trim()} (${users.length} users)`,
      },
    ]);

    setSending(false);

    setTitle("");
    setContent("");

    setIsImportant(false);

    alert(
      sendToSelfOnly
        ? "测试信件已发送给自己。"
        : `已发送给 ${users.length} 位用户。`
    );
  }

  if (loading) {
    return (
      <div className="text-zinc-500">
        正在确认权限...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-4xl font-bold">
          📬 全站信件
        </h1>

        <p className="mt-2 text-zinc-500">
          给小时代居民发送系统广播。
        </p>
      </div>

      <div className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-950/50 p-7">
        <div className="space-y-2">
          <p className="text-sm text-zinc-400">
            信件标题
          </p>

          <input
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            placeholder="例如：🌙 今晚的月色很好"
            className="
              w-full rounded-2xl
              border border-zinc-800
              bg-black px-5 py-4
              outline-none transition
              focus:border-white
            "
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm text-zinc-400">
            信件内容
          </p>

          <textarea
            rows={8}
            value={content}
            onChange={(e) =>
              setContent(e.target.value)
            }
            placeholder="写给居民的话..."
            className="
              w-full resize-none rounded-2xl
              border border-zinc-800
              bg-black px-5 py-4
              leading-8 outline-none transition
              focus:border-white
            "
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              setSendToSelfOnly(
                !sendToSelfOnly
              )
            }
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
            onClick={() =>
              setIsImportant(!isImportant)
            }
            className={
              isImportant
                ? "rounded-full border border-red-400/40 bg-red-500/10 px-5 py-3 text-sm text-red-200"
                : "rounded-full border border-zinc-700 bg-black px-5 py-3 text-sm text-zinc-400 hover:border-zinc-500"
            }
          >
            {isImportant
              ? "🚨 已标记重要"
              : "标记为重要信件"}
          </button>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-black/50 p-5">
          <p className="text-sm text-zinc-500">
            预览
          </p>

          <h2 className="mt-4 text-2xl font-bold">
            {title ||
              "信件标题会显示在这里"}
          </h2>

          <p className="mt-4 whitespace-pre-wrap leading-8 text-zinc-300">
            {content ||
              "信件内容会显示在这里。"}
          </p>
        </div>

        <button
          onClick={sendBroadcast}
          disabled={sending}
          className="
            rounded-full bg-white
            px-8 py-4 text-sm font-bold text-black
            transition hover:bg-white/90
            disabled:opacity-40
          "
        >
          {sending
            ? "发送中..."
            : sendToSelfOnly
            ? "发送测试信"
            : "发送给所有居民"}
        </button>
      </div>
    </div>
  );
}