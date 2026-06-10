import Link from "next/link";
import type { TargetInfo } from "./types";

type Props = {
  report: any;
  target?: TargetInfo;
  targetReportCount: number;
  onUpdateStatus: (reportId: string, status: string) => void;
  onHidePost: (postId: string, reportId: string) => void;
  onHideComment: (commentId: string, reportId: string) => void;
  onUpdateUserStatus: (
    userId: string,
    reportId: string,
    status: "warned" | "muted" | "banned"
  ) => void;
  onMarkMalicious: (reportId: string) => void;
};

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

export default function ReportCard({
  report,
  target,
  targetReportCount,
  onUpdateStatus,
  onHidePost,
  onHideComment,
  onUpdateUserStatus,
  onMarkMalicious,
}: Props) {
  const isClosed =
    report.status === "resolved" || report.status === "rejected";

  return (
    <div className="min-w-0 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
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
              <p className="safe-pre mt-1 text-zinc-300">{report.details}</p>
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
              onClick={() => onUpdateStatus(report.id, "reviewed")}
              className="rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300 transition hover:bg-blue-500/20"
            >
              标记审核
            </button>

            {target?.canHidePost && (
              <button
                onClick={() => onHidePost(report.target_id, report.id)}
                className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300 transition hover:bg-yellow-500/20"
              >
                隐藏内容
              </button>
            )}

            {target?.canHideComment && (
              <button
                onClick={() => onHideComment(report.target_id, report.id)}
                className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300 transition hover:bg-yellow-500/20"
              >
                隐藏评论
              </button>
            )}

            {target?.authorId && (
              <>
                <button
                  onClick={() =>
                    onUpdateUserStatus(target.authorId!, report.id, "warned")
                  }
                  className="rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm text-orange-300 transition hover:bg-orange-500/20"
                >
                  警告用户
                </button>

                <button
                  onClick={() =>
                    onUpdateUserStatus(target.authorId!, report.id, "muted")
                  }
                  className="rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-300 transition hover:bg-purple-500/20"
                >
                  禁言用户
                </button>

                <button
                  onClick={() =>
                    onUpdateUserStatus(target.authorId!, report.id, "banned")
                  }
                  className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/20"
                >
                  封禁用户
                </button>
              </>
            )}

            <button
              onClick={() => onUpdateStatus(report.id, "resolved")}
              className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-300 transition hover:bg-green-500/20"
            >
              已解决
            </button>

            <button
              onClick={() => onUpdateStatus(report.id, "rejected")}
              className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
            >
              驳回
            </button>

            <button
              onClick={() => onMarkMalicious(report.id)}
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