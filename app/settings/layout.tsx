"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/settings/profile", icon: "🏠", label: "房间" },
  { href: "/settings/privacy", icon: "🌙", label: "隐私" },
  { href: "/settings/account", icon: "🔐", label: "安全" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />
      <div className="pointer-events-none fixed left-1/2 top-1/3 -z-10 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl md:h-[560px] md:w-[560px]" />

      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-6 px-5 pb-24 pt-10 md:px-10 md:py-24 lg:flex-row lg:gap-12 xl:px-14">
        <aside className="w-full shrink-0 lg:w-[240px]">
          <div className="lg:sticky lg:top-28">
            <Link
              href="/home"
              className="mb-5 inline-flex text-sm text-white/35 transition hover:text-white/70"
            >
              ← 回到首页
            </Link>

            <h2 className="mb-4 text-xs tracking-[0.35em] text-white/25">
              SETTINGS
            </h2>

            <nav className="grid grid-cols-3 gap-2 lg:block lg:space-y-3">
              {navItems.map((item) => {
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center justify-center rounded-2xl border px-3 py-3
                      text-sm backdrop-blur-2xl transition
                      lg:justify-start lg:px-5 lg:py-4
                      ${
                        active
                          ? "border-white/80 bg-white text-black shadow-[0_0_28px_rgba(255,255,255,0.16)]"
                          : "border-white/10 bg-white/[0.035] text-white/60 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                      }
                    `}
                  >
                    <span className="mr-1.5 lg:mr-2">{item.icon}</span>
                    <span className="whitespace-nowrap">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <section className="min-w-0 flex-1">{children}</section>
      </div>
    </main>
  );
}