type Props = {
  logs: any[];
};

export default function UserAdminLogs({ logs }: Props) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
      <h2 className="text-2xl font-bold">最近管理记录</h2>

      <div className="mt-5 space-y-3">
        {logs.length === 0 && (
          <p className="text-sm text-zinc-600">暂无管理记录。</p>
        )}

        {logs.map((log) => (
          <div
            key={log.id}
            className="min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-black/30 p-4"
          >
            <p className="safe-text font-semibold text-zinc-100">
              {log.action}
            </p>

            <p className="safe-pre mt-1 text-sm text-zinc-500">
              {log.details}
            </p>

            <p className="mt-2 text-xs text-zinc-600">
              {log.created_at
                ? new Date(log.created_at).toLocaleString("zh-CN")
                : "未知时间"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}