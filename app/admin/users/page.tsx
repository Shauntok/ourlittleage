"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type StatusFilter =
  | "all"
  | "active"
  | "warned"
  | "muted"
  | "banned";

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  async function fetchUsers() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    setProfiles(data || []);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredProfiles = profiles.filter((profile) => {
    const keyword = search.toLowerCase().trim();
    const currentStatus = profile.status || "active";

    const matchStatus =
      statusFilter === "all" || currentStatus === statusFilter;

    const matchKeyword =
      !keyword ||
      profile.username?.toLowerCase().includes(keyword) ||
      profile.id?.toLowerCase().includes(keyword) ||
      profile.role?.toLowerCase().includes(keyword) ||
      currentStatus.toLowerCase().includes(keyword);

    return matchStatus && matchKeyword;
  });

  function getRoleStyle(role: string) {
    switch (role) {
      case "owner":
        return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
      case "admin":
        return "border-red-500/30 bg-red-500/10 text-red-300";
      case "moderator":
        return "border-blue-500/30 bg-blue-500/10 text-blue-300";
      default:
        return "border-zinc-700 bg-zinc-900 text-zinc-300";
    }
  }

  function getStatusStyle(status: string) {
    switch (status) {
      case "active":
        return "border-green-500/30 bg-green-500/10 text-green-300";
      case "warned":
        return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
      case "muted":
        return "border-blue-500/30 bg-blue-500/10 text-blue-300";
      case "banned":
        return "border-red-500/30 bg-red-500/10 text-red-300";
      default:
        return "border-zinc-700 bg-zinc-900 text-zinc-300";
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <h1 className="text-4xl font-bold">
            居民管理 👥
          </h1>

          <p className="mt-2 text-zinc-500">
            查看、筛选和管理平台居民资料。
          </p>
        </div>

        <div className="rounded-full border border-zinc-800 bg-zinc-950 px-5 py-3 text-sm text-zinc-400">
          共 {filteredProfiles.length} / {profiles.length} 位居民
        </div>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜索用户名、ID、身份或状态..."
        className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4 outline-none transition focus:border-white"
      />

      <div className="flex flex-wrap gap-3">
        {[
          { key: "all", label: "全部", count: profiles.length },
          {
            key: "active",
            label: "正常",
            count: profiles.filter(
              (item) => (item.status || "active") === "active"
            ).length,
          },
          {
            key: "warned",
            label: "观察",
            count: profiles.filter(
              (item) => item.status === "warned"
            ).length,
          },
          {
            key: "muted",
            label: "禁言",
            count: profiles.filter(
              (item) => item.status === "muted"
            ).length,
          },
          {
            key: "banned",
            label: "封禁",
            count: profiles.filter(
              (item) => item.status === "banned"
            ).length,
          },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() =>
              setStatusFilter(item.key as StatusFilter)
            }
            className={
              statusFilter === item.key
                ? "rounded-full border border-white bg-white px-5 py-3 text-sm font-semibold text-black transition"
                : "rounded-full border border-zinc-800 bg-zinc-950 px-5 py-3 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-white"
            }
          >
            {item.label}

            <span className="ml-2 text-xs opacity-60">
              {item.count}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredProfiles.length === 0 && (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
            没有找到符合条件的居民。
          </div>
        )}

        {filteredProfiles.map((profile) => {
          const status = profile.status || "active";
          const roomHref = profile.username
            ? `/u/${encodeURIComponent(profile.username)}`
            : "/admin/users";

          return (
            <div
              key={profile.id}
              className="min-w-0 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/50 p-5"
            >
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-zinc-800 bg-zinc-900">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.username || "居民"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg text-zinc-600">
                        👤
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 space-y-2">
                    <Link
                      href={`/admin/users/${profile.id}`}
                      className="safe-text block text-lg font-bold transition hover:text-zinc-400"
                    >
                      {profile.username || "无名居民"}
                    </Link>

                    <p className="break-all text-xs text-zinc-600">
                      {profile.id}
                    </p>

                    <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                      <span>Lv.{profile.level || 1}</span>
                      <span>EXP {profile.exp || 0}</span>
                      <span>信任 {profile.trust_score || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 md:justify-end">
                  <span
                    className={`rounded-full border px-3 py-1 text-sm ${getRoleStyle(
                      profile.role || "user"
                    )}`}
                  >
                    {profile.role || "user"}
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1 text-sm ${getStatusStyle(
                      status
                    )}`}
                  >
                    {status}
                  </span>

                  <Link
                    href={roomHref}
                    target="_blank"
                    className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition hover:border-white hover:text-white"
                  >
                    看房间 ↗
                  </Link>

                  <Link
                    href={`/admin/users/${profile.id}`}
                    className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition hover:border-white hover:text-white"
                  >
                    管理
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}