"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminAnnouncementsPage() {

const router = useRouter();

  const [title, setTitle] =
    useState("");

  const [content, setContent] =
    useState("");

  const [loading, setLoading] =
    useState(false);

    useEffect(() => {
  checkPermission();
}, []);

async function checkPermission() {

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    router.push("/");
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    router.push("/");
  }
}

  async function sendAnnouncement() {

    if (!title || !content) {
      alert("请填写完整公告");
      return;
    }

    setLoading(true);

    // ===== 获取全部用户 =====
    const { data: users } = await supabase
      .from("profiles")
      .select("id");

    if (!users) {
      alert("读取用户失败");
      setLoading(false);
      return;
    }

    // ===== 批量生成通知 =====
    const notifications = users.map(
      (user) => ({
        user_id: user.id,
        title,
        content,
        type: "announcement",
      })
    );

    const { error } = await supabase
      .from("notifications")
      .insert(notifications);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setTitle("");
    setContent("");

    alert("公告已发送 📢");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">

      <div className="space-y-2">
        <h1 className="text-4xl font-bold">
          📢 世界公告
        </h1>

        <p className="text-zinc-500">
          向所有居民发送系统广播。
        </p>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6 space-y-5">

        <input
          type="text"
          placeholder="公告标题"
          value={title}
          onChange={(e) =>
            setTitle(e.target.value)
          }
          className="w-full rounded-2xl border border-zinc-800 bg-black px-5 py-4 outline-none focus:border-zinc-500"
        />

        <textarea
          placeholder="公告内容..."
          value={content}
          onChange={(e) =>
            setContent(e.target.value)
          }
          rows={8}
          className="w-full rounded-2xl border border-zinc-800 bg-black px-5 py-4 outline-none focus:border-zinc-500"
        />

        <button
          onClick={sendAnnouncement}
          disabled={loading}
          className="rounded-2xl bg-white px-6 py-3 font-bold text-black disabled:opacity-50"
        >
          {loading
            ? "发送中..."
            : "发送公告"}
        </button>
      </div>
    </div>
  );
}