"use client";

import { ArrowRight, ScanSearch } from "lucide-react";
import Link from "next/link";

import KeywordManager from "@/components/admin/comments/KeywordManager";
import type { SecurityOverview } from "@/lib/security/service";

type Props = {
  summary: SecurityOverview["wordDetection"];
  canManage: boolean;
  onChanged: () => Promise<void>;
};

export default function WordDetectionSection({
  summary,
  canManage,
  onChanged,
}: Props) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-400/20 bg-amber-400/10 text-amber-200">
            <ScanSearch aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-medium text-zinc-100">词语检测</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
              命中的评论只会进入人工检查，不会自动隐藏、删除或处罚居民。
            </p>
          </div>
        </div>

        <Link
          href="/admin/comments?filter=flagged"
          className="inline-flex shrink-0 items-center gap-2 text-sm text-zinc-300 transition hover:text-white"
        >
          前往评论管理
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>

      {summary.available ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Stat label="启用词语" value={summary.activeKeywords} />
            <Stat label="停用词语" value={summary.inactiveKeywords} />
            <Stat label="待人工检查" value={summary.pendingComments} />
          </div>

          <div className="mt-5 border-t border-zinc-800 pt-4">
            <p className="text-xs text-zinc-600">最近命中</p>
            {summary.recentMatches.length === 0 ? (
              <p className="py-5 text-sm text-zinc-600">目前没有等待检查的词语命中。</p>
            ) : (
              <div className="mt-3 divide-y divide-zinc-800/80">
                {summary.recentMatches.slice(0, 5).map((match) => (
                  <div
                    key={match.commentId}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-300">{match.username || "未知居民"}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {match.matchedKeywords.map((keyword) => (
                          <span
                            key={`${match.commentId}-${keyword}`}
                            className="rounded-md border border-zinc-800 bg-black px-2 py-1 text-xs text-zinc-500"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                    <time
                      dateTime={match.detectedAt}
                      className="shrink-0 text-xs text-zinc-600"
                    >
                      {formatTime(match.detectedAt)}
                    </time>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="mt-5 border-t border-zinc-800 py-5 text-sm text-zinc-500">
          词语检测统计暂时无法读取。
        </p>
      )}

      <KeywordManager
        open
        canManage={canManage}
        onClose={() => undefined}
        onChanged={onChanged}
        displayMode="embedded"
      />
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
      <span className="text-xs text-zinc-500">{label}</span>
      <strong className="text-lg font-medium text-zinc-200">{value}</strong>
    </div>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
