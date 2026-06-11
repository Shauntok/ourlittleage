export type StatusFilter =
  | "all"
  | "active"
  | "warned"
  | "muted"
  | "banned";

export type RoleFilter =
  | "all"
  | "owner"
  | "admin"
  | "moderator"
  | "user";

type Props = {
  profiles: any[];
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  roleFilter: RoleFilter;
  setRoleFilter: (value: RoleFilter) => void;
};

export default function UserListFilters({
  profiles,
  statusFilter,
  setStatusFilter,
  roleFilter,
  setRoleFilter,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {[
          { key: "all", label: "全部状态", count: profiles.length },
          {
            key: "active",
            label: "正常",
            count: profiles.filter(
              (item) => (item.status || "active") === "active"
            ).length,
          },
          {
            key: "warned",
            label: "观察",
            count: profiles.filter((item) => item.status === "warned").length,
          },
          {
            key: "muted",
            label: "禁言",
            count: profiles.filter((item) => item.status === "muted").length,
          },
          {
            key: "banned",
            label: "封禁",
            count: profiles.filter((item) => item.status === "banned").length,
          },
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

            <span className="ml-2 text-xs opacity-60">
              {item.count}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {[
          { key: "all", label: "全部身份" },
          { key: "owner", label: "owner" },
          { key: "admin", label: "admin" },
          { key: "moderator", label: "moderator" },
          { key: "user", label: "user" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setRoleFilter(item.key as RoleFilter)}
            className={
              roleFilter === item.key
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