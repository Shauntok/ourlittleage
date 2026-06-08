"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  async function fetchAnnouncements() {
    setLoading(true);

    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setAnnouncements(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  async function writeLog(
    action: string,
    targetId: string | number,
    details: string
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("admin_logs").insert([
      {
        admin_id: user.id,
        action,
        target_type: "announcement",
        target_id: String(targetId),
        details,
      },
    ]);
  }

  async function createAnnouncement() {
    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (!cleanTitle) {
      alert("请输入公告标题。");
      return;
    }

    if (!cleanContent) {
      alert("请输入公告内容。");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("announcements")
      .insert([
        {
          title: cleanTitle,
          content: cleanContent,
          is_active: true,
          created_by: user?.id || null,
        },
      ])
      .select()
      .single();

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    // ===== 发给全站居民 =====

    const { data: residents } = await supabase
      .from("profiles")
      .select("id");

    if (residents?.length) {
      const notifications = residents.map(
        (resident) => ({
          user_id: resident.id,
          title: `📢 ${cleanTitle}`,
          content: cleanContent,
          type: "announcement",
        })
      );

      await supabase
        .from("notifications")
        .insert(notifications);
    }

    await writeLog(
      "create_announcement",
      data.id,
      `发布公告：${cleanTitle}`
    );

    setTitle("");
    setContent("");

    fetchAnnouncements();
    alert("公告已发布 📢");
  }

  async function toggleAnnouncement(item: any) {
    const nextActive = !item.is_active;

    const { error } = await supabase
      .from("announcements")
      .update({
        is_active: nextActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      alert(error.message);
      return;
    }

    await writeLog(
      "toggle_announcement",
      item.id,
      `${nextActive ? "启用" : "关闭"}公告：${item.title}`
    );

    fetchAnnouncements();
  }

  async function deleteAnnouncement(item: any) {
    const confirmed = confirm(
      "确定删除这个公告吗？这个动作不能恢复。"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert(error.message);
      return;
    }

    await writeLog(
      "delete_announcement",
      item.id,
      `删除公告：${item.title}`
    );

    fetchAnnouncements();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">
          世界公告 📢
        </h1>

        <p className="mt-2 text-zinc-500">
          发布给所有居民看到的重要通知。
        </p>
      </div>

      <section className="space-y-5 rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
        <h2 className="text-2xl font-bold">
          发布新公告
        </h2>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="公告标题，例如：测试版上线通知"
          className="w-full rounded-2xl border border-zinc-700 bg-black p-4 outline-none transition focus:border-white"
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          placeholder="公告内容..."
          className="safe-pre w-full rounded-2xl border border-zinc-700 bg-black p-4 leading-8 outline-none transition focus:border-white"
        />

        <button
          onClick={createAnnouncement}
          disabled={saving}
          className="rounded-2xl bg-white px-6 py-3 font-bold text-black transition hover:opacity-80 disabled:opacity-40"
        >
          {saving ? "发布中..." : "发布公告"}
        </button>
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">
            公告列表
          </h2>

          <button
            onClick={fetchAnnouncements}
            className="rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-300 transition hover:border-white hover:text-white"
          >
            刷新
          </button>
        </div>

        {loading && (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
            正在读取公告...
          </div>
        )}

        {!loading && announcements.length === 0 && (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
            目前还没有公告。
          </div>
        )}

        {announcements.map((item) => (
          <div
            key={item.id}
            className="min-w-0 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6"
          >
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-3">
                  <span
                    className={
                      item.is_active
                        ? "rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs text-green-300"
                        : "rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-400"
                    }
                  >
                    {item.is_active ? "显示中" : "已关闭"}
                  </span>

                  <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-500">
                    ID {item.id}
                  </span>
                </div>

                <h3 className="safe-text mt-5 text-2xl font-bold text-white">
                  {item.title}
                </h3>

                <p className="safe-pre mt-4 text-sm leading-8 text-zinc-400">
                  {item.content}
                </p>

                <p className="mt-4 text-xs text-zinc-600">
                  发布：{" "}
                  {item.created_at
                    ? new Date(item.created_at).toLocaleString("zh-CN")
                    : "未知"}
                  {item.updated_at &&
                    ` · 更新：${new Date(
                      item.updated_at
                    ).toLocaleString("zh-CN")}`}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-3 md:flex-col">
                <button
                  onClick={() => toggleAnnouncement(item)}
                  className={
                    item.is_active
                      ? "rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300 transition hover:bg-yellow-500/20"
                      : "rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-300 transition hover:bg-green-500/20"
                  }
                >
                  {item.is_active ? "关闭" : "启用"}
                </button>

                <button
                  onClick={() => deleteAnnouncement(item)}
                  className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/20"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}