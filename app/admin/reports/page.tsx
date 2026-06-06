"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type TargetInfo = {
  title: string;
  desc: string;
  href: string;
  authorId?: string;
  canHidePost?: boolean;
  canHideComment?: boolean;
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [targetMap, setTargetMap] = useState<Record<string, TargetInfo>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  async function writeLog(
    action: string,
    targetType: string,
    targetId: string,
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
        target_type: targetType,
        target_id: targetId,
        details,
      },
    ]);
  }

  async function fetchReports() {
    setLoading(true);

    const { data, error } = await supabase
      .from("reports")
      .select(`
        *,
        profiles (
          username,
          avatar_url
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

    const rows = data || [];
    setReports(rows);

    const nextTargetMap: Record<string, TargetInfo> = {};

    await Promise.all(
      rows.map(async (report: any) => {
        if (!report.target_id || !report.target_type) {
          nextTargetMap[report.id] = {
            title: "没有目标资料",
            desc: "这条举报没有 target_id 或 target_type。",
            href: "/admin/reports",
          };

          return;
        }

        if (report.target_type === "post") {
          const { data: post } = await supabase
            .from("posts")
            .select("id, title, slug, content, type, author_id, visibility, status")
            .eq("id", report.target_id)
            .maybeSingle();

          if (!post) {
            nextTargetMap[report.id] = {
              title: "目标内容不存在",
              desc: "这篇文章 / 日记可能已经被删除。",
              href: "/admin/reports",
            };

            return;
          }

          nextTargetMap[report.id] = {
            title:
              post.type === "diary"
                ? "日记"
                : post.title || "无标题文章",
            desc: post.content
              ? String(post.content).slice(0, 160)
              : "没有内容预览。",
            href:
              post.type === "diary"
                ? `/diary/${post.id}`
                : post.slug
                ? `/articles/${post.slug}`
                : "/admin/reports",
            authorId: post.author_id,
            canHidePost: true,
          };

          return;
        }

        if (report.target_type === "comment") {
          const { data: comment } = await supabase
            .from("comments")
            .select("id, post_id, author_id, content, is_hidden, is_deleted")
            .eq("id", report.target_id)
            .maybeSingle();

          if (!comment) {
            nextTargetMap[report.id] = {
              title: "目标评论不存在",
              desc: "这条评论可能已经被删除。",
              href: "/admin/comments",
            };

            return;
          }

          nextTargetMap[report.id] = {
            title: "评论",
            desc: comment.content || "没有评论内容。",
            href: "/admin/comments",
            authorId: comment.author_id,
            canHideComment: true,
          };

          return;
        }

        if (report.target_type === "user") {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, username, bio")
            .eq("id", report.target_id)
            .maybeSingle();

          nextTargetMap[report.id] = {
            title: profile?.username || "未知居民",
            desc: profile?.bio || "这个居民没有简介。",
            href: profile?.id
              ? `/admin/users/${profile.id}`
              : "/admin/users",
            authorId: profile?.id,
          };
        }
      })
    );

    setTargetMap(nextTargetMap);
    setLoading(false);
  }

  async function updateStatus(reportId: string, status: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("reports")
      .update({
        status,
        handled_by: user?.id,
        handled_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (error) {
      alert(error.message);
      return;
    }

    await writeLog(
      "update_report_status",
      "report",
      reportId,
      `举报状态修改为 ${status}`
    );

    fetchReports();
  }

  async function hidePost(postId: string, reportId: string) {
    const confirmed = confirm("确定隐藏这个内容吗？");
    if (!confirmed) return;

    const { error } = await supabase
      .from("posts")
      .update({
        visibility: "hidden",
        edited_at: new Date().toISOString(),
      })
      .eq("id", postId);

    if (error) {
      alert(error.message);
      return;
    }

    await writeLog("hide_reported_post", "post", postId, `从举报 ${reportId} 隐藏内容`);
    await updateStatus(reportId, "resolved");
  }

  async function hideComment(commentId: string, reportId: string) {
    const confirmed = confirm("确定隐藏这条评论吗？");
    if (!confirmed) return;

    const { error } = await supabase
      .from("comments")
      .update({
        is_hidden: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId);

    if (error) {
      alert(error.message);
      return;
    }

    await writeLog("hide_reported_comment", "comment", commentId, `从举报 ${reportId} 隐藏评论`);
    await updateStatus(reportId, "resolved");
  }

  async function updateUserStatus(
    userId: string,
    reportId: string,
    status: "warned" | "muted" | "banned"
  ) {
    const confirmed = confirm(`确定把这个用户设为 ${status} 吗？`);
    if (!confirmed) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      alert(error.message);
      return;
    }

    await writeLog(
      "update_reported_user_status",
      "user",
      userId,
      `从举报 ${reportId} 修改用户状态为 ${status}`
    );

    await supabase.from("notifications").insert([
      {
        user_id: userId,
        title:
          status === "warned"
            ? "⚠️ 社区提醒"
            : status === "muted"
            ? "🔇 你已被暂时禁言"
            : "🚫 账号已被封禁",
        content:
          status === "warned"
            ? "你的内容或行为被管理员提醒，请注意社区秩序。"
            : status === "muted"
            ? "你目前暂时无法发表评论，请等待管理层进一步处理。"
            : "由于违反社区规范，你的账号已被封禁。",
        type: "system",
      },
    ]);

    await updateStatus(reportId, "resolved");
  }

  function getStatusStyle(status: string) {
    switch (status) {
      case "pending":
        return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
      case "reviewed":
        return "border-blue-500/30 bg-blue-500/10 text-blue-300";
      case "resolved":
        return "border-green-500/30 bg-green-500/10 text-green-300";
      case "rejected":
        return "border-zinc-700 bg-zinc-900 text-zinc-300";
      default:
        return "border-zinc-700 bg-zinc-900 text-zinc-300";
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
        正在读取举报中心...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">
          举报中心 🚩
        </h1>

        <p className="mt-2 text-zinc-500">
          查看举报目标，并直接处理内容、评论或用户。
        </p>
      </div>

      <div className="space-y-4">
        {reports.length === 0 && (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
            目前没有举报。
          </div>
        )}

        {reports.map((report: any) => {
          const target = targetMap[report.id];

          return (
            <div
              key={report.id}
              className="min-w-0 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6"
            >
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                <div className="min-w-0 space-y-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-sm text-red-300">
                      🚩 举报
                    </span>

                    <span className={`rounded-full border px-3 py-1 text-sm ${getStatusStyle(report.status)}`}>
                      {report.status || "pending"}
                    </span>

                    <span className="text-sm text-zinc-600">
                      {new Date(report.created_at).toLocaleString("zh-CN")}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">
                      举报人
                    </p>

                    <p className="safe-text mt-1 text-zinc-300">
                      {report.profiles?.username || "未知居民"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">
                      举报原因
                    </p>

                    <p className="safe-pre mt-1 text-white">
                      {report.reason || "没有填写原因"}
                    </p>
                  </div>

                  {report.details && (
                    <div>
                      <p className="text-sm text-zinc-500">
                        补充说明
                      </p>

                      <p className="safe-pre mt-1 text-zinc-300">
                        {report.details}
                      </p>
                    </div>
                  )}

                  <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
                    <p className="text-sm text-zinc-500">
                      举报目标：{report.target_type}
                    </p>

                    <p className="safe-text mt-2 font-semibold text-zinc-100">
                      {target?.title || "正在读取目标..."}
                    </p>

                    <p className="safe-pre mt-2 text-sm leading-7 text-zinc-400">
                      {target?.desc || "没有目标预览。"}
                    </p>

                    {target?.href && (
                      <Link
                        href={target.href}
                        target="_blank"
                        className="mt-4 inline-flex rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition hover:border-white hover:text-white"
                      >
                        查看目标 ↗
                      </Link>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 md:w-44 md:flex-col">
                  <button
                    onClick={() => updateStatus(report.id, "reviewed")}
                    className="rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300 transition hover:bg-blue-500/20"
                  >
                    标记审核
                  </button>

                  {target?.canHidePost && (
                    <button
                      onClick={() => hidePost(report.target_id, report.id)}
                      className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300 transition hover:bg-yellow-500/20"
                    >
                      隐藏内容
                    </button>
                  )}

                  {target?.canHideComment && (
                    <button
                      onClick={() => hideComment(report.target_id, report.id)}
                      className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300 transition hover:bg-yellow-500/20"
                    >
                      隐藏评论
                    </button>
                  )}

                  {target?.authorId && (
                    <>
                      <button
                        onClick={() =>
                          updateUserStatus(target.authorId!, report.id, "warned")
                        }
                        className="rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm text-orange-300 transition hover:bg-orange-500/20"
                      >
                        警告用户
                      </button>

                      <button
                        onClick={() =>
                          updateUserStatus(target.authorId!, report.id, "muted")
                        }
                        className="rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-300 transition hover:bg-purple-500/20"
                      >
                        禁言用户
                      </button>

                      <button
                        onClick={() =>
                          updateUserStatus(target.authorId!, report.id, "banned")
                        }
                        className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/20"
                      >
                        封禁用户
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => updateStatus(report.id, "resolved")}
                    className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-300 transition hover:bg-green-500/20"
                  >
                    已解决
                  </button>

                  <button
                    onClick={() => updateStatus(report.id, "rejected")}
                    className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
                  >
                    驳回
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}