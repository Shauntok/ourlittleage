"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

import { restorePost } from "@/app/actions/trash";
import { getTrashTiming } from "@/lib/posts/trash";
import type { TrashPost } from "@/lib/server/postTrash";

function excerpt(item: TrashPost) {
  if (item.title?.trim()) return item.title.trim();

  const text = (item.content || "")
    .replace(/!\[[^\]]*\]\(.*?\)/g, "")
    .replace(/[#>*_`-]/g, "")
    .trim();

  return text.slice(0, 72) || (item.type === "diary" ? "未命名日记" : "未命名文章");
}

function typeLabel(item: TrashPost) {
  const type = item.type === "diary" ? "日记" : "文章";
  const status = item.status === "draft" ? "草稿" : "已发布";
  return `${type} · ${status}`;
}

export default function TrashList({
  items,
  serverNow,
}: {
  items: TrashPost[];
  serverNow?: string;
}) {
  const router = useRouter();
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const now = serverNow ? new Date(serverNow) : new Date();

  async function restore(item: TrashPost) {
    setRestoringId(item.id);
    setMessage("");

    const result = await restorePost(item.id);

    if (!result.ok) {
      setMessage(result.error);
      setRestoringId(null);
      return;
    }

    router.refresh();
    setRestoringId(null);
  }

  if (items.length === 0) {
    return (
      <section className="border-t border-white/10 py-20 text-center">
        <h2 className="text-2xl font-light text-white/75">垃圾桶现在是空的。</h2>
        <p className="mt-4 text-sm leading-7 text-white/35">
          被删除的内容会在这里保留 15 天。
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3" aria-label="已删除的内容">
      {message && (
        <p role="alert" className="border-y border-rose-300/20 py-3 text-sm text-rose-100/80">
          {message}
        </p>
      )}

      {items.map((item) => {
        const timing = getTrashTiming(item.deleted_at, now);
        const contentLabel = item.type === "diary" ? "日记" : "文章";

        return (
          <article
            key={item.id}
            className="min-w-0 border-b border-white/10 py-6 first:border-t sm:py-7"
          >
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs text-white/35">{typeLabel(item)}</p>
                <h2 className="mt-2 break-words text-xl font-light text-white/85 sm:text-2xl">
                  {excerpt(item)}
                </h2>
                <div className="mt-3 space-y-1 text-xs leading-6 text-white/30">
                  <p>删除于：{new Date(item.deleted_at).toLocaleString("zh-CN")}</p>
                  <p>
                    {timing.remainingDays > 0
                      ? `将在 ${timing.remainingDays} 天后永久删除`
                      : "即将永久删除"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => restore(item)}
                disabled={restoringId === item.id}
                aria-label={`恢复这篇${contentLabel}`}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-stretch rounded-full border border-white/15 px-5 text-sm text-white/65 transition hover:border-white/30 hover:text-white disabled:cursor-wait disabled:opacity-45 sm:self-center"
              >
                <RotateCcw aria-hidden="true" size={16} />
                {restoringId === item.id ? "正在恢复" : "恢复"}
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
