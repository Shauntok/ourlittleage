"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import MouseGlow from "@/components/MouseGlow";

type TabKey = "unread" | "read" | "important" | "starred" | "trash";

type NotificationItem = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: string;
  is_read: boolean;
  is_important: boolean;
  is_starred: boolean;
  deleted_at: string | null;
  created_at: string;
};

function notifyNavbar() {
  window.dispatchEvent(new Event("notifications-updated"));

  setTimeout(() => {
    window.dispatchEvent(new Event("notifications-updated"));
  }, 250);
}

function getTypeLabel(type: string) {
  switch (type) {
    case "announcement":
      return "世界公告";
    case "badge":
    case "badge_award":
      return "徽章";
    case "system":
      return "系统来信";
    case "reply":
      return "留言回声";
    case "like":
      return "喜欢";
    case "follow":
      return "新的关注";
    case "room_visit":
      return "房间来访";
    default:
      return "小时代来信";
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case "announcement":
      return "📢";
    case "badge":
    case "badge_award":
      return "🎖️";
    case "system":
      return "🌙";
    case "reply":
      return "💬";
    case "like":
      return "🫧";
    case "follow":
      return "👣";
    case "room_visit":
      return "🏠";
    default:
      return "📬";
  }
}

export default function NotificationsPage() {
  const [tab, setTab] = useState<TabKey>("unread");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
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

  const trashCount = notifications.filter((item) => item.deleted_at).length;

  const tabs = [
    { key: "unread", icon: "✉️", label: "未读", count: unreadCount },
    { key: "read", icon: "📨", label: "已读", count: readCount },
    { key: "important", icon: "🚨", label: "重要", count: importantCount },
    { key: "starred", icon: "⭐", label: "星标", count: starredCount },
    { key: "trash", icon: "🗑️", label: "垃圾桶", count: trashCount },
  ] as const;

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

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setNotifications((data || []) as NotificationItem[]);
    setLoading(false);
  }

  async function getCurrentUserId() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user?.id;
  }

  async function markAsRead(id: string) {
    const userId = await getCurrentUserId();
    if (!userId) return;

    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, is_read: true } : item
      )
    );

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      alert(error.message);
      await fetchNotifications();
      return;
    }

    notifyNavbar();
    await fetchNotifications();
  }

  async function moveToTrash(id: string) {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const deletedAt = new Date().toISOString();

    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, deleted_at: deletedAt } : item
      )
    );

    const { error } = await supabase
      .from("notifications")
      .update({ deleted_at: deletedAt })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      alert(error.message);
      await fetchNotifications();
      return;
    }

    notifyNavbar();
    await fetchNotifications();
  }

  async function restoreNotification(id: string) {
    const userId = await getCurrentUserId();
    if (!userId) return;

    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, deleted_at: null } : item
      )
    );

    const { error } = await supabase
      .from("notifications")
      .update({ deleted_at: null })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      alert(error.message);
      await fetchNotifications();
      return;
    }

    notifyNavbar();
    await fetchNotifications();
  }

  async function toggleStarred(id: string, currentValue: boolean) {
    const userId = await getCurrentUserId();
    if (!userId) return;

    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, is_starred: !currentValue } : item
      )
    );

    const { error } = await supabase
      .from("notifications")
      .update({ is_starred: !currentValue })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      alert(error.message);
      await fetchNotifications();
      return;
    }

    notifyNavbar();
    await fetchNotifications();
  }

  async function toggleImportant(id: string, currentValue: boolean) {
    const userId = await getCurrentUserId();
    if (!userId) return;

    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, is_important: !currentValue } : item
      )
    );

    const { error } = await supabase
      .from("notifications")
      .update({ is_important: !currentValue })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      alert(error.message);
      await fetchNotifications();
      return;
    }

    notifyNavbar();
    await fetchNotifications();
  }

  const filteredNotifications = notifications.filter((item) => {
    if (tab === "trash") return item.deleted_at;
    if (tab === "unread") return !item.is_read && !item.deleted_at;
    if (tab === "read") return item.is_read && !item.deleted_at;
    if (tab === "important") return item.is_important && !item.deleted_at;
    if (tab === "starred") return item.is_starred && !item.deleted_at;

    return !item.deleted_at;
  });

  return (
    <main className="relative z-10 min-h-screen overflow-x-hidden bg-black px-5 pb-24 pt-16 text-white md:px-6 md:py-24">
      <MouseGlow />

      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />
      <div className="pointer-events-none fixed left-1/2 top-1/3 -z-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl md:h-[560px] md:w-[560px]" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <Link
          href="/home"
          className="mb-7 inline-flex text-sm text-white/35 transition hover:text-white/70 md:mb-10"
        >
          ← 回到首页
        </Link>

        <header className="mb-7 md:mb-10">
          <p className="text-xs tracking-[0.4em] text-white/25 md:tracking-[0.45em]">
            NIGHT MAILBOX
          </p>

          <h1 className="mt-2 text-5xl font-light tracking-tight md:mt-5 md:text-6xl">
            小时代信箱
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-7 text-white/35 md:mt-5 md:leading-8">
            这里放着来自这个世界的回声：系统提醒、房间消息、居民互动，还有一些不想错过的夜晚来信。
          </p>
        </header>

        <div className="mb-7 flex flex-wrap gap-2 md:mb-10 md:gap-3">
          {tabs.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={
                tab === item.key
                  ? "rounded-full border border-white bg-white px-4 py-2.5 text-sm font-semibold text-black transition md:px-5 md:py-3"
                  : "rounded-full border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm text-white/45 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white md:px-5 md:py-3"
              }
            >
              <span className="mr-1.5">{item.icon}</span>
              <span>{item.label}</span>
              <span className="ml-2 text-xs opacity-60">{item.count}</span>
            </button>
          ))}
        </div>

        {loading && (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-10 text-center text-white/35 backdrop-blur-2xl md:rounded-[2.5rem] md:p-14">
            正在翻开今晚的信箱...
          </div>
        )}

        {!loading && filteredNotifications.length === 0 && (
          <div className="flex min-h-[280px] items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-2xl md:min-h-[360px] md:rounded-[2.5rem] md:p-14">
            <div>
              <div className="text-5xl">📪</div>

              <h2 className="mt-6 text-2xl font-light text-white/70">
                这里暂时没有来信
              </h2>

              <p className="mt-4 max-w-md text-sm leading-7 text-white/35">
                世界很安静，但不是没有人在。也许下一封信，正在路上。
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4 md:space-y-5">
          {filteredNotifications.map((item) => {
            const isUnread = !item.is_read && !item.deleted_at;

            return (
              <article
                key={item.id}
                className={
                  isUnread
                    ? "rounded-[2rem] border border-yellow-400/20 bg-yellow-400/[0.055] p-5 shadow-[0_0_70px_rgba(250,204,21,0.05)] backdrop-blur-2xl md:rounded-[2.4rem] md:p-7"
                    : "rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 opacity-80 backdrop-blur-2xl md:rounded-[2.4rem] md:p-7"
                }
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                      {isUnread && (
                        <span className="h-2.5 w-2.5 rounded-full bg-yellow-300 shadow-[0_0_14px_rgba(250,204,21,0.9)]" />
                      )}

                      <span className="text-xl md:text-2xl">
                        {getTypeIcon(item.type)}
                      </span>

                      <p className="text-xs uppercase tracking-[0.25em] text-white/30 md:tracking-[0.28em]">
                        {getTypeLabel(item.type)}
                      </p>

                      {item.is_important && (
                        <span className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-xs text-red-200/80">
                          重要
                        </span>
                      )}

                      {item.is_starred && (
                        <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs text-yellow-100/80">
                          星标
                        </span>
                      )}
                    </div>

                    <h2 className="safe-text mt-4 text-xl font-light text-white/90 md:text-2xl">
                      {item.title}
                    </h2>

                    <p className="safe-pre mt-3 whitespace-pre-wrap text-sm leading-7 text-white/55 md:leading-8">
                      {item.content}
                    </p>

                    <p className="mt-4 text-xs text-white/25">
                      {new Date(item.created_at).toLocaleString("zh-CN")}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                    {!item.deleted_at && (
                      <button
                        onClick={() =>
                          toggleStarred(item.id, item.is_starred)
                        }
                        className={
                          item.is_starred
                            ? "rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-sm text-yellow-100/80 transition hover:border-yellow-300/60"
                            : "rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white/40 transition hover:border-white/20 hover:text-white"
                        }
                      >
                        {item.is_starred ? "⭐ 已星标" : "☆ 星标"}
                      </button>
                    )}

                    {!item.deleted_at && (
                      <button
                        onClick={() =>
                          toggleImportant(item.id, item.is_important)
                        }
                        className={
                          item.is_important
                            ? "rounded-full border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-200/80 transition hover:border-red-300/60"
                            : "rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white/40 transition hover:border-white/20 hover:text-white"
                        }
                      >
                        🚨 重要
                      </button>
                    )}

                    {!item.is_read && !item.deleted_at && (
                      <button
                        onClick={() => markAsRead(item.id)}
                        className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white/45 transition hover:border-white/20 hover:text-white"
                      >
                        已阅读
                      </button>
                    )}

                    {!item.deleted_at && (
                      <button
                        onClick={() => moveToTrash(item.id)}
                        className="rounded-full border border-red-500/20 bg-red-500/[0.06] px-4 py-2 text-sm text-red-200/70 transition hover:bg-red-500/[0.12] hover:text-red-100"
                      >
                        删除
                      </button>
                    )}

                    {item.deleted_at && (
                      <button
                        onClick={() => restoreNotification(item.id)}
                        className="rounded-full border border-green-500/20 bg-green-500/[0.06] px-4 py-2 text-sm text-green-200/70 transition hover:bg-green-500/[0.12] hover:text-green-100"
                      >
                        恢复
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}