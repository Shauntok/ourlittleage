"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function NotificationsPage() {
  const [tab, setTab] = useState("unread");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = notifications.filter(
    (item) => !item.is_read && !item.deleted_at
  ).length;

  const readCount = notifications.filter(
    (item) => item.is_read && !item.deleted_at
  ).length;

  const importantCount = notifications.filter(
    (item) => item.is_important && !item.deleted_at
  ).length;

  const starredCount = notifications.filter(
    (item) => item.is_starred && !item.deleted_at
  ).length;

  const trashCount = notifications.filter(
    (item) => item.deleted_at
  ).length;

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      });

    setNotifications(data || []);
    setLoading(false);
  }

  async function markAsRead(id: string) {
    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              is_read: true,
            }
          : item
      )
    );
  }

  async function moveToTrash(id: string) {
    const deletedAt = new Date().toISOString();

    const { error } = await supabase
      .from("notifications")
      .update({
        deleted_at: deletedAt,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              deleted_at: deletedAt,
            }
          : item
      )
    );
  }

  async function restoreNotification(id: string) {
    const { error } = await supabase
      .from("notifications")
      .update({
        deleted_at: null,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              deleted_at: null,
            }
          : item
      )
    );
  }

  async function toggleStarred(
    id: string,
    currentValue: boolean
  ) {
    const { error } = await supabase
      .from("notifications")
      .update({
        is_starred: !currentValue,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              is_starred: !currentValue,
            }
          : item
      )
    );
  }

  const filteredNotifications = notifications.filter((item) => {
    if (tab === "trash") {
      return item.deleted_at;
    }

    if (tab === "unread") {
      return !item.is_read && !item.deleted_at;
    }

    if (tab === "read") {
      return item.is_read && !item.deleted_at;
    }

    if (tab === "important") {
      return item.is_important && !item.deleted_at;
    }

    if (tab === "starred") {
      return item.is_starred && !item.deleted_at;
    }

    return !item.deleted_at;
        });

        async function toggleImportant(
        id: string,
        currentValue: boolean
        ) {

        const { error } = await supabase
            .from("notifications")
            .update({
            is_important: !currentValue,
            })
            .eq("id", id);

        if (error) {
            alert(error.message);
            return;
        }

        setNotifications((current) =>
            current.map((item) =>
            item.id === id
                ? {
                    ...item,
                    is_important: !currentValue,
                }
                : item
            )
        );
        }

  return (
    <div className="mx-auto max-w-5xl px-6 space-y-6">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold">
          📬 邮箱
        </h1>

        <p className="text-zinc-500">
          来自小时代世界的通知。
        </p>

        <div className="flex flex-wrap gap-3 pt-3">
          {[
            {
              key: "unread",
              icon: "✉️",
              label: "未读",
              count: unreadCount,
            },
            {
              key: "read",
              icon: "📨",
              label: "已读",
              count: readCount,
            },
            {
              key: "important",
              icon: "🚨",
              label: "重要",
              count: importantCount,
            },
            {
              key: "starred",
              icon: "⭐",
              label: "星标",
              count: starredCount,
            },
            {
              key: "trash",
              icon: "🗑️",
              label: "垃圾桶",
              count: trashCount,
            },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={
                tab === item.key
                  ? "rounded-2xl border border-white bg-white text-black px-5 py-2 text-sm font-bold transition"
                  : "rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-2 text-sm text-zinc-400 hover:border-zinc-600 hover:text-white transition"
              }
            >
              <span className="mr-2">
                {item.icon}
              </span>

              <span>{item.label}</span>

              <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs">
                {item.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-zinc-500">
          正在读取邮件...
        </div>
      )}

      {!loading && filteredNotifications.length === 0 && (
        <div className="min-h-[360px] rounded-3xl border border-zinc-800 bg-zinc-950/50 p-10 flex items-center justify-center text-center text-zinc-500">
          这里暂时没有邮件。
        </div>
      )}

      <div className="space-y-4">
        {filteredNotifications.map((item) => (
          <div
            key={item.id}
            className={
              item.is_read
                ? "rounded-3xl border border-zinc-800 bg-zinc-950/40 p-6 opacity-70"
                : "rounded-3xl border border-yellow-500/20 bg-yellow-500/5 p-6"
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {!item.is_read && !item.deleted_at && (
                    <div className="h-2 w-2 rounded-full bg-yellow-400" />
                  )}

                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                    {item.type}
                  </p>
                </div>

                <h2 className="text-2xl font-bold">
                  {item.title}
                </h2>

                <p className="whitespace-pre-wrap text-zinc-300">
                  {item.content}
                </p>

                <p className="text-sm text-zinc-600">
                  {new Date(item.created_at).toLocaleString("zh-CN")}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {!item.deleted_at && (
                  <button
                    onClick={() =>
                      toggleStarred(
                        item.id,
                        item.is_starred
                      )
                    }
                    className={
                      item.is_starred
                        ? "rounded-2xl border border-yellow-500 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300 hover:border-yellow-300"
                        : "rounded-2xl border border-zinc-700 bg-black px-4 py-2 text-sm text-zinc-400 hover:border-zinc-500 hover:text-white"
                    }
                  >
                    {item.is_starred
                      ? "⭐ 已星标"
                      : "☆ 星标"}
                  </button>
                )}

                {!item.deleted_at && (
                <button
                    onClick={() =>
                    toggleImportant(
                        item.id,
                        item.is_important
                    )
                    }
                    className={
                    item.is_important
                        ? "rounded-2xl border border-red-500 bg-red-500/10 px-4 py-2 text-sm text-red-300 hover:border-red-300"
                        : "rounded-2xl border border-zinc-700 bg-black px-4 py-2 text-sm text-zinc-400 hover:border-zinc-500 hover:text-white"
                    }
                >
                    {item.is_important
                    ? "🚨 已重要"
                    : "🚨 重要"}
                </button>
                )}

                {!item.is_read && !item.deleted_at && (
                  <button
                    onClick={() =>
                      markAsRead(item.id)
                    }
                    className="rounded-2xl border border-zinc-700 bg-black px-4 py-2 text-sm hover:border-zinc-500"
                  >
                    已阅读
                  </button>
                )}

                {!item.deleted_at && (
                  <button
                    onClick={() =>
                      moveToTrash(item.id)
                    }
                    className="rounded-2xl border border-red-900 bg-red-950/40 px-4 py-2 text-sm text-red-300 hover:border-red-500"
                  >
                    删除
                  </button>
                )}

                {item.deleted_at && (
                  <button
                    onClick={() =>
                      restoreNotification(item.id)
                    }
                    className="rounded-2xl border border-green-900 bg-green-950/40 px-4 py-2 text-sm text-green-300 hover:border-green-500"
                  >
                    恢复
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}