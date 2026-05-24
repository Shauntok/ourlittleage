"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

// ===== 前台网站导航栏 =====
export default function Navbar() {
  const [profile, setProfile] =
    useState<any>(null);
    
    const [menuOpen, setMenuOpen] =
      useState(false);

    const menuRef =
      useRef<HTMLDivElement>(null);

      const [unreadCount, setUnreadCount] =
        useState(0);

      useEffect(() => {
        fetchUnread();
      }, []);

      async function fetchUnread() {

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
          .eq("is_read", false);

        setUnreadCount(count || 0);
      }

  // ===== 获取当前用户资料 =====
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

      setProfile(data);

      // ===== 自动清理过期状态 =====
      if (
        data?.status_expires_at &&
        new Date(
          data.status_expires_at
        ).getTime() < Date.now()
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
        () => {
          fetchUnreadCount();
        }
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

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
  }, []);

  

  // ===== 点击外面关闭菜单 =====
  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent
    ) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node
        )
      ) {
        setMenuOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  return (
    <header className="border-b border-zinc-900 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* ===== 网站 Logo ===== */}
        <Link
          href="/"
          className="font-bold text-xl"
        >
          小时代
        </Link>

        {/* ===== 导航 ===== */}
        <nav className="flex items-center gap-6 text-sm text-zinc-400">
          <Link
            href="/"
            className="hover:text-white transition"
          >
            首页
          </Link>

          <Link
            href="/search"
            className="hover:text-white transition"
          >
            搜索
          </Link>

          <Link
          href="/write"
          className="hover:text-white transition"
        >
          ✍️ 写故事
        </Link>

          {profile && (
          <Link
            href="/notifications"
            className="relative flex items-center justify-center hover:scale-105 transition"
          >

            <span className="text-xl">
              {unreadCount > 0
                ? "📬"
                : "📪"}
            </span>

            {unreadCount > 0 && (
              <span className="absolute -right-2 -top-2 flex min-w-[20px] h-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-lg shadow-red-500/50">
                {unreadCount}
              </span>
            )}
          </Link>
        )}

          {/* ===== 已登录用户 ===== */}
          {profile ? (
            <div
              className="relative"
              ref={menuRef}
            >
              <button
                onClick={() =>
                  setMenuOpen(!menuOpen)
                }
                className="flex items-center gap-3 hover:text-white transition"
              >
                <div className="h-9 w-9 rounded-full overflow-hidden border border-zinc-700 bg-zinc-900">
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-sm">
                      👤
                    </div>
                  )}
                </div>

                <span>
                  {profile.username}
                </span>
              </button>

              {/* ===== 用户菜单 ===== */}
              {menuOpen && (
                <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40 overflow-hidden">
                  
                  <Link
                    href={`/u/${encodeURIComponent(
                      profile.username
                    )}`}
                    className="block px-5 py-4 hover:bg-zinc-900 transition"
                  >
                    我的主页
                  </Link>

                  <Link
                    href="/admin/profile"
                    className="block px-5 py-4 hover:bg-zinc-900 transition"
                  >
                    我的资料
                  </Link>

                  <Link
                    href="/admin/dashboard"
                    className="block px-5 py-4 hover:bg-zinc-900 transition"
                  >
                    后台管理
                  </Link>

                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();

                      window.location.href = "/";
                    }}
                    className="w-full text-left px-5 py-4 text-red-400 hover:bg-zinc-900 transition"
                  >
                    登出
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl border border-zinc-700 hover:border-white hover:text-white transition"
            >
              登录
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}