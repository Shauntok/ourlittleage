type Props = {
  badges: any[];
};

export default function UserBadges({ badges }: Props) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
      <p className="text-sm text-zinc-500">已拥有徽章</p>

      <div className="mt-4 flex flex-wrap gap-3">
        {badges.length === 0 && (
          <p className="text-sm text-zinc-600">暂无徽章</p>
        )}

        {badges.map((item: any) => {
          const badge = item.badges;
          const assigner = Array.isArray(item.assigner)
            ? item.assigner[0]
            : item.assigner;

          if (!badge) return null;

          return (
            <div
              key={item.id}
              className="safe-text rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm"
            >
              🎖️ {badge.name}
              {assigner?.username ? ` · ${assigner.username}` : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}