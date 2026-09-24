"use client";

import { ChevronLeft, ChevronRight, Network, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type {
  FirewallRequest,
  PagedFirewallRequests,
} from "@/lib/security/firewall";
import FirewallRequestForm from "./FirewallRequestForm";

type Props = { currentRole: string | null };
type Filter = "waiting" | "active" | "ended";
type PendingAction = {
  request: FirewallRequest;
  action: "confirm_external" | "cancel" | "mark_failed" | "complete_observation";
} | null;

const filterStatus: Record<Filter, string> = {
  waiting: "awaiting_external_publish",
  active: "active",
  ended: "ended",
};

export default function TrafficProtectionSection({ currentRole }: Props) {
  const [result, setResult] = useState<PagedFirewallRequests | null>(null);
  const [filter, setFilter] = useState<Filter>("waiting");
  const [page, setPage] = useState(1);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [transitionReason, setTransitionReason] = useState("");
  const [externalRuleId, setExternalRuleId] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  const isOwner = currentRole === "owner";

  const load = useCallback(async (nextPage: number, nextFilter: Filter) => {
    setState("loading");
    try {
      const response = await fetch(
        `/api/admin/security/firewall?page=${nextPage}&status=${filterStatus[nextFilter]}`,
        { cache: "no-store", credentials: "same-origin" }
      );
      if (!response.ok) throw new Error("Firewall requests unavailable");
      const payload = (await response.json()) as { requests?: PagedFirewallRequests };
      if (!payload.requests) throw new Error("Firewall response missing");
      setResult(payload.requests);
      setPage(nextPage);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(1, filter);
  }, [filter, load]);

  const visibleItems = useMemo(() => result?.items || [], [result]);

  const activeBlocks = useMemo(
    () =>
      (result?.items || []).filter(
        (request) =>
          request.status === "active" &&
          (request.requestType === "block_ip" || request.requestType === "block_cidr")
      ),
    [result]
  );

  const totalPages = Math.max(1, Math.ceil((result?.total || 0) / (result?.pageSize || 20)));

  async function runTransition() {
    if (!pendingAction || !transitionReason.trim()) return;
    setTransitioning(true);
    try {
      const response = await fetch(
        `/api/admin/security/firewall/${pendingAction.request.id}`,
        {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: pendingAction.action,
            externalRuleId:
              pendingAction.action === "confirm_external"
                ? externalRuleId.trim()
                : undefined,
            reason: transitionReason.trim(),
            requestId: crypto.randomUUID(),
          }),
        }
      );
      if (!response.ok) throw new Error("transition failed");
      setPendingAction(null);
      setTransitionReason("");
      setExternalRuleId("");
      await load(page, filter);
    } catch {
      setState("error");
      setPendingAction(null);
    } finally {
      setTransitioning(false);
    }
  }

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-black text-zinc-300">
            <Network aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-medium text-zinc-100">流量防护</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Vercel 是实际规则与实时流量的依据
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              本区只准备与审计人工操作，不会自动封锁居民或网络。
            </p>
          </div>
        </div>
        <span className="text-xs text-zinc-500">Owner 人工确认</span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="防护单状态">
        {([
          ["waiting", "等待执行"],
          ["active", "生效中"],
          ["ended", "已结束"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setFilter(value);
              setPage(1);
            }}
            className={
              filter === value
                ? "rounded-md border border-zinc-500 bg-zinc-100 px-3 py-2 text-sm text-black"
                : "rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-500 hover:text-zinc-200"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {state === "loading" && !result ? (
        <p className="py-10 text-sm text-zinc-600">正在读取流量防护单...</p>
      ) : state === "error" ? (
        <div className="py-8">
          <p className="text-sm text-zinc-500">流量防护数据暂时无法读取。</p>
          <button
            type="button"
            onClick={() => void load(page, filter)}
            className="mt-3 inline-flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300"
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            重新加载流量防护
          </button>
        </div>
      ) : visibleItems.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-600">这个状态下还没有流量防护单。</p>
      ) : (
        <div className="mt-5 divide-y divide-zinc-800/80 border-y border-zinc-800">
          {visibleItems.map((request) => (
            <article
              key={request.id}
              className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-center"
            >
              <div className="min-w-0">
                <p className="text-sm text-zinc-200">{requestTypeLabel(request)}</p>
                <p className="mt-1 break-all text-xs text-zinc-500">
                  {request.targetNetwork || request.targetMasked || request.pathPattern || "无网络目标"}
                </p>
                {request.hostnameScope && (
                  <p className="mt-1 text-xs text-zinc-600">{request.hostnameScope}</p>
                )}
              </div>
              <div className="min-w-0">
                <p className={statusTone(request.status)}>{statusLabel(request.status)}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-600">{request.reason}</p>
              </div>
              {isOwner && request.status === "awaiting_external_publish" && (
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={() => setPendingAction({ request, action: "confirm_external" })}
                    className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-200"
                  >
                    确认已发布
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingAction({ request, action: "cancel" })}
                    className="rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-500"
                  >
                    取消防护单
                  </button>
                </div>
              )}
              {isOwner &&
                request.status === "active" &&
                request.requestType === "rate_limit_observation" && (
                  <button
                    type="button"
                    onClick={() => setPendingAction({ request, action: "complete_observation" })}
                    className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-200 lg:justify-self-end"
                  >
                    完成观察
                  </button>
                )}
            </article>
          ))}
        </div>
      )}

      {result && state !== "error" && (
        <div className="mt-4 flex items-center justify-end gap-3">
          <span className="text-xs text-zinc-600">{page} / {totalPages}</span>
          <button
            type="button"
            aria-label="防护单上一页"
            disabled={page <= 1 || state === "loading"}
            onClick={() => void load(page - 1, filter)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 text-zinc-400 disabled:opacity-30"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="防护单下一页"
            disabled={page >= totalPages || state === "loading"}
            onClick={() => void load(page + 1, filter)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 text-zinc-400 disabled:opacity-30"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      )}

      {isOwner && (
        <FirewallRequestForm
          activeBlocks={activeBlocks}
          onCreated={() => load(1, filter)}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction ? actionTitle(pendingAction.action) : "确认操作"}
        description="这一步只确认后台记录，实际 Vercel 规则必须已经由 Owner 人工完成。"
        confirmText="确认记录"
        loading={transitioning}
        danger={pendingAction?.action === "cancel" || pendingAction?.action === "mark_failed"}
        onConfirm={() => void runTransition()}
        onCancel={() => setPendingAction(null)}
      >
        <div className="space-y-3">
          {pendingAction?.action === "confirm_external" && (
            <label className="block text-xs text-zinc-500">
              <span className="mb-2 block">Vercel 规则 ID</span>
              <input
                aria-label="Vercel 规则 ID"
                value={externalRuleId}
                onChange={(event) => setExternalRuleId(event.target.value)}
                className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200"
              />
            </label>
          )}
          <label className="block text-xs text-zinc-500">
            <span className="mb-2 block">确认原因</span>
            <textarea
              aria-label="确认原因"
              value={transitionReason}
              onChange={(event) => setTransitionReason(event.target.value)}
              maxLength={500}
              rows={3}
              className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200"
            />
          </label>
        </div>
      </ConfirmDialog>
    </section>
  );
}

function requestTypeLabel(request: FirewallRequest) {
  if (request.requestType === "block_ip") return "单一 IP 防护";
  if (request.requestType === "block_cidr") return "CIDR 范围防护";
  if (request.requestType === "unblock") return "解除现有防护";
  return "流量限制观察";
}

function statusLabel(status: FirewallRequest["status"]) {
  return {
    awaiting_external_publish: "等待 Owner 外部执行",
    active: "已人工确认生效",
    resolved: "已结束",
    cancelled: "已取消",
    failed: "执行失败",
  }[status];
}

function statusTone(status: FirewallRequest["status"]) {
  if (status === "failed") return "text-xs text-red-300";
  if (status === "awaiting_external_publish") return "text-xs text-amber-300";
  return "text-xs text-zinc-400";
}

function actionTitle(action: NonNullable<PendingAction>["action"]) {
  if (action === "confirm_external") return "确认外部规则已发布";
  if (action === "complete_observation") return "完成流量观察";
  if (action === "mark_failed") return "标记执行失败";
  return "取消这份防护单";
}
