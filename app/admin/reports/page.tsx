"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { addUserGrowth } from "@/lib/community-growth";
import ReportFilters from "@/components/admin/reports/ReportFilters";
import ReportCard from "@/components/admin/reports/ReportCard";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
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

  const [message, setMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    description: string;
    confirmText: string;
    danger?: boolean;
    action: (() => Promise<void>) | null;
  }>({
    title: "",
    description: "",
    confirmText: "确认",
    danger: false,
    action: null,
  });

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortMode]);

  function showMessage(text: string) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 3500);
  }

  function openConfirm(config: {
    title: string;
    description: string;
    confirmText?: string;
    danger?: boolean;
    action: () => Promise<void>;
  }) {
    setConfirmConfig({
      title: config.title,
      description: config.description,
      confirmText: config.confirmText || "确认",
      danger: config.danger || false,
      action: config.action,
    });

    setConfirmOpen(true);
  }

  async function handleConfirm() {
    if (!confirmConfig.action) return;

    setConfirmLoading(true);
    await confirmConfig.action();
    setConfirmLoading(false);
    setConfirmOpen(false);
  }

  function canManageTarget(target?: TargetInfo) {
    if (!target) return false;

    if (target.authorRole === "owner" && currentRole !== "owner") {
      showMessage("只有 owner 可以处理 owner 相关目标。");
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
      showMessage("写入操作日志失败：" + error.message);
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
      showMessage("读取举报失败：" + error.message);
    }

    setLoading(false);
  }

  async function updateStatus(reportId: string, status: string) {
    const target = targetMap[reportId];

    if (target?.authorRole === "owner" && currentRole !== "owner") {
      showMessage("只有 owner 可以处理 owner 相关举报。");
      return;
    }

    const currentReport = reports.find((item) => item.id === reportId);

    if (!currentReport) {
      showMessage("找不到这条举报。");
      return;
    }

    if (
      currentReport.status === "resolved" ||
      currentReport.status === "rejected"
    ) {
      showMessage("这条举报已经结案，不能重复处理。");
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
      showMessage("更新举报状态失败：" + error.message);
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

    openConfirm({
      title: "隐藏这个内容？",
      description: "隐藏后，普通居民将无法继续看到这篇内容。这条举报也会被标记为已解决。",
      confirmText: "隐藏内容",
      danger: true,
      action: async () => {
        const { error } = await supabase
          .from("posts")
          .update({
            visibility: "hidden",
            edited_at: new Date().toISOString(),
          })
          .eq("id", postId);

        if (error) {
          showMessage("隐藏内容失败：" + error.message);
          return;
        }

        await writeLog(
          "hide_reported_post",
          "post",
          postId,
          `从举报 ${reportId} 隐藏内容`
        );

        await updateStatus(reportId, "resolved");
      },
    });
  }

  async function hideComment(commentId: string, reportId: string) {
    const target = targetMap[reportId];

    if (!canManageTarget(target)) return;

    openConfirm({
      title: "隐藏这条评论？",
      description: "隐藏后，普通居民将无法继续看到这条评论。这条举报也会被标记为已解决。",
      confirmText: "隐藏评论",
      danger: true,
      action: async () => {
        const { error } = await supabase
          .from("comments")
          .update({
            is_hidden: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", commentId);

        if (error) {
          showMessage("隐藏评论失败：" + error.message);
          return;
        }

        await writeLog(
          "hide_reported_comment",
          "comment",
          commentId,
          `从举报 ${reportId} 隐藏评论`
        );

        await updateStatus(reportId, "resolved");
      },
    });
  }

  async function updateUserStatus(
    userId: string,
    reportId: string,
    status: "warned" | "muted" | "banned"
  ) {
    const target = targetMap[reportId];

    if (!canManageTarget(target)) return;

    if (target?.authorRole === "owner") {
      showMessage("owner 不能被警告、禁言或封禁。");
      return;
    }

    const statusText = {
      warned: "警告",
      muted: "禁言",
      banned: "封禁",
    };

    openConfirm({
      title: `${statusText[status]}这个用户？`,
      description: `确定要把这个用户设为「${statusText[status]}」吗？这条举报也会被标记为已解决。`,
      confirmText: statusText[status],
      danger: status !== "warned",
      action: async () => {
        const { error } = await supabase
          .from("profiles")
          .update({
            status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (error) {
          showMessage("修改用户状态失败：" + error.message);
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
      },
    });
  }

  async function markMaliciousReport(reportId: string) {
    if (isOwnerTarget(reportId) && currentRole !== "owner") {
      showMessage("只有 owner 可以处理 owner 相关举报。");
      return;
    }

    const currentReport = reports.find((item) => item.id === reportId);

    if (!currentReport) {
      showMessage("找不到这条举报。");
      return;
    }

    if (
      currentReport.status === "resolved" ||
      currentReport.status === "rejected"
    ) {
      showMessage("这条举报已经结案，不能重复处理。");
      return;
    }

    openConfirm({
      title: "标记为恶意举报？",
      description: "这会扣除举报人的社区信任，并把这条举报标记为已驳回。",
      confirmText: "标记恶意",
      danger: true,
      action: async () => {
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
          showMessage("标记恶意举报失败：" + error.message);
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
      },
    });
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
          type="button"
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

      {message && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-white/10 bg-zinc-900/95 px-5 py-3 text-sm text-white shadow-2xl backdrop-blur-xl">
          {message}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmText={confirmConfig.confirmText}
        cancelText="取消"
        danger={confirmConfig.danger}
        loading={confirmLoading}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}