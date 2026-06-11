"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import UserListStats from "@/components/admin/users/UserListStats";
import UserListFilters, {
  type StatusFilter,
  type RoleFilter,
} from "@/components/admin/users/UserListFilters";
import UserListCard from "@/components/admin/users/UserListCard";

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] =
    useState<RoleFilter>("all");

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
    const currentRole = profile.role || "user";

    const matchStatus =
      statusFilter === "all" ||
      currentStatus === statusFilter;

    const matchRole =
      roleFilter === "all" ||
      currentRole === roleFilter;

    const matchKeyword =
      !keyword ||
      profile.username?.toLowerCase().includes(keyword) ||
      profile.id?.toLowerCase().includes(keyword) ||
      currentRole.toLowerCase().includes(keyword) ||
      currentStatus.toLowerCase().includes(keyword);

    return matchStatus && matchRole && matchKeyword;
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

        <button
          onClick={fetchUsers}
          className="rounded-full border border-zinc-700 bg-zinc-950 px-5 py-3 text-sm text-zinc-300 transition hover:border-white hover:text-white"
        >
          刷新居民
        </button>
      </div>

      <UserListStats profiles={profiles} />

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜索用户名、ID、身份或状态..."
        className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4 outline-none transition focus:border-white"
      />

      <UserListFilters
        profiles={profiles}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
      />

      <div className="rounded-full border border-zinc-800 bg-zinc-950 px-5 py-3 text-sm text-zinc-400">
        显示 {filteredProfiles.length} / {profiles.length} 位居民
      </div>

      <div className="space-y-4">
        {filteredProfiles.length === 0 && (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
            没有找到符合条件的居民。
          </div>
        )}

        {filteredProfiles.map((profile) => (
          <UserListCard
            key={profile.id}
            profile={profile}
            getRoleStyle={getRoleStyle}
            getStatusStyle={getStatusStyle}
          />
        ))}
      </div>
    </div>
  );
}