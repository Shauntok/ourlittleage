"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Crown,
  RefreshCw,
  ShieldAlert,
  X,
} from "lucide-react";

import type {
  VipAdminOverview,
  VipMembership,
  VipMembershipEvent,
} from "@/lib/vip/service";

type VipAction = "grant" | "extend" | "cancel" | "revoke";

type Props = {
  userId: string;
  username: string | null;
  currentRole: string | null;
};

const durationChoices = [7, 30, 90] as const;

export default function UserVipMembershipSection({
  userId,
  username,
  currentRole,
}: Props) {
  const [overview, setOverview] = useState<VipAdminOverview | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [action, setAction] = useState<VipAction | null>(null);
  const [durationDays, setDurationDays] = useState(30);
  const [customDuration, setCustomDuration] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [mutationRequestId, setMutationRequestId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showRevokeConfirmation, setShowRevokeConfirmation] = useState(false);

  const requestOverview = useCallback(
    async (page = 1) => {
      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(userId)}/vip?page=${page}`,
        { cache: "no-store", credentials: "same-origin" }
      );
      if (!response.ok) throw new Error("VIP data unavailable");
      const body = (await response.json()) as { overview?: VipAdminOverview };
      if (!body.overview) throw new Error("Invalid VIP response");
      return body.overview;
    },
    [userId]
  );

  const load = useCallback(
    async (page = 1) => {
      const nextOverview = await requestOverview(page);
      setOverview(nextOverview);
      setState("ready");
    },
    [requestOverview]
  );

  useEffect(() => {
    let active = true;
    requestOverview()
      .then((nextOverview) => {
        if (!active) return;
        setOverview(nextOverview);
        setState("ready");
      })
      .catch(() => {
        if (active) setState("error");
      });
    return () => {
      active = false;
    };
  }, [requestOverview]);

  const selectedDuration = customDuration
    ? Number.parseInt(customDuration, 10)
    : durationDays;
  const estimatedExpiry = useMemo(
    () => estimateExpiry(overview, action, selectedDuration),
    [action, overview, selectedDuration]
  );

  if (state === "loading") {
    return <VipShell>读取 VIP 资料中...</VipShell>;
  }

  if (state === "error" || !overview) {
    return (
      <VipShell>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span>VIP 资料暂时无法读取</span>
          <button
            type="button"
            onClick={() => {
              setState("loading");
              void load().catch(() => setState("error"));
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500"
          >
            <RefreshCw size={15} aria-hidden="true" />
            重新加载
          </button>
        </div>
      </VipShell>
    );
  }

  const membership = overview.membership;
  const isOwner = currentRole === "owner";

  async function submit(nextAction: VipAction) {
    if (!reason.trim() || pending) return;
    if (
      (nextAction === "grant" || nextAction === "extend") &&
      (!Number.isSafeInteger(selectedDuration) || selectedDuration < 1 || selectedDuration > 3650)
    ) {
      setMessage("请输入 1 至 3650 天。");
      return;
    }

    setPending(true);
    setMessage("");
    const requestId = mutationRequestId || crypto.randomUUID();
    if (!mutationRequestId) setMutationRequestId(requestId);
    try {
      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(userId)}/vip`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: nextAction,
            reason: reason.trim(),
            requestId,
            ...(nextAction === "grant" || nextAction === "extend"
              ? { durationDays: selectedDuration }
              : {}),
          }),
        }
      );
      if (!response.ok) throw new Error("VIP mutation failed");
    } catch {
      setMessage("操作没有完成，请检查当前状态后重试。");
      setPending(false);
      return;
    }

    setMessage(actionSuccessMessage(nextAction));
    setAction(null);
    setReason("");
    setMutationRequestId(null);
    setShowRevokeConfirmation(false);

    try {
      await load(overview?.history.page ?? 1);
    } catch {
      setMessage("操作已完成，但最新资料暂时无法读取，请重新加载。");
    }
    setPending(false);
  }

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Crown size={19} className="text-amber-300" aria-hidden="true" />
            <h2 className="text-2xl font-bold">VIP Membership</h2>
          </div>
          <p className="mt-1 text-sm text-zinc-500">居民会员状态与操作记录</p>
        </div>
        <p className="text-xs text-zinc-600">数据库时间 {formatDate(overview.databaseNow)}</p>
      </div>

      {!overview.flags.vipEntitlementEnabled && (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
          <ShieldAlert size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">全局 VIP 权益目前关闭</p>
            <p className="mt-1 text-xs leading-5 text-amber-200/60">
              后台仍可维护会员资料，但居民端权益不会生效。
            </p>
          </div>
        </div>
      )}

      <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="储存状态" value={membershipStatusLabel(membership)} />
        <Metric
          label="实际权益"
          value={entitlementLabel(overview.entitlement.reason, overview.entitlement.isActive)}
        />
        <Metric label="开始时间" value={membership ? formatDate(membership.startedAt) : "-"} />
        <Metric label="到期时间" value={membership ? formatDate(membership.expiresAt) : "-"} />
        <Metric label="剩余时间" value={remainingTime(membership, overview.databaseNow)} />
        <Metric
          label="到期取消"
          value={membership?.cancelAtPeriodEnd ? "是" : "否"}
        />
        <Metric label="最后更新" value={membership ? formatDate(membership.updatedAt) : "-"} />
      </dl>

      <div className="mt-7 border-t border-zinc-800 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-zinc-200">会员操作</h3>
          {!isOwner && <p className="text-xs text-zinc-500">仅 Owner 可以调整会员状态。</p>}
        </div>

        {isOwner && (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton
                label="授予"
                active={action === "grant"}
                disabled={membership?.status === "active"}
                onClick={() => {
                  setAction("grant");
                  setMutationRequestId(null);
                }}
              />
              <ActionButton
                label="延长"
                active={action === "extend"}
                disabled={membership?.status !== "active"}
                onClick={() => {
                  setAction("extend");
                  setMutationRequestId(null);
                }}
              />
              <ActionButton
                label="到期取消"
                active={action === "cancel"}
                disabled={membership?.status !== "active" || membership.cancelAtPeriodEnd}
                onClick={() => {
                  setAction("cancel");
                  setMutationRequestId(null);
                }}
              />
              <ActionButton
                label="立即撤销"
                active={action === "revoke"}
                disabled={!membership || membership.status === "revoked"}
                onClick={() => {
                  setAction("revoke");
                  setMutationRequestId(null);
                }}
              />
            </div>

            {action && (
              <div className="mt-5 max-w-2xl border-l border-zinc-700 pl-4">
                {(action === "grant" || action === "extend") && (
                  <div>
                    <p className="text-xs text-zinc-500">时长</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {durationChoices.map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => {
                            setDurationDays(days);
                            setCustomDuration("");
                            setMutationRequestId(null);
                          }}
                          className={`rounded-lg border px-3 py-2 text-sm ${
                            !customDuration && durationDays === days
                              ? "border-zinc-400 bg-zinc-800 text-white"
                              : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
                          }`}
                        >
                          {days} 天
                        </button>
                      ))}
                      <input
                        type="number"
                        min={1}
                        max={3650}
                        aria-label="自定义 VIP 天数"
                        value={customDuration}
                        onChange={(event) => {
                          setCustomDuration(event.target.value);
                          setMutationRequestId(null);
                        }}
                        placeholder="自定义天数"
                        className="w-32 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500"
                      />
                    </div>
                    {estimatedExpiry && (
                      <p className="mt-3 text-xs text-zinc-500">
                        预计到期：{formatDate(estimatedExpiry)}
                      </p>
                    )}
                  </div>
                )}

                <label className="mt-4 block text-xs text-zinc-500" htmlFor="vip-action-reason">
                  操作原因
                </label>
                <textarea
                  id="vip-action-reason"
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                    setMutationRequestId(null);
                  }}
                  maxLength={500}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500"
                />

                <button
                  type="button"
                  disabled={!reason.trim() || pending}
                  onClick={() => {
                    if (action === "revoke") setShowRevokeConfirmation(true);
                    else void submit(action);
                  }}
                  className="mt-3 rounded-lg border border-zinc-600 bg-zinc-100 px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {pending ? "处理中..." : actionSubmitLabel(action)}
                </button>
              </div>
            )}
          </>
        )}

        {message && <p className="mt-4 text-sm text-zinc-400">{message}</p>}
      </div>

      <History
        overview={overview}
        onPage={(page) => void load(page).catch(() => setMessage("历史记录暂时无法读取。"))}
      />

      {showRevokeConfirmation && membership && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="确认立即撤销 VIP"
            className="w-full max-w-md rounded-lg border border-rose-900/60 bg-zinc-950 p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">确认立即撤销 VIP</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  居民 @{username || "未设置用户名"} 的会员会立即失效。
                </p>
              </div>
              <button
                type="button"
                title="关闭"
                aria-label="关闭"
                onClick={() => setShowRevokeConfirmation(false)}
                className="rounded-lg border border-zinc-800 p-2 text-zinc-400"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              <ConfirmRow label="当前到期" value={formatDate(membership.expiresAt)} />
              <ConfirmRow label="执行动作" value="立即撤销" />
              <ConfirmRow label="原因" value={reason.trim()} />
            </dl>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRevokeConfirmation(false)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300"
              >
                返回
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => void submit("revoke")}
                className="rounded-lg border border-rose-700 bg-rose-950/60 px-4 py-2 text-sm text-rose-100"
              >
                确认撤销
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function VipShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6 text-sm text-zinc-500">
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
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-30 ${
        active
          ? "border-zinc-400 bg-zinc-800 text-white"
          : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
      }`}
    >
      {label}
    </button>
  );
}

function History({
  overview,
  onPage,
}: {
  overview: VipAdminOverview;
  onPage: (page: number) => void;
}) {
  const { items, page, pageSize, total } = overview.history;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mt-7 border-t border-zinc-800 pt-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-zinc-200">最近记录</h3>
        <span className="text-xs text-zinc-600">共 {total} 条</span>
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">目前没有 VIP 操作记录。</p>
      ) : (
        <div className="mt-4 divide-y divide-zinc-800">
          {items.map((event) => <HistoryRow key={event.id} event={event} />)}
        </div>
      )}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-3 text-xs text-zinc-500">
          <button
            type="button"
            title="上一页"
            aria-label="VIP 历史上一页"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            className="rounded-lg border border-zinc-800 p-2 disabled:opacity-30"
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <span>第 {page} / {totalPages} 页</span>
          <button
            type="button"
            title="下一页"
            aria-label="VIP 历史下一页"
            disabled={page >= totalPages}
            onClick={() => onPage(page + 1)}
            className="rounded-lg border border-zinc-800 p-2 disabled:opacity-30"
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

function HistoryRow({ event }: { event: VipMembershipEvent }) {
  return (
    <div className="grid gap-2 py-4 text-sm md:grid-cols-[130px_1fr_auto] md:items-start">
      <div className="flex items-center gap-2 text-zinc-300">
        <CalendarClock size={15} className="text-zinc-600" aria-hidden="true" />
        {eventTypeLabel(event.eventType)}
      </div>
      <div>
        <p className="text-zinc-300">{event.reason}</p>
        <p className="mt-1 text-xs text-zinc-600">
          {stateTransitionLabel(event.previousState, event.newState)}
        </p>
      </div>
      <div className="text-left text-xs text-zinc-600 md:text-right">
        <p>@{event.actorUsername || "未知管理员"}</p>
        <p className="mt-1">{formatDate(event.createdAt)}</p>
      </div>
    </div>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-3">
      <dt className="text-zinc-600">{label}</dt>
      <dd className="break-words text-zinc-300">{value}</dd>
    </div>
  );
}

function membershipStatusLabel(membership: VipMembership | null) {
  if (!membership) return "无记录";
  if (membership.status === "active") return "生效中";
  if (membership.status === "cancelled") return "已取消";
  return "已撤销";
}

function entitlementLabel(reason: string, isActive: boolean) {
  if (isActive) return "已生效";
  if (reason === "feature_disabled") return "功能未启用";
  if (reason === "expired") return "已到期";
  if (reason === "not_started") return "尚未开始";
  if (reason === "account_restricted") return "账号受限";
  if (reason === "membership_missing") return "无会员记录";
  if (reason === "inactive_status") return "未生效";
  return "暂时无法判断";
}

function remainingTime(membership: VipMembership | null, databaseNow: string) {
  if (!membership) return "-";
  const milliseconds = Date.parse(membership.expiresAt) - Date.parse(databaseNow);
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return "已到期";
  const days = Math.ceil(milliseconds / 86_400_000);
  return `${days.toLocaleString("zh-CN")} 天`;
}

function estimateExpiry(
  overview: VipAdminOverview | null,
  action: VipAction | null,
  durationDays: number
) {
  if (
    !overview ||
    (action !== "grant" && action !== "extend") ||
    !Number.isSafeInteger(durationDays) ||
    durationDays < 1 ||
    durationDays > 3650
  ) {
    return null;
  }

  const now = Date.parse(overview.databaseNow);
  const currentExpiry = overview.membership
    ? Date.parse(overview.membership.expiresAt)
    : Number.NaN;
  const base = action === "extend" && currentExpiry > now ? currentExpiry : now;
  return new Date(base + durationDays * 86_400_000).toISOString();
}

function eventTypeLabel(eventType: string) {
  if (eventType === "grant") return "授予";
  if (eventType === "extend") return "延长";
  if (eventType === "cancel") return "到期取消";
  return "立即撤销";
}

function stateTransitionLabel(
  previousState: VipMembership | null,
  newState: VipMembership | null
) {
  const previous = membershipStateSummary(previousState);
  const next = newState ? membershipStateSummary(newState) : "已更新";
  return `${previous} → ${next}`;
}

function membershipStateSummary(membership: VipMembership | null) {
  if (!membership) return "无记录";
  const cancellation = membership.cancelAtPeriodEnd ? "，到期取消" : "";
  return `${membershipStatusLabel(membership)}，至 ${formatDate(membership.expiresAt)}${cancellation}`;
}

function actionSubmitLabel(action: VipAction) {
  if (action === "grant") return "确认授予";
  if (action === "extend") return "确认延长";
  if (action === "cancel") return "确认到期取消";
  return "继续撤销";
}

function actionSuccessMessage(action: VipAction) {
  if (action === "grant") return "VIP 已授予。";
  if (action === "extend") return "VIP 到期时间已延长。";
  if (action === "cancel") return "已设为到期后取消。";
  return "VIP 已立即撤销。";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
