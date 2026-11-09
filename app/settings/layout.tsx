"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useRoomViewSkin } from "@/components/RoomViewSkinProvider";
import SettingsPixelIcon from "@/components/site-skins/modern-pixel/SettingsPixelIcon";
import PixelCornerMarks from "@/components/site-skins/modern-pixel/PixelCornerMarks";
import styles from "./settings-layout.module.css";

const navItems = [
  { href: "/settings/profile", icon: "🏠", pixelIcon: "room", label: "房间" },
  { href: "/settings/skin", icon: "🎨", pixelIcon: "skin", label: "皮肤" },
  { href: "/settings/privacy", icon: "🌙", pixelIcon: "privacy", label: "隐私" },
  { href: "/settings/account", icon: "🔐", pixelIcon: "security", label: "安全" },
  { href: "/settings/about", icon: "🌌", pixelIcon: "about", label: "关于网站" },
  { href: "/settings/changelog", icon: "✨", pixelIcon: "changelog", label: "更新日志" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { skin } = useRoomViewSkin();
  const modernSettings = skin === "modern_pixel";
  const changelogScene = modernSettings && pathname === "/settings/changelog";
  const modernDesignedPage = pathname === "/settings/profile" || pathname === "/settings/skin" || pathname === "/settings/privacy" || pathname === "/settings/account" || pathname === "/settings/about" || pathname === "/settings/changelog";

  return (
    <main data-moon-scene={modernSettings ? "" : undefined} data-nav-scene={modernSettings ? (changelogScene ? "changelog" : "settings") : undefined} data-settings-scene={modernSettings ? pathname.slice("/settings/".length) : undefined} className={modernSettings ? `${styles.modern} ${changelogScene ? styles.changelogScene : ""}` : "min-h-screen overflow-x-hidden bg-black text-white"}>
      {!modernSettings && <>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />
      <div className="pointer-events-none fixed left-1/2 top-1/3 -z-10 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl md:h-[560px] md:w-[560px]" />
      </>}

      <div className={modernSettings ? styles.shell : "mx-auto flex w-full max-w-[1800px] flex-col gap-6 px-5 pb-24 pt-10 md:px-10 md:py-24 lg:flex-row lg:gap-12 xl:px-14"}>
        <aside className={modernSettings ? styles.sidebar : "w-full shrink-0 lg:w-[240px]"}>
          {modernSettings && <><PixelCornerMarks /><span className={styles.flowerBed} aria-hidden="true" /></>}
          <div className={modernSettings ? "relative z-[1]" : "lg:sticky lg:top-28"}>
            <Link
              href="/home"
              className={modernSettings ? styles.backLink : "mb-5 inline-flex text-sm text-white/35 transition hover:text-white/70"}
            >
              {modernSettings ? <><ArrowLeft size={15} aria-hidden="true" /> 返回首页</> : "← 回到首页"}
            </Link>

            <h2 className={modernSettings ? styles.sidebarTitle : "mb-4 text-xs tracking-[0.35em] text-white/25"}>
              {modernSettings ? <><SettingsPixelIcon name="settings" />设置</> : "SETTINGS"}
            </h2>

            <nav aria-label="设置导航" className={modernSettings ? styles.nav : "grid grid-cols-2 gap-2 sm:grid-cols-4 lg:block lg:space-y-3"}>
              {navItems.map((item) => {
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={modernSettings ? `${styles.navLink} ${active ? styles.navActive : ""}` : `
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
                    {modernSettings ? <SettingsPixelIcon name={item.pixelIcon as "room" | "skin" | "privacy" | "security" | "about" | "changelog"} /> : <span className="mr-1.5 lg:mr-2">{item.icon}</span>}
                    <span className="whitespace-nowrap">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <section className={modernSettings ? `${styles.content} ${modernDesignedPage ? "" : styles.legacyContent}` : "min-w-0 flex-1"}>{children}</section>
      </div>
    </main>
  );
}
