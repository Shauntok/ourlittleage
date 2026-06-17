"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type GrowthLog = {
  id: string;
  user_id: string;
  actor_id?: string | null;
  light_change: number;
  trust_change: number;
  reason: string;
  created_at: string;
  receiver?: any;
  actor?: any;
};

function getReasonLabel(reason: string) {
  switch (reason) {
    case "post_liked":
      return "内容被喜欢";
    case "comment_liked":
      return "留言被喜欢";
    case "write_comment":
      return "发表评论";
    case "write_diary":
      return "写日记";
    case "publish_article":
      return "发布文章";
    default:
      return reason || "其他";
  }
}

export default function AdminGrowthPage() {
  const [logs, setLogs] = useState<GrowthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchGrowthLogs();
  }, []);

  function showToast(text: string) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 3500);
  }

  async function fetchGrowthLogs() {
    setLoading(true);

    const { data: logsData, error } = await supabase
      .from("growth_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) {
      showToast(error.message);
      setLoading(false);
      return;
    }

    const userIds = Array.from(
      new Set(
        (logsData || [])
          .flatMap((item: any) => [item.user_id, item.actor_id])
          .filter(Boolean)
      )
    );

    let profileMap = new Map<string, any>();

    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      if (profilesError) {
        showToast(profilesError.message);
        setLoading(false);
        return;
      }

      profileMap = new Map(
        (profilesData || []).map((profile: any) => [profile.id, profile])
      );
    }

    const logsWithProfiles = (logsData || []).map((item: any) => ({
      ...item,
      receiver: profileMap.get(item.user_id) || null,
      actor: item.actor_id ? profileMap.get(item.actor_id) || null : null,
    }));

    setLogs(logsWithProfiles);
    setLoading(false);
  }

  return (
    <div className="relative space-y-8 overflow-hidden">
      {message && (
        <div className="fixed left-1/2 top-6 z-[999] -translate-x-1/2 rounded-2xl border border-white/10 bg-zinc-900/95 px-5 py-3 text-sm text-white shadow-2xl backdrop-blur-xl">
          {message}
        </div>
      )}

      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <h1 className="text-4xl font-bold">成长记录 ✨</h1>

          <p className="mt-2 text-zinc-500">
            记录居民「留下的光」与「社区信任」的变化来源。
          </p>
        </div>

        <button
          type="button"
          onClick={fetchGrowthLogs}
          className="rounded-full border border-zinc-700 bg-zinc-950 px-5 py-3 text-sm text-zinc-300 transition hover:border-white hover:text-white"
        >
          刷新记录
        </button>
      </div>

      {loading && (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
          正在读取成长记录...
        </div>
      )}

      {!loading && logs.length === 0 && (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
          暂时没有成长记录。
        </div>
      )}

      <div className="space-y-4">
        {logs.map((item) => {
          const receiver = item.receiver;
          const actor = item.actor;

          return (
            <article
              key={item.id}
              className="min-w-0 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/50 p-5"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-zinc-800 bg-zinc-900">
                    {receiver?.avatar_url ? (
                      <img
                        src={receiver.avatar_url}
                        alt={receiver.username || "居民"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg">
                        🌙
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="safe-text font-semibold text-white">
                      {receiver?.username || "未知居民"}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      {getReasonLabel(item.reason)} ·{" "}
                      {new Date(item.created_at).toLocaleString("zh-CN")}
                    </p>

                    {actor && (
                      <p className="mt-1 text-xs text-zinc-600">
                        触发者：{actor.username || "未知居民"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {Number(item.light_change || 0) !== 0 && (
                    <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
                      留下的光{" "}
                      {Number(item.light_change) > 0 ? "+" : ""}
                      {Number(item.light_change).toFixed(3)}
                    </span>
                  )}

                  {Number(item.trust_change || 0) !== 0 && (
                    <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-4 py-2 text-sm text-blue-300">
                      社区信任{" "}
                      {Number(item.trust_change) > 0 ? "+" : ""}
                      {Number(item.trust_change).toFixed(3)}
                    </span>
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