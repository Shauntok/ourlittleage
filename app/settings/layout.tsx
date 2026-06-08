import Link from "next/link";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = [
    {
      href: "/settings/profile",
      icon: "🏠",
      label: "我的房间",
    },
    {
      href: "/settings/privacy",
      icon: "🌙",
      label: "隐私设置",
    },
    {
      href: "/settings/account",
      icon: "🔐",
      label: "账号安全",
    },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-8 px-6 py-24 lg:flex-row lg:gap-10">
        <aside className="w-full shrink-0 lg:w-[240px]">
          <div className="lg:sticky lg:top-28">
            <h2 className="mb-4 text-sm tracking-[0.3em] text-white/30">
              SETTINGS
            </h2>

            <nav className="flex gap-3 overflow-x-auto pb-2 lg:block lg:space-y-3 lg:overflow-visible lg:pb-0">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="
                    block shrink-0 rounded-2xl border border-white/10
                    bg-white/[0.03] px-5 py-4 text-sm text-white/60
                    transition hover:bg-white/[0.06] hover:text-white
                    lg:w-full
                  "
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        <section className="min-w-0 flex-1">{children}</section>
      </div>
    </main>
  );
}