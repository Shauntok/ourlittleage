type TargetMode = "self" | "single" | "all";

type Props = {
  profiles: any[];
  search: string;
  setSearch: (value: string) => void;
  targetMode: TargetMode;
  setTargetMode: (value: TargetMode) => void;
  targetUserId: string;
  setTargetUserId: (value: string) => void;
};

export default function BroadcastTargetSelector({
  profiles,
  search,
  setSearch,
  targetMode,
  setTargetMode,
  targetUserId,
  setTargetUserId,
}: Props) {
  const filteredProfiles = profiles.filter((profile) => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) return true;

    return (
      profile.username?.toLowerCase().includes(keyword) ||
      profile.id?.toLowerCase().includes(keyword)
    );
  });

  return (
    <>
      <section className="space-y-3">
        <p className="text-sm text-zinc-400">发送对象</p>

        <div className="flex flex-wrap gap-3">
          {[
            { key: "self", label: "🧪 只发给自己测试" },
            { key: "single", label: "👤 指定居民" },
            { key: "all", label: "🌍 所有 active 居民" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTargetMode(item.key as TargetMode)}
              className={
                targetMode === item.key
                  ? "rounded-full border border-white bg-white px-5 py-3 text-sm font-semibold text-black transition"
                  : "rounded-full border border-zinc-700 bg-black px-5 py-3 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-white"
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {targetMode === "single" && (
        <section className="space-y-4 rounded-3xl border border-zinc-800 bg-black/40 p-5">
          <p className="text-sm text-zinc-400">选择居民</p>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索居民名称或 ID..."
            className="w-full rounded-2xl border border-zinc-800 bg-black px-5 py-4 outline-none transition focus:border-white"
          />

          <select
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-black px-5 py-4 outline-none transition focus:border-white"
          >
            <option value="">选择一位居民</option>

            {filteredProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.username || "无名居民"} · {profile.status || "active"}
              </option>
            ))}
          </select>
        </section>
      )}
    </>
  );
}