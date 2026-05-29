export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex w-full max-w-[1800px] gap-10 px-6 py-24">
        {/* Sidebar */}
        <aside className="w-[240px] shrink-0">
          <div className="sticky top-28 space-y-3">
            <h2 className="mb-6 text-sm tracking-[0.3em] text-white/30">
              SETTINGS
            </h2>

            <a
              href="/settings/profile"
              className="block rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-white/80 transition hover:bg-white/[0.06]"
            >
              👤 我的资料
            </a>

            <a
              href="/settings/account"
              className="block rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-white/50 transition hover:bg-white/[0.06] hover:text-white"
            >
              🔐 账号安全
            </a>

            <a
              href="/settings/privacy"
              className="block rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-white/50 transition hover:bg-white/[0.06] hover:text-white"
            >
              🌙 隐私设置
            </a>
          </div>
        </aside>

        {/* Content */}
        <section className="min-w-0 flex-1">
          {children}
        </section>
      </div>
    </main>
  );
}