"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { addUserGrowth } from "@/lib/community-growth";
import ReportFilters from "@/components/admin/reports/ReportFilters";
import ReportCard from "@/components/admin/reports/ReportCard";
import { fetchAdminReportsData } from "@/components/admin/reports/reportData";

import type {
  TargetInfo,
  FilterType,
} from "@/components/admin/reports/types";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [targetMap, setTargetMap] = useState<Record<string, TargetInfo>>({});
  const [targetReportCountMap, setTargetReportCountMap] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("active");
  const [sortMode, setSortMode] = useState<"newest" | "oldest">("newest");
  const [currentRole, setCurrentRole] = useState("user");

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortMode]);

  function canManageTarget(target?: TargetInfo) {
    if (!target) return false;

    if (target.authorRole === "owner" && currentRole !== "owner") {
      alert("只有 owner 可以处理 owner 相关目标。");
      return false;
    }

    return true;
  }

  function isOwnerTarget(reportId: string) {
    const target = targetMap[reportId];
    return target?.authorRole === "owner";
  }

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

    try {
      const result = await fetchAdminReportsData(sortMode);

      setReports(result.reports);
      setTargetMap(result.targetMap);
      setTargetReportCountMap(result.targetReportCountMap);
      setCurrentRole(result.currentRole);
    } catch (error: any) {
      alert("读取举报失败：" + error.message);
    }

    setLoading(false);
  }

  async function updateStatus(reportId: string, status: string) {
    const target = targetMap[reportId];

    if (target?.authorRole === "owner" && currentRole !== "owner") {
      alert("只有 owner 可以处理 owner 相关举报。");
      return;
    }

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
              report_rewarded:
                status === "resolved" ? true : report.report_rewarded,
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
    const target = targetMap[reportId];

    if (!canManageTarget(target)) return;

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
    const target = targetMap[reportId];

    if (!canManageTarget(target)) return;

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
    const target = targetMap[reportId];

    if (!canManageTarget(target)) return;

    if (target?.authorRole === "owner") {
      alert("owner 不能被警告、禁言或封禁。");
      return;
    }

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

    window.dispatchEvent(new Event("notifications-updated"));

    await updateStatus(reportId, "resolved");
  }

  async function markMaliciousReport(reportId: string) {
    if (isOwnerTarget(reportId) && currentRole !== "owner") {
      alert("只有 owner 可以处理 owner 相关举报。");
      return;
    }

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

      const currentFilterLabel =
        filter === "active"
          ? "待处理"
          : filter === "all"
          ? "全部"
          : filter === "pending"
          ? "未审核"
          : filter === "reviewed"
          ? "审核中"
          : filter === "resolved"
          ? "已解决"
          : filter === "rejected"
          ? "已驳回"
          : "恶意";

  const counts = {
    active: activeReports.length,
    all: allReports.length,
    pending: pendingReports.length,
    reviewed: reviewedReports.length,
    resolved: resolvedReports.length,
    rejected: rejectedReports.length,
    malicious: maliciousReports.length,
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
        正在读取举报中心...
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

        <ReportFilters
          filter={filter}
          setFilter={setFilter}
          sortMode={sortMode}
          setSortMode={setSortMode}
          counts={counts}
        />

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-5">
          <p className="text-sm text-zinc-500">
            当前显示：{currentFilterLabel} · {visibleReports.length} 条
          </p>
        </div>

        <div className="space-y-4">
          {visibleReports.length === 0 && (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
              这个分类下暂无举报。
            </div>
          )}

          {visibleReports.map((report) => {
            const target = targetMap[report.id];
            const targetKey = `${report.target_type}:${report.target_id}`;
            const targetReportCount = targetReportCountMap[targetKey] || 1;

            return (
              <ReportCard
                key={report.id}
                report={report}
                target={target}
                targetReportCount={targetReportCount}
                onUpdateStatus={updateStatus}
                onHidePost={hidePost}
                onHideComment={hideComment}
                onUpdateUserStatus={updateUserStatus}
                onMarkMalicious={markMaliciousReport}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}