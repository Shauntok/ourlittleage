type Props = {
  posts: any[];
};

export default function ContentStats({ posts }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
      <StatCard title="全部内容" value={posts.length} />

      <StatCard
        title="文章"
        value={posts.filter((post) => post.type === "article").length}
      />

      <StatCard
        title="日记"
        value={posts.filter((post) => post.type === "diary").length}
      />

      <StatCard
        title="已发布"
        value={posts.filter((post) => post.status === "published").length}
      />

      <StatCard
        title="草稿"
        value={posts.filter((post) => post.status === "draft").length}
      />

      <StatCard
        title="隐藏"
        value={posts.filter((post) => post.visibility === "hidden").length}
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

      <p className="safe-text mt-3 text-2xl font-bold text-zinc-100">
        {value}
      </p>
    </div>
  );
}