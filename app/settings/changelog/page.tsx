import { publicChangelogEntries } from "@/lib/changelog/public";

export default function SettingsChangelogPage() {
  return (
    <main className="min-h-screen text-white">
      <section className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-2xl md:p-10">
        <p className="text-xs tracking-[0.4em] text-white/25">CHANGELOG</p>

        <h1 className="mt-4 text-4xl font-light">更新日志</h1>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/45">
          小时代会慢慢成长。这里记录每一次居民能够感受到的新增、修复与改变。
        </p>

        <div className="mt-10 space-y-8">
          {publicChangelogEntries.map((log) => (
            <article
              key={log.version}
              className="rounded-[1.8rem] border border-white/10 bg-black/25 p-6"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-light">{log.version}</h2>
                  <p className="mt-2 text-sm text-white/35">{log.date}</p>
                </div>
              </div>

              {log.features.length > 0 && (
                <LogSection title="新功能" tone="text-emerald-200" items={log.features} />
              )}
              {log.fixes.length > 0 && (
                <LogSection title="修复" tone="text-amber-200" items={log.fixes} />
              )}
              {log.improvements.length > 0 && (
                <LogSection title="优化" tone="text-sky-200" items={log.improvements} />
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function LogSection({
  title,
  tone,
  items,
}: {
  title: string;
  tone: string;
  items: readonly string[];
}) {
  return (
    <div className="mt-6">
      <h3 className={`text-sm font-medium ${tone}`}>{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-7 text-white/60">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}
