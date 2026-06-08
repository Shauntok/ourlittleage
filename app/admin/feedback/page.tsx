"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type FeedbackStatus =
  | "all"
  | "pending"
  | "in_progress"
  | "resolved"
  | "closed";

function getTypeLabel(type: string) {
  switch (type) {
    case "bug":
      return "🐛 Bug反馈";
    case "suggestion":
      return "💡 功能建议";
    case "report":
      return "🚨 投诉举报";
    case "experience":
      return "🌙 使用体验";
    default:
      return "📦 其他";
  }
}

function getStatusStyle(status: string) {
  switch (status) {
    case "pending":
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
    case "in_progress":
      return "border-blue-500/30 bg-blue-500/10 text-blue-300";
    case "resolved":
      return "border-green-500/30 bg-green-500/10 text-green-300";
    case "closed":
      return "border-zinc-700 bg-zinc-900 text-zinc-400";
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-400";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "pending":
      return "待处理";
    case "in_progress":
      return "处理中";
    case "resolved":
      return "已完成";
    case "closed":
      return "已关闭";
    default:
      return status;
  }
}

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] =
    useState<FeedbackStatus>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  async function fetchFeedbacks() {
    setLoading(true);

    const { data, error } = await supabase
      .from("feedbacks")
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          avatar_url
        ),
        handler:handled_by (
          id,
          username
        )
      `)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setFeedbacks(data || []);
    setLoading(false);
  }

  async function writeLog(
    action: string,
    feedbackId: string,
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
        target_type: "feedback",
        target_id: feedbackId,
        details,
      },
    ]);
  }

  async function updateStatus(
    feedbackId: string,
    status: string
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("feedbacks")
      .update({
        status,
        handled_by: user.id,
        handled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", feedbackId);

    if (error) {
      alert(error.message);
      return;
    }

    await writeLog(
      "update_feedback_status",
      feedbackId,
      `反馈状态修改为 ${status}`
    );

    await fetchFeedbacks();
  }

  const filteredFeedbacks = feedbacks.filter((item) => {
    const keyword = search.toLowerCase().trim();

    const matchStatus =
      statusFilter === "all" ||
      item.status === statusFilter;

    const matchSearch =
      !keyword ||
      item.title?.toLowerCase().includes(keyword) ||
      item.content?.toLowerCase().includes(keyword) ||
      item.type?.toLowerCase().includes(keyword) ||
      item.profiles?.username?.toLowerCase().includes(keyword) ||
      item.id?.toLowerCase().includes(keyword);

    return matchStatus && matchSearch;
  });

  const tabs = [
    {
      key: "all",
      label: "全部",
      count: feedbacks.length,
    },
    {
      key: "pending",
      label: "待处理",
      count: feedbacks.filter(
        (item) => item.status === "pending"
      ).length,
    },
    {
      key: "in_progress",
      label: "处理中",
      count: feedbacks.filter(
        (item) => item.status === "in_progress"
      ).length,
    },
    {
      key: "resolved",
      label: "已完成",
      count: feedbacks.filter(
        (item) => item.status === "resolved"
      ).length,
    },
    {
      key: "closed",
      label: "已关闭",
      count: feedbacks.filter(
        (item) => item.status === "closed"
      ).length,
    },
  ] as const;

  return (
    <div className="space-y-8 overflow-hidden">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <h1 className="text-4xl font-bold">
            反馈中心 💌
          </h1>

          <p className="mt-2 text-zinc-500">
            查看、追踪和处理居民提交的反馈。
          </p>
        </div>

        <button
          onClick={fetchFeedbacks}
          className="rounded-full border border-zinc-700 bg-zinc-950 px-5 py-3 text-sm text-zinc-300 transition hover:border-white hover:text-white"
        >
          刷新
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜索标题、内容、居民、类型或 ID..."
        className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4 outline-none transition focus:border-white"
      />

      <div className="flex flex-wrap gap-3">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() =>
              setStatusFilter(item.key as FeedbackStatus)
            }
            className={
              statusFilter === item.key
                ? "rounded-full border border-white bg-white px-5 py-3 text-sm font-semibold text-black transition"
                : "rounded-full border border-zinc-800 bg-zinc-950 px-5 py-3 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-white"
            }
          >
            {item.label}

            <span className="ml-2 text-xs opacity-60">
              {item.count}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-full border border-zinc-800 bg-zinc-950 px-5 py-3 text-sm text-zinc-400">
        显示 {filteredFeedbacks.length} / {feedbacks.length} 条反馈
      </div>

      {loading && (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
          正在读取反馈...
        </div>
      )}

      {!loading && filteredFeedbacks.length === 0 && (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
          暂时没有符合条件的反馈。
        </div>
      )}

      <div className="space-y-4">
        {filteredFeedbacks.map((item) => {
          const profile = Array.isArray(item.profiles)
            ? item.profiles[0]
            : item.profiles;

          const handler = Array.isArray(item.handler)
            ? item.handler[0]
            : item.handler;

          return (
            <article
              key={item.id}
              className="min-w-0 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6"
            >
              <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                      {getTypeLabel(item.type)}
                    </span>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${getStatusStyle(
                        item.status
                      )}`}
                    >
                      {getStatusLabel(item.status)}
                    </span>

                    <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-500">
                      ID {item.id}
                    </span>
                  </div>

                  <h2 className="safe-text text-2xl font-bold text-white">
                    {item.title}
                  </h2>

                  <p className="safe-pre rounded-2xl border border-zinc-800 bg-black/30 p-4 text-sm leading-8 text-zinc-300">
                    {item.content}
                  </p>

                  <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                    <span>
                      提交者：
                      {profile?.username || "未知居民"}
                    </span>

                    {item.user_id && (
                      <Link
                        href={`/admin/users/${item.user_id}`}
                        className="text-zinc-400 transition hover:text-white"
                      >
                        查看居民 →
                      </Link>
                    )}

                    <span>
                      提交时间：
                      {new Date(item.created_at).toLocaleString("zh-CN")}
                    </span>

                    {handler?.username && (
                      <span>
                        处理人：{handler.username}
                      </span>
                    )}

                    {item.handled_at && (
                      <span>
                        处理时间：
                        {new Date(item.handled_at).toLocaleString("zh-CN")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
                  <button
                    onClick={() =>
                      updateStatus(item.id, "in_progress")
                    }
                    className="rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300 transition hover:bg-blue-500/20"
                  >
                    处理中
                  </button>

                  <button
                    onClick={() =>
                      updateStatus(item.id, "resolved")
                    }
                    className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-300 transition hover:bg-green-500/20"
                  >
                    已完成
                  </button>

                  <button
                    onClick={() =>
                      updateStatus(item.id, "closed")
                    }
                    className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
                  >
                    关闭
                  </button>

                  {item.status !== "pending" && (
                    <button
                      onClick={() =>
                        updateStatus(item.id, "pending")
                      }
                      className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300 transition hover:bg-yellow-500/20"
                    >
                      退回待处理
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}