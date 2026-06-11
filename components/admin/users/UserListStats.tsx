type Props = {
  profiles: any[];
};

export default function UserListStats({ profiles }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-5">
      <StatCard title="总居民" value={profiles.length} />

      <StatCard
        title="正常"
        value={
          profiles.filter((p) => (p.status || "active") === "active").length
        }
      />

      <StatCard
        title="观察"
        value={profiles.filter((p) => p.status === "warned").length}
      />

      <StatCard
        title="禁言"
        value={profiles.filter((p) => p.status === "muted").length}
      />

      <StatCard
        title="封禁"
        value={profiles.filter((p) => p.status === "banned").length}
      />
    </div>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-5">
      <p className="text-sm text-zinc-500">{title}</p>

      <p className="safe-text mt-3 text-2xl font-bold">{value}</p>
    </div>
  );
}