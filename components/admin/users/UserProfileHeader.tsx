import Link from "next/link";

type Props = {
  profile: any;
  currentRole: string | null;
  roomHref: string;
  updateRole: (role: string) => void;
  updateStatus: (status: string) => void;
  getRoleStyle: (role: string) => string;
  getStatusStyle: (status: string) => string;
};

export default function UserProfileHeader({
  profile,
  currentRole,
  roomHref,
  updateRole,
  updateStatus,
  getRoleStyle,
  getStatusStyle,
}: Props) {
  return (
    <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
      <div className="flex min-w-0 items-center gap-5">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border border-zinc-800 bg-zinc-900">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.username || "居民"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl text-zinc-600">
              👤
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-3">
          <div>
            <h1 className="safe-text text-4xl font-bold">
              {profile.username || "无名居民"}
            </h1>

            <p className="mt-2 break-all text-sm text-zinc-500">
              {profile.id}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {currentRole === "owner" || currentRole === "admin" ? (
              <select
                value={profile.role || "user"}
                onChange={(e) => updateRole(e.target.value)}
                className={`rounded-full border bg-black px-3 py-1 text-sm outline-none ${getRoleStyle(
                  profile.role || "user"
                )}`}
              >
                <option value="user">user</option>
                <option value="moderator">moderator</option>

                {currentRole === "owner" && (
                  <option value="admin">admin</option>
                )}

                {currentRole === "owner" && (
                  <option value="owner">owner</option>
                )}
              </select>
            ) : (
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-sm ${getRoleStyle(
                  profile.role || "user"
                )}`}
              >
                {profile.role || "user"}
              </span>
            )}

            {currentRole === "owner" || currentRole === "admin" ? (
              <select
                value={profile.status || "active"}
                onChange={(e) => updateStatus(e.target.value)}
                className={`rounded-full border bg-black px-3 py-1 text-sm outline-none ${getStatusStyle(
                  profile.status || "active"
                )}`}
              >
                <option value="active">active</option>
                <option value="warned">warned</option>
                <option value="muted">muted</option>
                <option value="banned">banned</option>
              </select>
            ) : (
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-sm ${getStatusStyle(
                  profile.status || "active"
                )}`}
              >
                {profile.status || "active"}
              </span>
            )}
          </div>
        </div>
      </div>

      <Link
        href={roomHref}
        target="_blank"
        className="rounded-full border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm text-zinc-300 transition hover:border-white hover:text-white"
      >
        查看居民房间 ↗
      </Link>
    </div>
  );
}