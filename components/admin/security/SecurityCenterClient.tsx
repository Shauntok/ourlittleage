"use client";

import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type {
  SecurityEvent,
  SecurityOverview,
  SecurityRiskLevel,
} from "@/lib/security/service";
import WordDetectionSection from "./WordDetectionSection";

type Props = {
  currentRole: string | null;
};

const riskLabels: Record<SecurityRiskLevel, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
  critical: "严重风险",
};

const eventLabels: Record<SecurityEvent["eventType"], string> = {
  risk_level_changed: "人工调整风险等级",
  review_marked_pending: "标记为待复核",
  review_marked_complete: "完成人工复核",
  internal_note_updated: "更新内部备注",
};

export default function SecurityCenterClient({ currentRole }: Props) {
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadPage = useCallback(async (nextPage: number) => {
    setLoading(true);
    setError(false);

    try {
      const response = await fetch(`/api/admin/security?page=${nextPage}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("Security overview unavailable");

      const payload = (await response.json()) as { overview?: SecurityOverview };
      if (!payload.overview) throw new Error("Security overview missing");

      setOverview(payload.overview);
      setPage(nextPage);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPage(1);
  }, [loadPage]);

  if (loading && !overview) {
    return <p className="py-16 text-sm text-zinc-500">正在读取安全状态...</p>;
  }

  if (error && !overview) {
    return (
      <section className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-6">
        <p className="text-sm text-zinc-400">安全中心数据暂时无法读取。</p>
        <button
          type="button"
          onClick={() => void loadPage(page)}
          className="mt-4 rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:border-zinc-500"
        >
          重新尝试
        </button>
      </section>
    );
  }

  if (!overview) return null;

  const totalPages = Math.max(
    1,
    Math.ceil(overview.events.total / overview.events.pageSize)
  );
  const metrics = [
    { label: "待复核", value: overview.pendingReviewCount },
    { label: "低风险", value: overview.riskCounts.low },
    { label: "中风险", value: overview.riskCounts.medium },
    { label: "高风险", value: overview.riskCounts.high },
    { label: "严重风险", value: overview.riskCounts.critical },
  ];
  const flags = [
    ["安全中心", overview.flags.securityCenterEnabled],
    ["事件收集", overview.flags.securityEventCollectionEnabled],
    ["风险自动评估", overview.flags.riskEvaluationEnabled],
    ["自动处置", overview.flags.automaticEnforcementEnabled],
  ] as const;

  return (
    <div className="space-y-8" data-security-role={currentRole || "unknown"}>
      <header className="border-b border-zinc-800 pb-7">
        <div className="flex items-center gap-2 text-xs tracking-[0.25em] text-zinc-600">
          <ShieldCheck aria-hidden="true" className="h-4 w-4" />
          SECURITY CENTER
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-white">安全中心</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-500">
          汇总人工安全复核、风险标记与内部事件记录。自动评估和自动处置目前保持关闭。
        </p>
      </header>

      <section aria-label="安全状态概览" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-4"
          >
            <p className="text-xs text-zinc-500">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-100">{metric.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-5">
        <h2 className="text-base font-medium text-zinc-100">功能状态</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {flags.map(([label, enabled]) => (
            <div key={label} className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <span className="text-sm text-zinc-400">{label}</span>
              <span className={enabled ? "text-xs text-emerald-300" : "text-xs text-zinc-600"}>
                {enabled ? "已启用" : "未启用"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <WordDetectionSection
        summary={overview.wordDetection}
        canManage={currentRole === "owner" || currentRole === "admin"}
        onChanged={() => loadPage(page)}
      />

      <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/60">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-base font-medium text-zinc-100">最近安全事件</h2>
            <p className="mt-1 text-xs text-zinc-600">仅记录 Security Center 的人工风险与复核操作。</p>
          </div>
          <span className="text-xs text-zinc-600">共 {overview.events.total} 条</span>
        </div>

        {overview.events.items.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-zinc-600">目前还没有安全事件。</p>
        ) : (
          <div className="divide-y divide-zinc-800/80">
            {overview.events.items.map((event) => (
              <article key={event.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <p className="text-sm text-zinc-200">{event.username || "未知居民"}</p>
                  <p className="mt-1 text-xs text-zinc-500">{eventLabels[event.eventType]}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-500">{event.reason}</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    {eventStateSummary(event)}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <p className={riskTone(event.severity)}>{riskLabels[event.severity]}</p>
                  <time className="mt-1 block text-xs text-zinc-600" dateTime={event.occurredAt}>
                    {formatTime(event.occurredAt)}
                  </time>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-zinc-800 px-5 py-3">
          <span className="text-xs text-zinc-600">{page} / {totalPages}</span>
          <button
            type="button"
            aria-label="上一页"
            disabled={page <= 1 || loading}
            onClick={() => void loadPage(page - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 text-zinc-400 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="下一页"
            disabled={page >= totalPages || loading}
            onClick={() => void loadPage(page + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 text-zinc-400 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}

function riskTone(risk: SecurityRiskLevel) {
  if (risk === "critical") return "text-xs text-red-300";
  if (risk === "high") return "text-xs text-amber-300";
  return "text-xs text-zinc-400";
}

function eventStateSummary(event: SecurityEvent) {
  const previous = readState(event.metadata.previous);
  const next = readState(event.metadata.new);
  const parts: string[] = [];

  if (previous.riskLevel && next.riskLevel && previous.riskLevel !== next.riskLevel) {
    parts.push(`${previous.riskLevel} → ${next.riskLevel}`);
  }
  if (previous.reviewStatus && next.reviewStatus && previous.reviewStatus !== next.reviewStatus) {
    parts.push(`${previous.reviewStatus} → ${next.reviewStatus}`);
  }

  return parts.join(" · ") || "状态已记录";
}

function readState(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { riskLevel: null, reviewStatus: null };
  }
  const row = value as Record<string, unknown>;
  return {
    riskLevel: typeof row.risk_level === "string" ? row.risk_level : null,
    reviewStatus:
      typeof row.review_status === "string" ? row.review_status : null,
  };
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
