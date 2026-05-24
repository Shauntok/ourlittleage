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

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-900 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold">
          小时代
        </Link>

        <nav className="flex items-center gap-6 text-sm text-zinc-400">
          <Link href="/" className="hover:text-white transition">
            首页
          </Link>

          <Link href="/search" className="hover:text-white transition">
            搜索
          </Link>

          {profile && (
            <Link href="/write" className="hover:text-white transition">
              ✍️ 写故事
            </Link>
          )}

          {profile && (
            <Link
              href="/notifications"
              className="relative flex items-center justify-center hover:scale-105 transition"
            >
              <span className="text-xl">
                {unreadCount > 0 ? "📬" : "📪"}
              </span>

              {unreadCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-lg shadow-red-500/50">
                  {unreadCount}
                </span>
              )}
            </Link>
          )}

          {profile ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-3 hover:text-white transition"
              >
                <div className="h-9 w-9 overflow-hidden rounded-full border border-zinc-700 bg-zinc-900">
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm">
                      👤
                    </div>
                  )}
                </div>

                <span>{profile.username}</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/95 shadow-2xl shadow-black/50 backdrop-blur-2xl">

                  {/* ===== 用户头部 ===== */}
                  <div className="border-b border-zinc-800 px-5 py-5">

                    <div className="flex items-center gap-4">

                      <div className="h-14 w-14 overflow-hidden rounded-full border border-zinc-700 bg-zinc-900">
                        {profile.avatar ? (
                          <img
                            src={profile.avatar}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xl">
                            👤
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">

                        <p className="truncate text-lg font-bold text-white">
                          {profile.username}
                        </p>

                        {(profile.status_message ||
                          profile.mood_emoji) && (

                          <div className="mt-1 flex items-center gap-2 text-sm text-zinc-400">

                            <span>
                              {profile.mood_emoji || "🌙"}
                            </span>

                            <span className="truncate">
                              {profile.status_message}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ===== 主菜单 ===== */}
                  <div className="py-2">

                    <Link
                      href={`/u/${encodeURIComponent(
                        profile.username
                      )}`}
                      className="flex items-center gap-3 px-5 py-4 text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
                    >
                      <span>🏠</span>
                      <span>我的房间</span>
                    </Link>

                    <Link
                      href="/write"
                      className="flex items-center gap-3 px-5 py-4 text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
                    >
                      <span>✍️</span>
                      <span>写故事</span>
                    </Link>

                    <Link
                      href="/notifications"
                      className="flex items-center gap-3 px-5 py-4 text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
                    >
                      <span>📬</span>

                      <span className="flex-1">
                        邮箱
                      </span>

                      {unreadCount > 0 && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                          {unreadCount}
                        </span>
                      )}
                    </Link>

                    <Link
                      href="/admin/profile"
                      className="flex items-center gap-3 px-5 py-4 text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
                    >
                      <span>⚙️</span>
                      <span>我的资料</span>
                    </Link>
                  </div>

                  {/* ===== 管理员区域 ===== */}
                  {[
                    "owner",
                    "admin",
                    "moderator",
                  ].includes(currentRole) && (
                    <div className="border-t border-zinc-800 py-2">

                      <Link
                        href="/admin"
                        className="flex items-center gap-3 px-5 py-4 text-violet-300 transition hover:bg-zinc-900"
                      >
                        <span>🛠</span>
                        <span>后台管理</span>
                      </Link>
                    </div>
                  )}

                  {/* ===== 登出 ===== */}
                  <div className="border-t border-zinc-800 py-2">

                    <button
                      onClick={async () => {
                        await supabase.auth.signOut();

                        window.location.href = "/";
                      }}
                      className="flex w-full items-center gap-3 px-5 py-4 text-left text-red-400 transition hover:bg-zinc-900"
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
              className="rounded-xl border border-zinc-700 px-4 py-2 hover:border-white hover:text-white transition"
            >
              登录
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}