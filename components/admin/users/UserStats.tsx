type Props = {
  profile: any;
  stats: {
    articleTotal: number;
    diaryTotal: number;
    commentTotal: number;
    reportTotal: number;
  };
  badgeTotal: number;
  formatDecimal: (value: any) => string;
};

export default function UserStats({
  profile,
  stats,
  badgeTotal,
  formatDecimal,
}: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
      <StatCard title="等级" value={`Lv${profile.level || 1}`} />
      <StatCard title="留下的光" value={formatDecimal(profile.exp)} />
      <StatCard title="社区信任" value={formatDecimal(profile.trust_score)} />
      <StatCard title="文章" value={stats.articleTotal} />
      <StatCard title="日记" value={stats.diaryTotal} />
      <StatCard title="评论" value={stats.commentTotal} />
      <StatCard title="举报" value={stats.reportTotal} />
      <StatCard title="徽章" value={badgeTotal} />
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