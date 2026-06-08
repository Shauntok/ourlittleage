"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { addUserGrowth } from "@/lib/community-growth";

type TargetInfo = {
  title: string;
  desc: string;
  href: string;
  authorId?: string;
  authorRole?: string;
  authorName?: string;
  parentTitle?: string;
  parentHref?: string;
  canHidePost?: boolean;
  canHideComment?: boolean;
};

type FilterType =
  | "active"
  | "all"
  | "pending"
  | "reviewed"
  | "resolved"
  | "rejected"
  | "malicious";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [targetMap, setTargetMap] = useState<Record<string, TargetInfo>>({});
  const [targetReportCountMap, setTargetReportCountMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("active");
  const [sortMode, setSortMode] = useState<"newest" | "oldest">("newest");

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortMode]);

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

    const { error } = await supabase.from("admin_logs").insert([
      {
        admin_id: user.id,
        action,
        target_type: targetType,
        target_id: targetId,
        details,
      },
    ]);

    if (error) {
      alert("写入操作日志失败：" + error.message);
    }
  }

  async function fetchReports() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let myRole = "user";

    if (user) {
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      myRole = myProfile?.role || "user";
    }

    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", {
        ascending: sortMode === "oldest",
      });

    if (error) {
      alert("读取举报失败：" + error.message);
      setLoading(false);
      return;
    }

    let rows = data || [];

    const reporterIds = Array.from(
      new Set(rows.map((report: any) => report.reporter_id).filter(Boolean))
    );

    const { data: reporterProfiles } =
      reporterIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", reporterIds)
        : { data: [] as any[] };

    const reporterMap = new Map(
      (reporterProfiles || []).map((profile: any) => [profile.id, profile])
    );

    rows = rows.map((report: any) => ({
      ...report,
      reporter: reporterMap.get(report.reporter_id) || null,
    }));

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
            .select(
              "id, title, slug, content, type, author_id, visibility, status"
            )
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

          let authorRole = "user";

          if (post.author_id) {
            const { data: authorProfile } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", post.author_id)
              .maybeSingle();

            authorRole = authorProfile?.role || "user";
          }

          nextTargetMap[report.id] = {
            title:
              post.type === "diary" ? "日记" : post.title || "无标题文章",
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
            authorRole,
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

          let authorRole = "user";
          let authorName = "未知居民";

          if (comment.author_id) {
            const { data: authorProfile } = await supabase
              .from("profiles")
              .select("username, role")
              .eq("id", comment.author_id)
              .maybeSingle();

            authorRole = authorProfile?.role || "user";
            authorName = authorProfile?.username || "未知居民";
          }

          let parentTitle = "未知内容";
          let parentHref = "/admin/comments";

          if (comment.post_id) {
            const { data: parentPost } = await supabase
              .from("posts")
              .select("id, title, slug, type")
              .eq("id", comment.post_id)
              .maybeSingle();

            if (parentPost) {
              parentTitle =
                parentPost.type === "diary"
                  ? "日记"
                  : parentPost.title || "无标题文章";

              parentHref =
                parentPost.type === "diary"
                  ? `/diary/${parentPost.id}`
                  : parentPost.slug
                  ? `/articles/${parentPost.slug}`
                  : "/admin/comments";
            }
          }

          nextTargetMap[report.id] = {
            title: "评论",
            desc: comment.content || "没有评论内容。",
            href: parentHref,
            authorId: comment.author_id,
            authorRole,
            authorName,
            parentTitle,
            parentHref,
            canHideComment: true,
          };

          return;
        }

        if (report.target_type === "user") {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, username, bio, role")
            .eq("id", report.target_id)
            .maybeSingle();

          nextTargetMap[report.id] = {
            title: profile?.username || "未知居民",
            desc: profile?.bio || "这个居民没有简介。",
            href: profile?.id ? `/admin/users/${profile.id}` : "/admin/users",
            authorId: profile?.id,
            authorRole: profile?.role || "user",
          };
        }
      })
    );

    const nextTargetReportCountMap: Record<string, number> = {};

      rows.forEach((report: any) => {
        if (!report.target_type || !report.target_id) return;

        const key = `${report.target_type}:${report.target_id}`;

        nextTargetReportCountMap[key] =
          (nextTargetReportCountMap[key] || 0) + 1;
      });

    const visibleRows = rows.filter((report: any) => {
      const target = nextTargetMap[report.id];

      if (target?.authorRole === "owner" && myRole !== "owner") {
        return false;
      }

      return true;
    });

    setReports(visibleRows);
    setTargetMap(nextTargetMap);
    setTargetReportCountMap(nextTargetReportCountMap);
    setLoading(false);
  }

  async function updateStatus(reportId: string, status: string) {
    const currentReport = reports.find((item) => item.id === reportId);

    if (!currentReport) {
      alert("找不到这条举报。");
      return;
    }

    const isFinalStatus = status === "resolved" || status === "rejected";

    if (
      currentReport.status === "resolved" ||
      currentReport.status === "rejected"
    ) {
      alert("这条举报已经结案，不能重复处理。");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const now = new Date().toISOString();

    const updates: any = {
      status,
      handled_by: user?.id,
      handled_at: now,
    };

    if (status === "resolved") {
      updates.report_rewarded = true;
    }

    const { error } = await supabase
      .from("reports")
      .update(updates)
      .eq("id", reportId);

    if (error) {
      alert("更新举报状态失败：" + error.message);
      return;
    }

    setReports((current) =>
      current.map((report) =>
        report.id === reportId
          ? {
              ...report,
              status,
              handled_by: user?.id,
              handled_at: now,
              report_rewarded: isFinalStatus ? true : report.report_rewarded,
            }
          : report
      )
    );

    await writeLog(
      "update_report_status",
      "report",
      reportId,
      `举报状态修改为 ${status}`
    );

    if (
      status === "resolved" &&
      !currentReport.report_rewarded &&
      currentReport.reporter_id
    ) {
      await addUserGrowth({
        userId: currentReport.reporter_id,
        trust: 0.05,
        reason: "report_success",
      });
    }

    await fetchReports();
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
      alert("隐藏内容失败：" + error.message);
      return;
    }

    await writeLog(
      "hide_reported_post",
      "post",
      postId,
      `从举报 ${reportId} 隐藏内容`
    );

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
      alert("隐藏评论失败：" + error.message);
      return;
    }

    await writeLog(
      "hide_reported_comment",
      "comment",
      commentId,
      `从举报 ${reportId} 隐藏评论`
    );

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
      alert("修改用户状态失败：" + error.message);
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

  async function markMaliciousReport(reportId: string) {
    const currentReport = reports.find((item) => item.id === reportId);

    if (!currentReport) {
      alert("找不到这条举报。");
      return;
    }

    if (
      currentReport.status === "resolved" ||
      currentReport.status === "rejected"
    ) {
      alert("这条举报已经结案，不能重复处理。");
      return;
    }

    const confirmed = confirm(
      "确定标记为恶意举报吗？这会扣除举报人的社区信任。"
    );

    if (!confirmed) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("reports")
      .update({
        status: "rejected",
        is_malicious: true,
        report_rewarded: true,
        handled_by: user?.id,
        handled_at: now,
      })
      .eq("id", reportId);

    if (error) {
      alert("标记恶意举报失败：" + error.message);
      return;
    }

    setReports((current) =>
      current.map((report) =>
        report.id === reportId
          ? {
              ...report,
              status: "rejected",
              is_malicious: true,
              report_rewarded: true,
              handled_by: user?.id,
              handled_at: now,
            }
          : report
      )
    );

    if (!currentReport.report_rewarded && currentReport.reporter_id) {
      await addUserGrowth({
        userId: currentReport.reporter_id,
        trust: -0.05,
        reason: "malicious_report",
      });
    }

    await writeLog(
      "mark_malicious_report",
      "report",
      reportId,
      "标记为恶意举报，并扣除举报人社区信任"
    );

    await fetchReports();
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

  const allReports = reports;
  const pendingReports = reports.filter((report) => report.status === "pending");
  const reviewedReports = reports.filter((report) => report.status === "reviewed");
  const resolvedReports = reports.filter((report) => report.status === "resolved");
  const rejectedReports = reports.filter(
    (report) => report.status === "rejected" && !report.is_malicious
  );
  const maliciousReports = reports.filter((report) => report.is_malicious);
  const activeReports = reports.filter(
    (report) => report.status !== "resolved" && report.status !== "rejected"
  );

  const visibleReports =
    filter === "all"
      ? allReports
      : filter === "pending"
      ? pendingReports
      : filter === "reviewed"
      ? reviewedReports
      : filter === "resolved"
      ? resolvedReports
      : filter === "rejected"
      ? rejectedReports
      : filter === "malicious"
      ? maliciousReports
      : activeReports;

  const filterTabs = [
    { key: "active", label: "待处理", count: activeReports.length },
    { key: "all", label: "全部", count: allReports.length },
    { key: "pending", label: "未审核", count: pendingReports.length },
    { key: "reviewed", label: "审核中", count: reviewedReports.length },
    { key: "resolved", label: "已解决", count: resolvedReports.length },
    { key: "rejected", label: "已驳回", count: rejectedReports.length },
    { key: "malicious", label: "恶意", count: maliciousReports.length },
  ] as const;

  if (loading) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
        正在读取举报中心...
      </div>
    );
  }

  function renderReport(report: any) {
    const target = targetMap[report.id];
    const isClosed = report.status === "resolved" || report.status === "rejected";
    const targetKey = `${report.target_type}:${report.target_id}`;
    const targetReportCount = targetReportCountMap[targetKey] || 1;

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

              <span
                className={`rounded-full border px-3 py-1 text-sm ${
                  report.is_malicious
                    ? "border-red-500/30 bg-red-500/10 text-red-300"
                    : getStatusStyle(report.status)
                }`}
              >
                {report.is_malicious ? "恶意举报" : report.status || "pending"}
              </span>

              <span className="text-sm text-zinc-600">
                {new Date(report.created_at).toLocaleString("zh-CN")}
              </span>
            </div>

            <div>
              <p className="text-sm text-zinc-500">举报人</p>
              <p className="safe-text mt-1 text-zinc-300">
                {report.reporter?.username || report.reporter_id || "未知居民"}
              </p>
            </div>

            <div>
              <p className="text-sm text-zinc-500">举报原因</p>
              <p className="safe-pre mt-1 text-white">
                {report.reason || "没有填写原因"}
              </p>
            </div>

            {report.details && (
              <div>
                <p className="text-sm text-zinc-500">补充说明</p>
                <p className="safe-pre mt-1 text-zinc-300">
                  {report.details}
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
              <p className="text-sm text-zinc-500">
                举报目标：{report.target_type}
              </p>

              {targetReportCount > 1 && (
                <span className="mt-3 inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-300">
                  同一目标已被举报 {targetReportCount} 次
                </span>
              )}

              <p className="safe-text mt-2 font-semibold text-zinc-100">
                {target?.title || "正在读取目标..."}
              </p>

              {report.target_type === "comment" && (
                <div className="mt-4 space-y-3 rounded-2xl border border-zinc-800 bg-black/30 p-4">
                  <div>
                    <p className="text-xs text-zinc-500">评论作者</p>
                    <p className="safe-text mt-1 text-sm text-zinc-200">
                      {target?.authorName || "未知居民"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500">所属内容</p>
                    <p className="safe-text mt-1 text-sm text-zinc-200">
                      {target?.parentTitle || "未知内容"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500">评论内容</p>
                    <p className="safe-pre mt-1 text-sm leading-7 text-zinc-300">
                      {target?.desc || "没有评论内容。"}
                    </p>
                  </div>
                </div>
              )}

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

          {!isClosed && (
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

              <button
                onClick={() => markMaliciousReport(report.id)}
                className="rounded-full border border-red-500/40 bg-red-500/[0.08] px-4 py-2 text-sm text-red-200 transition hover:bg-red-500/[0.16]"
              >
                恶意举报
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <h1 className="text-4xl font-bold">举报中心 🚩</h1>

          <p className="mt-2 text-zinc-500">
            查看举报目标，并直接处理内容、评论或用户。
          </p>
        </div>

        <button
          onClick={fetchReports}
          className="rounded-full border border-zinc-700 bg-zinc-950 px-5 py-3 text-sm text-zinc-300 transition hover:border-white hover:text-white"
        >
          刷新数据
        </button>
      </div>

      <section className="space-y-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-wrap gap-3">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  filter === tab.key
                    ? "border-white bg-white text-black"
                    : "border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-white hover:text-white"
                }`}
              >
                {tab.label}{" "}
                <span
                  className={
                    filter === tab.key ? "text-black/60" : "text-zinc-600"
                  }
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSortMode("newest")}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                sortMode === "newest"
                  ? "border-white bg-white text-black"
                  : "border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-white hover:text-white"
              }`}
            >
              最新优先
            </button>

            <button
              type="button"
              onClick={() => setSortMode("oldest")}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                sortMode === "oldest"
                  ? "border-white bg-white text-black"
                  : "border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-white hover:text-white"
              }`}
            >
              最旧优先
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-5">
          <p className="text-sm text-zinc-500">
            当前显示：{filterTabs.find((tab) => tab.key === filter)?.label} ·{" "}
            {visibleReports.length} 条
          </p>
        </div>

        <div className="space-y-4">
          {visibleReports.length === 0 && (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
              这个分类下暂无举报。
            </div>
          )}

          {visibleReports.map(renderReport)}
        </div>
      </section>
    </div>
  );
}