type ContentFilter = "all" | "article" | "diary";
type StatusFilter = "all" | "published" | "draft";
type VisibilityFilter =
  | "all"
  | "public"
  | "hidden"
  | "private"
  | "unlisted";

type Props = {
  posts: any[];
  filter: ContentFilter;
  setFilter: (value: ContentFilter) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  visibilityFilter: VisibilityFilter;
  setVisibilityFilter: (value: VisibilityFilter) => void;
};

export default function ContentFilters({
  posts,
  filter,
  setFilter,
  statusFilter,
  setStatusFilter,
  visibilityFilter,
  setVisibilityFilter,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {[
          { key: "all", label: "全部", count: posts.length },
          {
            key: "article",
            label: "文章",
            count: posts.filter((post) => post.type === "article").length,
          },
          {
            key: "diary",
            label: "日记",
            count: posts.filter((post) => post.type === "diary").length,
          },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key as ContentFilter)}
            className={
              filter === item.key
                ? "rounded-full border border-white bg-white px-5 py-3 text-sm font-semibold text-black transition"
                : "rounded-full border border-zinc-800 bg-zinc-950 px-5 py-3 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-white"
            }
          >
            {item.label}
            <span className="ml-2 text-xs opacity-60">{item.count}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {[
          { key: "all", label: "全部状态" },
          { key: "published", label: "已发布" },
          { key: "draft", label: "草稿" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setStatusFilter(item.key as StatusFilter)}
            className={
              statusFilter === item.key
                ? "rounded-full border border-white bg-white px-5 py-3 text-sm font-semibold text-black transition"
                : "rounded-full border border-zinc-800 bg-zinc-950 px-5 py-3 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-white"
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {[
          { key: "all", label: "全部可见性" },
          { key: "public", label: "公开" },
          { key: "hidden", label: "隐藏" },
          { key: "private", label: "私密" },
          { key: "unlisted", label: "链接可见" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() =>
              setVisibilityFilter(item.key as VisibilityFilter)
            }
            className={
              visibilityFilter === item.key
                ? "rounded-full border border-white bg-white px-5 py-3 text-sm font-semibold text-black transition"
                : "rounded-full border border-zinc-800 bg-zinc-950 px-5 py-3 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-white"
            }
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}