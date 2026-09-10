import { redirect } from "next/navigation";

import {
  canViewAdminChangelog,
  getAdminActor,
} from "@/lib/admin/authorization";
import { getAdminChangelogEntries } from "@/lib/admin/changelog";

export const dynamic = "force-dynamic";

const categoryTone: Record<string, string> = {
  Admin: "border-sky-500/25 bg-sky-500/10 text-sky-200",
  Security: "border-rose-500/25 bg-rose-500/10 text-rose-200",
  Auth: "border-violet-500/25 bg-violet-500/10 text-violet-200",
  Database: "border-cyan-500/25 bg-cyan-500/10 text-cyan-200",
  RLS: "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-200",
  Moderation: "border-amber-500/25 bg-amber-500/10 text-amber-200",
  Operations: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
  Infrastructure: "border-blue-500/25 bg-blue-500/10 text-blue-200",
  "Internal Fix": "border-zinc-500/30 bg-zinc-500/10 text-zinc-200",
};

export default async function AdminChangelogPage() {
  const actor = await getAdminActor();

  if (!actor) redirect("/");
  if (!canViewAdminChangelog(actor.role)) redirect("/admin/homepage");

  const entries = getAdminChangelogEntries();

  return (
    <div className="space-y-8">
      <header className="border-b border-zinc-800 pb-7">
        <p className="text-xs tracking-[0.3em] text-zinc-600">ADMIN CHANGELOG</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">后台更新日志</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-500">
          记录后台、权限、安全与运营工具的内部变化。这里不保存任何密码、密钥或认证凭证。
        </p>
      </header>

      <div className="space-y-4">
        {entries.map((entry) => (
          <article
            key={`${entry.date}-${entry.phase}-${entry.title}`}
            className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-5 md:p-6"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md border px-2 py-1 text-xs ${categoryTone[entry.category] || categoryTone["Internal Fix"]}`}>
                    {entry.category}
                  </span>
                  <span className="text-xs text-zinc-600">{entry.phase}</span>
                </div>
                <h2 className="mt-4 text-lg font-medium text-zinc-100">{entry.title}</h2>
              </div>

              <div className="shrink-0 text-left md:text-right">
                <p className="text-sm text-zinc-400">{entry.date}</p>
                <p className="mt-1 text-xs text-zinc-600">{entry.status}</p>
              </div>
            </div>

            <dl className="mt-5 grid gap-4 border-t border-zinc-800/80 pt-5 md:grid-cols-[160px_1fr]">
              <div>
                <dt className="text-xs text-zinc-600">影响范围</dt>
                <dd className="mt-1 text-sm text-zinc-300">{entry.scope}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-600">说明</dt>
                <dd className="mt-1 text-sm leading-7 text-zinc-400">{entry.summary}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
