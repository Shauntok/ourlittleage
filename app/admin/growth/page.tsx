"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AdminGrowthPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGrowthLogs();
  }, []);

  async function fetchGrowthLogs() {
    setLoading(true);

    const { data, error } = await supabase
      .from("growth_logs")
      .select(`
        id,
        user_id,
        light_change,
        trust_change,
        reason,
        created_at,
        profiles (
          username,
          avatar_url
        )
      `)
      .order("created_at", {
        ascending: false,
      })
      .limit(100);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setLogs(data || []);
    setLoading(false);
  }

  function getReasonLabel(reason: string) {
    switch (reason) {
      case "write_diary":
        return "写日记";
      case "publish_article":
        return "发布文章";
      case "write_comment":
        return "发表评论";
      case "report_success":
        return "有效举报";
      case "report_rejected":
        return "举报未成立";
      default:
        return reason || "未知原因";
    }
  }

  function formatChange(value: any) {
    const num = Number(value || 0);

    if (num > 0) return `+${num.toFixed(3)}`;
    if (num < 0) return num.toFixed(3);

    return "0.000";
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
        正在读取成长记录...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <h1 className="text-4xl font-bold">
            成长记录 ✨
          </h1>

          <p className="mt-2 text-zinc-500">
            记录居民「留下的光」与「社区信任」的变化来源。
          </p>
        </div>

        <button
          onClick={fetchGrowthLogs}
          className="rounded-full border border-zinc-700 bg-zinc-950 px-5 py-3 text-sm text-zinc-300 transition hover:border-white hover:text-white"
        >
          刷新记录
        </button>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
        <div className="space-y-3">
          {logs.length === 0 && (
            <p className="text-sm text-zinc-600">
              暂无成长记录。
            </p>
          )}

          {logs.map((log) => {
            const profile = Array.isArray(log.profiles)
              ? log.profiles[0]
              : log.profiles;

            return (
              <div
                key={log.id}
                className="min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-black/30 p-4"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-zinc-800 bg-zinc-900">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.username || "居民"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
                          🌙
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <Link
                        href={`/admin/users/${log.user_id}`}
                        className="safe-text font-semibold text-zinc-100 transition hover:text-white"
                      >
                        {profile?.username || "未知居民"}
                      </Link>

                      <p className="mt-1 text-xs text-zinc-600">
                        {getReasonLabel(log.reason)} ·{" "}
                        {new Date(log.created_at).toLocaleString("zh-CN")}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {Number(log.light_change || 0) !== 0 && (
                      <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs text-green-300">
                        留下的光 {formatChange(log.light_change)}
                      </span>
                    )}

                    {Number(log.trust_change || 0) !== 0 && (
                      <span
                        className={`rounded-full border px-3 py-1 text-xs ${
                          Number(log.trust_change || 0) > 0
                            ? "border-purple-500/30 bg-purple-500/10 text-purple-300"
                            : "border-red-500/30 bg-red-500/10 text-red-300"
                        }`}
                      >
                        社区信任 {formatChange(log.trust_change)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}