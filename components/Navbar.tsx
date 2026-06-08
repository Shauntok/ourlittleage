"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const [profile, setProfile] = useState<any>(null);
  const [currentRole, setCurrentRole] = useState("user");
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const menuRef = useRef<HTMLDivElement>(null);

  async function fetchUnreadCount() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { count } = await supabase
      .from("notifications")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("user_id", user.id)
      .eq("is_read", false)
      .is("deleted_at", null);

    setUnreadCount(count || 0);
  }

  useEffect(() => {
    async function getProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (
        data?.status_expires_at &&
        new Date(data.status_expires_at).getTime() < Date.now()
      ) {
        await supabase
          .from("profiles")
          .update({
            mood_emoji: null,
            status_message: null,
            status_expires_at: null,
          })
          .eq("id", data.id);

        data.mood_emoji = null;
        data.status_message = null;
        data.status_expires_at = null;
      }

      setProfile(data);
      setCurrentRole(data?.role || "user");
    }

    getProfile();
    fetchUnreadCount();

    const channel = supabase
      .channel("navbar-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => fetchUnreadCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    function handleNotificationsUpdated() {
      fetchUnreadCount();
    }

    window.addEventListener(
      "notifications-updated",
      handleNotificationsUpdated
    );

    return () => {
      window.removeEventListener(
        "notifications-updated",
        handleNotificationsUpdated
      );
    };
  }, []);

  const profileHref = profile?.username
    ? `/u/${encodeURIComponent(profile.username)}`
    : "/settings/profile";

  return (
    <header className="sticky top-0 z-50 bg-transparent px-6 py-4">
      <div
        className="
          mx-auto flex max-w-6xl items-center justify-between
          rounded-full border border-white/10
          bg-white/[0.045] px-6 py-3
          shadow-[0_0_60px_rgba(255,255,255,0.035)]
          backdrop-blur-2xl
        "
      >
        <Link
          href="/home"
          className="text-sm font-semibold tracking-wide text-white/85 transition hover:text-white"
        >
          小时代
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-white/45 md:flex">
          <Link href="/home" className="transition hover:text-white">
            首页
          </Link>

          <Link href="/space" className="transition hover:text-white">
            广场
          </Link>

          <Link href="/diary" className="transition hover:text-white">
            日记
          </Link>

          <Link href="/articles" className="transition hover:text-white">
            文章
          </Link>

          {profile && (
            <Link
              href={profileHref}
              className="transition hover:text-white"
            >
              我的房间
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-4">
          {profile && (
            <Link
              href="/notifications"
              className="
                relative flex h-11 w-11 items-center justify-center
                rounded-full border border-white/10
                bg-white/[0.04] text-lg
                transition hover:border-white/25 hover:bg-white/[0.08]
              "
              title="小时代信箱"
            >
              📬

              {unreadCount > 0 && (
                <span
                  className="
                    absolute -right-1 -top-1
                    flex h-5 min-w-5 items-center justify-center
                    rounded-full bg-red-500 px-1.5
                    text-[10px] font-bold text-white
                    shadow-[0_0_14px_rgba(239,68,68,0.75)]
                  "
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          )}
          {profile ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] p-1 pr-3 transition hover:border-white/25 hover:bg-white/[0.08]"
              >
                <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-white/[0.05] shadow-[0_0_24px_rgba(255,255,255,0.08)]">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username || "居民"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm">
                      🌙
                    </div>
                  )}
                </div>

                <span className="hidden max-w-[120px] truncate text-xs text-white/45 lg:inline">
                  {profile.username || "居民"}
                </span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-4 w-72 overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/95 shadow-2xl shadow-black/50 backdrop-blur-2xl">
                  <div className="border-b border-white/10 px-5 py-5">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 overflow-hidden rounded-full border border-white/10 bg-white/[0.05]">
                        {profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={profile.username || "居民"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xl">
                            🌙
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-semibold text-white">
                          {profile.username || "居民"}
                        </p>

                        {(profile.status_message || profile.mood_emoji) && (
                          <div className="mt-1 flex items-center gap-2 text-sm text-white/40">
                            <span>{profile.mood_emoji || "🌙"}</span>

                            <span className="truncate">
                              {profile.status_message || "还在小时代"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="py-2">
                    <Link
                      href={profileHref}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-5 py-4 text-white/70 transition hover:bg-white/[0.05] hover:text-white"
                    >
                      <span>🏠</span>
                      <span>我的房间</span>
                    </Link>

                    <Link
                      href="/settings/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-5 py-4 text-white/70 transition hover:bg-white/[0.05] hover:text-white"
                    >
                      <span>⚙️</span>
                      <span>房间设置</span>
                    </Link>

                    <Link
                      href="/write"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-5 py-4 text-white/70 transition hover:bg-white/[0.05] hover:text-white"
                    >
                      <span>✍️</span>
                      <span>写故事</span>
                    </Link>

                    <Link
                      href="/notifications"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-5 py-4 text-white/70 transition hover:bg-white/[0.05] hover:text-white"
                    >
                      <span>📬</span>

                      <span className="flex-1">
                        小时代信箱
                      </span>

                      {unreadCount > 0 && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  </div>

                  {["owner", "admin", "moderator"].includes(currentRole) && (
                    <div className="border-t border-white/10 py-2">
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-5 py-4 text-violet-300 transition hover:bg-white/[0.05]"
                      >
                        <span>🛠</span>
                        <span>后台管理</span>
                      </Link>
                    </div>
                  )}

                  <div className="border-t border-white/10 py-2">
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut();
                        window.location.href = "/";
                      }}
                      className="flex w-full items-center gap-3 px-5 py-4 text-left text-red-300 transition hover:bg-white/[0.05]"
                    >
                      <span>🚪</span>
                      <span>登出</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:border-white/25 hover:text-white"
            >
              登录
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}