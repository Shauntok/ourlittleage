import Link from "next/link";

type Props = {
  profile: any;
  getRoleStyle: (role: string) => string;
  getStatusStyle: (status: string) => string;
};

export default function UserListCard({
  profile,
  getRoleStyle,
  getStatusStyle,
}: Props) {
  const status = profile.status || "active";
  const role = profile.role || "user";

  const roomHref = profile.username
    ? `/u/${encodeURIComponent(profile.username)}`
    : "/admin/users";

  return (
    <div className="min-w-0 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/50 p-5 transition hover:border-zinc-600">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div className="flex min-w-0 items-center gap-4">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-zinc-800 bg-zinc-900">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username || "居民"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg text-zinc-600">
                👤
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-2">
            <Link
              href={`/admin/users/${profile.id}`}
              className="safe-text block text-lg font-bold transition hover:text-zinc-400"
            >
              {profile.username || "无名居民"}
            </Link>

            <p className="break-all text-xs text-zinc-600">
              {profile.id}
            </p>

            <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
              <span>Lv.{profile.level || 1}</span>
              <span>EXP {profile.exp || 0}</span>
              <span>信任 {profile.trust_score || 0}</span>
            </div>

            <p className="text-xs text-zinc-600">
              最近上线：
              {profile.last_seen_at
                ? new Date(profile.last_seen_at).toLocaleString("zh-CN")
                : "从未"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          <span
            className={`rounded-full border px-3 py-1 text-sm ${getRoleStyle(
              role
            )}`}
          >
            {role}
          </span>

          <span
            className={`rounded-full border px-3 py-1 text-sm ${getStatusStyle(
              status
            )}`}
          >
            {status}
          </span>

          <Link
            href={roomHref}
            target="_blank"
            className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition hover:border-white hover:text-white"
          >
            看房间 ↗
          </Link>

          <Link
            href={`/admin/broadcast?user=${profile.id}`}
            className="rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-300 transition hover:bg-violet-500/20"
          >
            📬 发信
          </Link>

          <Link
            href={`/admin/users/${profile.id}`}
            className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition hover:border-white hover:text-white"
          >
            管理
          </Link>
        </div>
      </div>
    </div>
  );
}