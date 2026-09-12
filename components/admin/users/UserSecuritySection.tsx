"use client";

import { ChevronLeft, ChevronRight, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type {
  ResidentSecurityOverview,
  SecurityEvent,
  SecurityReviewStatus,
  SecurityRiskActionInput,
  SecurityRiskLevel,
} from "@/lib/security/service";

type Props = {
  userId: string;
  username: string | null;
  accountStatus: string | null;
  currentRole: string | null;
};

type SecurityAction = SecurityRiskActionInput["action"];

const riskLabels: Record<SecurityRiskLevel, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
  critical: "严重风险",
};

const reviewLabels: Record<SecurityReviewStatus, string> = {
  no_review_required: "无需复核",
  pending: "待复核",
  reviewed: "已复核",
};

const eventLabels: Record<SecurityEvent["eventType"], string> = {
  risk_level_changed: "调整风险等级",
  review_marked_pending: "标记待复核",
  review_marked_complete: "完成复核",
  internal_note_updated: "更新内部备注",
};

export default function UserSecuritySection({
  userId,
  username,
  accountStatus,
  currentRole,
}: Props) {
  const [overview, setOverview] = useState<ResidentSecurityOverview | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [riskLevel, setRiskLevel] = useState<SecurityRiskLevel>("low");
  const [reviewStatus, setReviewStatus] =
    useState<SecurityReviewStatus>("no_review_required");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<{
    action: SecurityAction;
    id: string;
  } | null>(null);
  const [message, setMessage] = useState("");

  const requestOverview = useCallback(
    async (page = 1) => {
      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(userId)}/security?page=${page}`,
        { cache: "no-store", credentials: "same-origin" }
      );
      if (!response.ok) throw new Error("Security data unavailable");
      const payload = (await response.json()) as {
        overview?: ResidentSecurityOverview;
      };
      if (!payload.overview) throw new Error("Security response missing");
      return payload.overview;
    },
    [userId]
  );

  const applyOverview = useCallback((next: ResidentSecurityOverview) => {
    setOverview(next);
    setRiskLevel(next.profile.riskLevel);
    setReviewStatus(next.profile.reviewStatus);
    setNote(next.profile.notes || "");
    setState("ready");
  }, []);

  const load = useCallback(
    async (page = 1) => {
      applyOverview(await requestOverview(page));
    },
    [applyOverview, requestOverview]
  );

  useEffect(() => {
    let active = true;
    requestOverview()
      .then((next) => {
        if (active) applyOverview(next);
      })
      .catch(() => {
        if (active) setState("error");
      });
    return () => {
      active = false;
    };
  }, [applyOverview, requestOverview]);

  if (state === "loading") {
    return <SecurityShell>读取安全资料中...</SecurityShell>;
  }

  if (state === "error" || !overview) {
    return (
      <SecurityShell>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span>安全资料暂时无法读取</span>
          <button
            type="button"
            onClick={() => {
              setState("loading");
              void load().catch(() => setState("error"));
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            重新加载
          </button>
        </div>
      </SecurityShell>
    );
  }

  const isOwner = currentRole === "owner";
  const totalPages = Math.max(1, Math.ceil(overview.events.total / overview.events.pageSize));

  async function submit(action: SecurityAction) {
    if (!reason.trim() || pending) return;

    const requestId =
      pendingRequest?.action === action
        ? pendingRequest.id
        : crypto.randomUUID();
    if (pendingRequest?.action !== action) {
      setPendingRequest({ action, id: requestId });
    }

    const input: SecurityRiskActionInput =
      action === "set_risk"
        ? { action, riskLevel, reason: reason.trim(), requestId }
        : action === "set_review"
          ? { action, reviewStatus, reason: reason.trim(), requestId }
          : { action, note: note.trim() || null, reason: reason.trim(), requestId };

    setPending(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(userId)}/security`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }
      );
      if (!response.ok) throw new Error("Security mutation failed");
    } catch {
      setMessage("操作没有完成，请确认当前状态后重试。");
      setPending(false);
      return;
    }

    setReason("");
    setPendingRequest(null);
    setMessage("安全复核资料已更新。");

    try {
      await load(overview?.events.page ?? 1);
    } catch {
      setMessage("操作已完成，但最新安全资料暂时无法读取。");
    }
    setPending(false);
  }

  function resetRequest() {
    setPendingRequest(null);
  }

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="h-5 w-5 text-zinc-400" />
            <h2 className="text-2xl font-bold">Security</h2>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            @{username || "未设置用户名"} 的人工风险与复核记录
          </p>
        </div>
        {!isOwner && (
          <p className="text-xs text-zinc-500">仅 Owner 可以调整安全复核资料。</p>
        )}
      </div>

      <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="账号状态" value={accountStatus || "unknown"} />
        <Metric label="风险等级" value={riskLabels[overview.profile.riskLevel]} />
        <Metric label="复核状态" value={reviewLabels[overview.profile.reviewStatus]} />
        <Metric label="最后事件" value={formatDate(overview.profile.lastEventAt)} />
        <Metric label="最后复核" value={formatDate(overview.profile.lastReviewedAt)} />
      </dl>

      <div className="mt-7 border-t border-zinc-800 pt-6">
        <h3 className="text-sm font-medium text-zinc-200">内部备注</h3>
        <textarea
          aria-label="内部备注"
          value={note}
          readOnly={!isOwner}
          maxLength={2000}
          rows={4}
          onChange={(event) => {
            setNote(event.target.value);
            resetRequest();
          }}
          className="mt-3 w-full resize-y rounded-lg border border-zinc-800 bg-black px-3 py-3 text-sm leading-6 text-zinc-300 outline-none read-only:text-zinc-500 focus:border-zinc-500"
        />
      </div>

      {isOwner && (
        <div className="mt-6 space-y-5 border-t border-zinc-800 pt-6">
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <label htmlFor="security-risk-level" className="text-xs text-zinc-500">
                调整风险等级
              </label>
              <div className="mt-2 flex gap-2">
                <select
                  id="security-risk-level"
                  value={riskLevel}
                  onChange={(event) => {
                    setRiskLevel(event.target.value as SecurityRiskLevel);
                    resetRequest();
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200"
                >
                  {Object.entries(riskLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <ActionButton
                  label="更新风险"
                  disabled={!reason.trim() || pending}
                  onClick={() => void submit("set_risk")}
                />
              </div>
            </div>

            <div>
              <p className="text-xs text-zinc-500">调整复核状态</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(reviewLabels).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setReviewStatus(value as SecurityReviewStatus);
                      resetRequest();
                    }}
                    className={
                      reviewStatus === value
                        ? "rounded-lg border border-zinc-500 bg-zinc-800 px-3 py-2 text-sm text-white"
                        : "rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-500"
                    }
                  >
                    设为{label}
                  </button>
                ))}
                <ActionButton
                  label="更新复核状态"
                  disabled={!reason.trim() || pending}
                  onClick={() => void submit("set_review")}
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="security-action-reason" className="text-xs text-zinc-500">
              操作原因
            </label>
            <input
              id="security-action-reason"
              value={reason}
              maxLength={500}
              onChange={(event) => {
                setReason(event.target.value);
                resetRequest();
              }}
              className="mt-2 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500"
            />
            <ActionButton
              label="保存内部备注"
              disabled={!reason.trim() || pending}
              onClick={() => void submit("set_note")}
              className="mt-3"
            />
          </div>

        </div>
      )}

      {message && <p className="mt-4 text-sm text-zinc-400">{message}</p>}

      <div className="mt-7 border-t border-zinc-800 pt-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-zinc-200">安全事件记录</h3>
          <span className="text-xs text-zinc-600">共 {overview.events.total} 条</span>
        </div>

        {overview.events.items.length === 0 ? (
          <p className="py-8 text-sm text-zinc-600">这个居民目前没有安全事件。</p>
        ) : (
          <div className="mt-3 divide-y divide-zinc-800/80">
            {overview.events.items.map((event) => (
              <div key={event.id} className="grid gap-2 py-4 md:grid-cols-[1fr_1fr_auto] md:items-center">
                <div>
                  <p className="text-sm text-zinc-300">{eventLabels[event.eventType]}</p>
                  <p className="mt-1 text-xs text-zinc-600">由 @{event.actorUsername || "未知管理者"}</p>
                </div>
                <p className="text-sm text-zinc-500">{event.reason}</p>
                <time dateTime={event.occurredAt} className="text-xs text-zinc-600 md:text-right">
                  {formatDate(event.occurredAt)}
                </time>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-3">
          <span className="text-xs text-zinc-600">{overview.events.page} / {totalPages}</span>
          <button
            type="button"
            aria-label="上一页"
            disabled={overview.events.page <= 1 || pending}
            onClick={() =>
              void load(overview.events.page - 1).catch(() =>
                setMessage("安全事件暂时无法读取。")
              )
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 disabled:opacity-30"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="下一页"
            disabled={overview.events.page >= totalPages || pending}
            onClick={() =>
              void load(overview.events.page + 1).catch(() =>
                setMessage("安全事件暂时无法读取。")
              )
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 disabled:opacity-30"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function SecurityShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-6 text-sm text-zinc-500">
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-600">{label}</dt>
      <dd className="mt-1 break-words text-sm text-zinc-200">{value}</dd>
    </div>
  );
}

function ActionButton({
  label,
  disabled,
  onClick,
  className = "",
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-30 ${className}`}
    >
      {label}
    </button>
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
