import type { FilterType } from "./types";

type Props = {
  filter: FilterType;
  setFilter: (filter: FilterType) => void;
  sortMode: "newest" | "oldest";
  setSortMode: (mode: "newest" | "oldest") => void;
  counts: Record<FilterType, number>;
};

export default function ReportFilters({
  filter,
  setFilter,
  sortMode,
  setSortMode,
  counts,
}: Props) {
  const filterTabs = [
    { key: "active", label: "待处理" },
    { key: "all", label: "全部" },
    { key: "pending", label: "未审核" },
    { key: "reviewed", label: "审核中" },
    { key: "resolved", label: "已解决" },
    { key: "rejected", label: "已驳回" },
    { key: "malicious", label: "恶意" },
  ] as const;

  return (
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
      <div className="flex flex-wrap gap-3">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              filter === tab.key
                ? "border-white bg-white text-black"
                : "border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-white hover:text-white"
            }`}
          >
            {tab.label}{" "}
            <span
              className={
                filter === tab.key ? "text-black/60" : "text-zinc-600"
              }
            >
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSortMode("newest")}
          className={`rounded-full border px-4 py-2 text-sm transition ${
            sortMode === "newest"
              ? "border-white bg-white text-black"
              : "border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-white hover:text-white"
          }`}
        >
          最新优先
        </button>

        <button
          type="button"
          onClick={() => setSortMode("oldest")}
          className={`rounded-full border px-4 py-2 text-sm transition ${
            sortMode === "oldest"
              ? "border-white bg-white text-black"
              : "border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-white hover:text-white"
          }`}
        >
          最旧优先
        </button>
      </div>
    </div>
  );
}