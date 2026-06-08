"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import MouseGlow from "@/components/MouseGlow";

type TabKey =
  | "unread"
  | "read"
  | "important"
  | "starred"
  | "trash";

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

// ===== 通知 Navbar：让顶部信箱红点即时刷新 =====
function notifyNavbar() {
  window.dispatchEvent(new Event("notifications-updated"));

  setTimeout(() => {
    window.dispatchEvent(new Event("notifications-updated"));
  }, 250);
}

// ===== 通知类型文字 =====
function getTypeLabel(type: string) {
  switch (type) {
    case "announcement":
      return "世界公告";
    case "badge":
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
    case "badge_award":
      return "徽章";
    default:
      return "小时代来信";
  }
}

// ===== 通知类型图标 =====
function getTypeIcon(type: string) {
  switch (type) {
    case "announcement":
      return "📢";
    case "badge":
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
    case "badge_award":
      return "🎖️";
    default:
      return "📬";
  }
}

export default function NotificationsPage() {
  const [tab, setTab] =
    useState<TabKey>("unread");

  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  // ===== 各分类数量 =====
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

  // ===== 重新读取通知列表 =====
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
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setNotifications(
      (data || []) as NotificationItem[]
    );

    setLoading(false);
  }

    async function getCurrentUserId() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user?.id;
  }

  // ===== 标记已读 =====
  async function markAsRead(id: string) {
    const userId = await getCurrentUserId();

    if (!userId) return;

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

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
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

  // ===== 移到垃圾桶：软删除，不是真的删除 =====
  async function moveToTrash(id: string) {
    const userId = await getCurrentUserId();

    if (!userId) return;

    const deletedAt = new Date().toISOString();

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

    const { error } = await supabase
      .from("notifications")
      .update({
        deleted_at: deletedAt,
      })
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

  // ===== 从垃圾桶恢复 =====
  async function restoreNotification(id: string) {
    const userId = await getCurrentUserId();

    if (!userId) return;

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

    const { error } = await supabase
      .from("notifications")
      .update({
        deleted_at: null,
      })
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

  // ===== 星标 / 取消星标 =====
  // ===== 重要 / 取消重要 =====
  async function toggleStarred(
    id: string,
    currentValue: boolean
  ) {
    const userId = await getCurrentUserId();

    if (!userId) return;

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

    const { error } = await supabase
      .from("notifications")
      .update({
        is_starred: !currentValue,
      })
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

  async function toggleImportant(
    id: string,
    currentValue: boolean
  ) {
    const userId = await getCurrentUserId();

    if (!userId) return;

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

    const { error } = await supabase
      .from("notifications")
      .update({
        is_important: !currentValue,
      })
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

  // ===== 根据当前 tab 过滤通知 =====
  const filteredNotifications =
    notifications.filter((item) => {
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

  const tabs = [
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
  ] as const;

  return (
    <main className="relative z-10 min-h-screen overflow-x-hidden bg-black px-6 py-20 text-white">
      {/* 背景 */}
      <MouseGlow />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />

      <div className="relative z-10 mx-auto max-w-6xl space-y-10">
        <Link
          href="/home"
          className="inline-flex text-sm text-white/35 transition hover:text-white/70"
        >
          ← 回到首页
        </Link>

        {/* 标题 */}
        <header className="space-y-5">
          <p className="text-xs tracking-[0.45em] text-white/25">
            NIGHT MAILBOX
          </p>

          <h1 className="text-5xl font-light tracking-tight md:text-6xl">
            小时代信箱
          </h1>

          <p className="max-w-xl text-sm leading-8 text-white/40">
            这里会放着来自这个世界的回声：系统提醒、房间消息、居民互动，还有一些不想错过的夜晚来信。
          </p>
        </header>

        {/* 分类 Tabs */}
        <div className="flex flex-wrap gap-3">
          {tabs.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={
                tab === item.key
                  ? "rounded-full border border-white bg-white px-5 py-3 text-sm font-semibold text-black transition"
                  : "rounded-full border border-white/10 bg-white/[0.035] px-5 py-3 text-sm text-white/45 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
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

        {/* Loading */}
        {loading && (
          <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-14 text-center text-white/35">
            正在翻开今晚的信箱...
          </div>
        )}

        {/* Empty */}
        {!loading &&
          filteredNotifications.length === 0 && (
            <div className="flex min-h-[360px] items-center justify-center rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-14 text-center backdrop-blur-2xl">
              <div>
                <div className="text-5xl">
                  📪
                </div>

                <h2 className="mt-6 text-2xl font-light text-white/70">
                  这里暂时没有来信
                </h2>

                <p className="mt-4 max-w-md text-sm leading-7 text-white/35">
                  世界很安静，但不是没有人在。也许下一封信，正在路上。
                </p>
              </div>
            </div>
          )}

        {/* 通知列表 */}
        <div className="space-y-5">
          {filteredNotifications.map((item) => {
            const isUnread =
              !item.is_read && !item.deleted_at;

            return (
              <article
                key={item.id}
                className={
                  isUnread
                    ? "rounded-[2.4rem] border border-yellow-400/20 bg-yellow-400/[0.055] p-7 shadow-[0_0_70px_rgba(250,204,21,0.05)] backdrop-blur-2xl"
                    : "rounded-[2.4rem] border border-white/10 bg-white/[0.03] p-7 opacity-80 backdrop-blur-2xl"
                }
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      {isUnread && (
                        <span className="h-2.5 w-2.5 rounded-full bg-yellow-300 shadow-[0_0_14px_rgba(250,204,21,0.9)]" />
                      )}

                      <span className="text-2xl">
                        {getTypeIcon(item.type)}
                      </span>

                      <p className="text-xs uppercase tracking-[0.28em] text-white/30">
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

                    <h2 className="text-2xl font-light text-white/90">
                      {item.title}
                    </h2>

                    <p className="whitespace-pre-wrap text-sm leading-8 text-white/55">
                      {item.content}
                    </p>

                    <p className="text-xs text-white/25">
                      {new Date(
                        item.created_at
                      ).toLocaleString("zh-CN")}
                    </p>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
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
                            ? "rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-sm text-yellow-100/80 transition hover:border-yellow-300/60"
                            : "rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white/40 transition hover:border-white/20 hover:text-white"
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
                            ? "rounded-full border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-200/80 transition hover:border-red-300/60"
                            : "rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white/40 transition hover:border-white/20 hover:text-white"
                        }
                      >
                        🚨 重要
                      </button>
                    )}

                    {!item.is_read && !item.deleted_at && (
                      <button
                        onClick={() =>
                          markAsRead(item.id)
                        }
                        className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white/45 transition hover:border-white/20 hover:text-white"
                      >
                        已阅读
                      </button>
                    )}

                    {!item.deleted_at && (
                      <button
                        onClick={() =>
                          moveToTrash(item.id)
                        }
                        className="rounded-full border border-red-500/20 bg-red-500/[0.06] px-4 py-2 text-sm text-red-200/70 transition hover:bg-red-500/[0.12] hover:text-red-100"
                      >
                        删除
                      </button>
                    )}

                    {item.deleted_at && (
                      <button
                        onClick={() =>
                          restoreNotification(item.id)
                        }
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