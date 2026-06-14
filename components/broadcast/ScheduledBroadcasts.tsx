type ScheduledBroadcast = {
  id: number;
  title: string;
  content: string;
  target_mode: string;
  message_type: string;
  scheduled_for: string;
  status: string;
  sent_at: string | null;
  sent_count: number | null;
};

type Props = {
  items: ScheduledBroadcast[];
  loading: boolean;
  cancellingId: number | null;
  onCancel: (item: ScheduledBroadcast) => void;
};

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString("zh-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTargetLabel(mode: string) {
  if (mode === "self") return "只发给自己";
  if (mode === "single") return "指定居民";
  return "所有 active 居民";
}

function getStatusStyle(status: string) {
  if (status === "scheduled") return "bg-amber-500/10 text-amber-300";
  if (status === "sent") return "bg-emerald-500/10 text-emerald-300";
  if (status === "cancelled") return "bg-zinc-700/60 text-zinc-300";
  if (status === "failed") return "bg-red-500/10 text-red-300";
  return "bg-zinc-700/60 text-zinc-300";
}

function getStatusLabel(status: string) {
  if (status === "scheduled") return "待发送";
  if (status === "sent") return "已发送";
  if (status === "cancelled") return "已取消";
  if (status === "failed") return "发送失败";
  return status;
}

export default function ScheduledBroadcasts({
  items,
  loading,
  cancellingId,
  onCancel,
}: Props) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
      <div>
        <h2 className="text-xl font-bold">信件发送记录</h2>
        <p className="mt-1 text-sm text-zinc-500">
          查看待发、已发送和已取消的预约信件。
        </p>
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-zinc-500">读取信件记录中...</p>
      ) : items.length === 0 ? (
        <p className="mt-5 text-sm text-zinc-500">目前没有预约信件记录。</p>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-zinc-800 bg-black/50 p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words font-semibold text-zinc-100">
                      {item.title}
                    </h3>

                    <span
                      className={`rounded-full px-2 py-1 text-xs ${getStatusStyle(
                        item.status
                      )}`}
                    >
                      {getStatusLabel(item.status)}
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-2 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-400">
                    {item.content}
                  </p>

                  <div className="mt-3 grid gap-1 text-xs text-zinc-500 md:grid-cols-2">
                    <p>发送对象：{getTargetLabel(item.target_mode)}</p>
                    <p>信件类型：{item.message_type}</p>
                    <p>预约时间：{formatDate(item.scheduled_for)}</p>
                    <p>发送时间：{formatDate(item.sent_at)}</p>
                    <p>发送人数：{item.sent_count ?? "—"}</p>
                    <p>状态：{getStatusLabel(item.status)}</p>
                  </div>
                </div>

                {item.status === "scheduled" && (
                  <button
                    type="button"
                    disabled={cancellingId === item.id}
                    onClick={() => onCancel(item)}
                    className="shrink-0 rounded-lg border border-red-900/70 px-3 py-2 text-xs text-red-300 transition hover:border-red-500 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {cancellingId === item.id ? "取消中..." : "取消待发"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}