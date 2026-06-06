"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

function getActionStyle(action: string) {
  switch (action) {
    case "give_badge":
      return {
        label: "发放徽章",
        color: "bg-violet-500/15 text-violet-300 border-violet-500/30",
        icon: "🎖️",
      };

    case "remove_badge":
      return {
        label: "移除徽章",
        color: "bg-red-500/15 text-red-300 border-red-500/30",
        icon: "❌",
      };

    case "create_badge":
      return {
        label: "创建徽章",
        color: "bg-purple-500/15 text-purple-300 border-purple-500/30",
        icon: "✨",
      };

    case "delete_badge":
      return {
        label: "删除徽章",
        color: "bg-red-500/15 text-red-300 border-red-500/30",
        icon: "🗑️",
      };

    case "update_role":
      return {
        label: "修改身份",
        color: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
        icon: "👑",
      };

    case "update_status":
      return {
        label: "修改状态",
        color: "bg-red-500/15 text-red-300 border-red-500/30",
        icon: "🚨",
      };

    case "update_growth":
      return {
        label: "调整成长值",
        color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        icon: "🌱",
      };

    case "hide_comment":
      return {
        label: "隐藏评论",
        color: "bg-orange-500/15 text-orange-300 border-orange-500/30",
        icon: "🙈",
      };

    case "restore_comment":
      return {
        label: "恢复评论",
        color: "bg-green-500/15 text-green-300 border-green-500/30",
        icon: "♻️",
      };

    case "delete_comment":
      return {
        label: "删除评论",
        color: "bg-red-500/15 text-red-300 border-red-500/30",
        icon: "🗑️",
      };

    case "update_report_status":
      return {
        label: "处理举报",
        color: "bg-blue-500/15 text-blue-300 border-blue-500/30",
        icon: "🚩",
      };

    case "hide_reported_post":
      return {
        label: "隐藏被举报内容",
        color: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
        icon: "🙈",
      };

    case "hide_reported_comment":
      return {
        label: "隐藏被举报评论",
        color: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
        icon: "💬",
      };

    case "update_reported_user_status":
      return {
        label: "处理被举报用户",
        color: "bg-red-500/15 text-red-300 border-red-500/30",
        icon: "⛔",
      };

    default:
      return {
        label: action || "未知操作",
        color: "bg-zinc-800 text-zinc-300 border-zinc-700",
        icon: "📄",
      };
  }
}

export default function AdminLogsPage() {
  const router = useRouter();

  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAndFetchLogs();
  }, []);

  async function checkAndFetchLogs() {
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
      router.push("/admin");
      return;
    }

    const { data } = await supabase
      .from("admin_logs")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    const rawLogs = data || [];

    const adminIds = Array.from(
      new Set(
        rawLogs
          .map((log) => log.admin_id)
          .filter(Boolean)
      )
    );

    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", adminIds);

    const profileMap = new Map(
      (adminProfiles || []).map((item: any) => [
        item.id,
        item.username,
      ])
    );

    const logsWithAdminName = rawLogs.map((log) => ({
      ...log,
      admin_username:
        profileMap.get(log.admin_id) || "未知管理员",
    }));

    setLogs(logsWithAdminName);
    setLoading(false);
  }

  const filteredLogs = logs.filter((log) => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) return true;

    return (
      log.action?.toLowerCase().includes(keyword) ||
      log.details?.toLowerCase().includes(keyword) ||
      log.target_type?.toLowerCase().includes(keyword) ||
      String(log.target_id || "")
        .toLowerCase()
        .includes(keyword) ||
      log.admin_username?.toLowerCase().includes(keyword)
    );
  });

  if (loading) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
        正在读取操作日志...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">
          操作日志 📜
        </h1>

        <p className="mt-2 text-zinc-500">
          记录后台管理员的所有重要操作。仅 owner 可查看。
        </p>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜索管理员、动作、目标 ID 或详情..."
        className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4 outline-none transition focus:border-white"
      />

      <div className="rounded-full border border-zinc-800 bg-zinc-950 px-5 py-3 text-sm text-zinc-400">
        显示 {filteredLogs.length} / {logs.length} 条日志
      </div>

      <div className="space-y-4">
        {filteredLogs.length === 0 && (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
            没有找到符合条件的日志。
          </div>
        )}

        {filteredLogs.map((log: any) => {
          const actionStyle = getActionStyle(log.action);

          return (
            <div
              key={log.id}
              className="min-w-0 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/50 p-5"
            >
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                <div className="min-w-0 space-y-3">
                  <div
                    className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold ${actionStyle.color}`}
                  >
                    <span>{actionStyle.icon}</span>
                    <span className="safe-text">
                      {actionStyle.label}
                    </span>
                  </div>

                  <p className="safe-pre text-sm leading-7 text-zinc-400">
                    {log.details || "没有详情。"}
                  </p>

                  <div className="flex flex-wrap gap-3 text-xs text-zinc-600">
                    <span>
                      Admin：{log.admin_username || "未知管理员"}
                    </span>

                    <span>
                      Target：{log.target_type || "unknown"}
                    </span>

                    <span className="break-all">
                      ID：{log.target_id || "无"}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-sm text-zinc-600">
                  {log.created_at
                    ? new Date(log.created_at).toLocaleString("zh-CN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "未知时间"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}