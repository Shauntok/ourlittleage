"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  RefreshCw,
  Repeat2,
  UserRoundPlus,
  Users,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import type {
  AdminRelationshipItem,
  AdminRelationshipPage,
  RelationshipListKind,
  RelationshipSummary,
} from "@/lib/relationships/service";

const PAGE_SIZE = 20;

const metricDefinitions: Array<{
  kind: RelationshipListKind;
  label: string;
  count: keyof Pick<
    RelationshipSummary,
    | "followersCount"
    | "followingCount"
    | "mutualCount"
    | "pendingReceivedCount"
    | "pendingSentCount"
  >;
  icon: typeof Users;
}> = [
  { kind: "following", label: "关注中", count: "followingCount", icon: UserRoundPlus },
  { kind: "followers", label: "关注者", count: "followersCount", icon: Users },
  { kind: "mutual", label: "互相关注", count: "mutualCount", icon: Repeat2 },
  { kind: "pending_received", label: "收到的申请", count: "pendingReceivedCount", icon: Clock3 },
  { kind: "pending_sent", label: "发出的申请", count: "pendingSentCount", icon: Clock3 },
];

type LoadState = "loading" | "ready" | "error";

export default function UserRelationshipSection({ userId }: { userId: string }) {
  const [summary, setSummary] = useState<RelationshipSummary | null>(null);
  const [summaryState, setSummaryState] = useState<LoadState>("loading");
  const [activeKind, setActiveKind] = useState<RelationshipListKind | null>(null);
  const [detail, setDetail] = useState<AdminRelationshipPage | null>(null);
  const [detailState, setDetailState] = useState<LoadState>("ready");
  const detailRequestId = useRef(0);

  const request = useCallback(
    async (suffix = "") => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Admin session unavailable");

      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(userId)}/relationships${suffix}`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        }
      );
      if (!response.ok) throw new Error("Relationship data unavailable");
      return response.json() as Promise<unknown>;
    },
    [userId]
  );

  const loadSummary = useCallback(async () => {
    try {
      const body = await request();
      setSummary(readSummary(body));
      setSummaryState("ready");
    } catch {
      setSummaryState("error");
    }
  }, [request]);

  const loadDetail = useCallback(
    async (kind: RelationshipListKind, page: number) => {
      const requestId = ++detailRequestId.current;
      setActiveKind(kind);
      setDetailState("loading");
      try {
        const body = await request(`?kind=${kind}&page=${page}`);
        if (requestId !== detailRequestId.current) return;
        setDetail(readDetail(body));
        setDetailState("ready");
      } catch {
        if (requestId !== detailRequestId.current) return;
        setDetail(null);
        setDetailState("error");
      }
    },
    [request]
  );

  useEffect(() => {
    let active = true;

    request()
      .then((body) => {
        if (!active) return;
        setSummary(readSummary(body));
        setSummaryState("ready");
      })
      .catch(() => {
        if (active) setSummaryState("error");
      });

    return () => {
      active = false;
    };
  }, [request]);

  if (summaryState === "loading") {
    return <RelationshipShell>读取关系数据中...</RelationshipShell>;
  }

  if (summaryState === "error" || !summary) {
    return (
      <RelationshipShell>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span>关系数据暂时无法读取</span>
          <button
            type="button"
            onClick={() => {
              setSummaryState("loading");
              void loadSummary();
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500"
          >
            <RefreshCw size={15} aria-hidden="true" />
            重新加载
          </button>
        </div>
      </RelationshipShell>
    );
  }

  const activeDefinition = metricDefinitions.find(({ kind }) => kind === activeKind);
  const totalPages = detail ? Math.max(1, Math.ceil(detail.total / PAGE_SIZE)) : 1;

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">关系</h2>
          <p className="mt-1 text-sm text-zinc-500">居民当前的关注状态</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">关注方式</p>
          <p className="mt-1 text-sm text-zinc-200">
            {summary.followMode === "open" ? "任何居民可关注" : "需要本人批准"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metricDefinitions.map(({ kind, label, count, icon: Icon }) => (
          <button
            key={kind}
            type="button"
            aria-label={`${label} ${summary[count]}`}
            onClick={() => void loadDetail(kind, 1)}
            className={`rounded-lg border p-4 text-left transition-colors ${
              activeKind === kind
                ? "border-zinc-500 bg-zinc-900"
                : "border-zinc-800 bg-black/30 hover:border-zinc-600"
            }`}
          >
            <span className="flex items-center justify-between gap-3 text-xs text-zinc-500">
              {label}
              <Icon size={16} aria-hidden="true" />
            </span>
            <span className="mt-3 block text-2xl font-semibold text-zinc-100">
              {summary[count].toLocaleString("zh-CN")}
            </span>
          </button>
        ))}
      </div>

      {activeKind && (
        <div className="mt-6 border-t border-zinc-800 pt-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-zinc-200">{activeDefinition?.label}</h3>
            {detail && <span className="text-xs text-zinc-500">共 {detail.total} 位</span>}
          </div>

          {detailState === "loading" && <p className="mt-4 text-sm text-zinc-500">读取明细中...</p>}
          {detailState === "error" && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500">
              <span>这部分关系明细暂时无法读取</span>
              <button
                type="button"
                onClick={() => void loadDetail(activeKind, detail?.page || 1)}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-200 hover:border-zinc-500"
              >
                重新加载
              </button>
            </div>
          )}
          {detailState === "ready" && detail && (
            <>
              {detail.items.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-500">{emptyMessage(activeKind)}</p>
              ) : (
                <div className="mt-4 divide-y divide-zinc-800">
                  {detail.items.map((item) => (
                    <RelationshipRow key={item.relationshipId} item={item} />
                  ))}
                </div>
              )}

              {detail.total > PAGE_SIZE && (
                <div className="mt-4 flex items-center justify-end gap-3 text-xs text-zinc-500">
                  <button
                    type="button"
                    title="上一页"
                    aria-label="上一页"
                    disabled={detail.page <= 1}
                    onClick={() => void loadDetail(activeKind, detail.page - 1)}
                    className="rounded-lg border border-zinc-800 p-2 text-zinc-300 disabled:opacity-30"
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                  </button>
                  <span>第 {detail.page} / {totalPages} 页</span>
                  <button
                    type="button"
                    title="下一页"
                    aria-label="下一页"
                    disabled={detail.page >= totalPages}
                    onClick={() => void loadDetail(activeKind, detail.page + 1)}
                    className="rounded-lg border border-zinc-800 p-2 text-zinc-300 disabled:opacity-30"
                  >
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function RelationshipShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6 text-sm text-zinc-500">
      {children}
    </section>
  );
}

function RelationshipRow({ item }: { item: AdminRelationshipItem }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span
        role="img"
        aria-label={item.username ? `${item.username} 的头像` : "居民头像"}
        className="h-10 w-10 shrink-0 rounded-full border border-zinc-800 bg-zinc-900 bg-cover bg-center"
        style={item.avatarUrl ? { backgroundImage: `url(${JSON.stringify(item.avatarUrl).slice(1, -1)})` } : undefined}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-zinc-200">@{item.username || "未设置用户名"}</p>
        <p className="safe-text mt-1 break-all text-xs text-zinc-600">{item.residentId}</p>
      </div>
      <div className="shrink-0 text-right text-xs text-zinc-500">
        <p>{item.status === "accepted" ? "已关注" : "等待批准"}</p>
        <p className="mt-1">{new Date(item.relationshipAt).toLocaleString("zh-CN")}</p>
      </div>
    </div>
  );
}

function emptyMessage(kind: RelationshipListKind) {
  if (kind === "followers") return "这个居民目前还没有关注者。";
  if (kind === "following") return "这个居民目前还没有关注任何人。";
  if (kind === "mutual") return "这个居民目前没有互相关注的人。";
  return "目前没有等待处理的关注申请。";
}

function readSummary(body: unknown): RelationshipSummary {
  const value = readObject(body, "summary");
  const followMode = value.followMode;
  if (followMode !== "open" && followMode !== "approval_required") throw new Error("Invalid summary");
  return {
    followersCount: readCount(value.followersCount),
    followingCount: readCount(value.followingCount),
    mutualCount: readCount(value.mutualCount),
    pendingReceivedCount: readCount(value.pendingReceivedCount),
    pendingSentCount: readCount(value.pendingSentCount),
    followMode,
  };
}

function readDetail(body: unknown): AdminRelationshipPage {
  const value = readObject(body, "relationships");
  if (!Array.isArray(value.items)) throw new Error("Invalid details");
  return {
    items: value.items as AdminRelationshipItem[],
    total: readCount(value.total),
    page: readCount(value.page, 1),
    pageSize: readCount(value.pageSize, 1),
  };
}

function readObject(body: unknown, key: string): Record<string, unknown> {
  if (!body || typeof body !== "object") throw new Error("Invalid response");
  const value = (body as Record<string, unknown>)[key];
  if (!value || typeof value !== "object") throw new Error("Invalid response");
  return value as Record<string, unknown>;
}

function readCount(value: unknown, minimum = 0) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
    throw new Error("Invalid count");
  }
  return value;
}
