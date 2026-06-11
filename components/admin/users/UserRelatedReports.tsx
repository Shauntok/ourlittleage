import Link from "next/link";

type Props = {
  reports: any[];
};

export default function UserRelatedReports({ reports }: Props) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
      <h2 className="text-2xl font-bold">相关举报记录</h2>

      <div className="mt-5 space-y-3">
        {reports.length === 0 && (
          <p className="text-sm text-zinc-600">暂无相关举报记录。</p>
        )}

        {reports.map((report) => (
          <Link
            key={report.id}
            href="/admin/reports"
            className="block min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-black/30 p-4 transition hover:border-zinc-500"
          >
            <p className="safe-text font-semibold text-red-100">
              🚩 {report.reason || "没有填写原因"}
            </p>

            {report.details && (
              <p className="safe-pre mt-2 text-sm leading-7 text-zinc-400">
                {report.details}
              </p>
            )}

            <p className="mt-2 text-xs text-zinc-600">
              举报人：{report.profiles?.username || "未知居民"} · 目标：
              {report.target_type || "未知"} ·{" "}
              {report.created_at
                ? new Date(report.created_at).toLocaleString("zh-CN")
                : "未知时间"}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}