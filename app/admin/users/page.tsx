"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function AdminUsersPage() {

  const [profiles, setProfiles] =
    useState<any[]>([]);

  const [search, setSearch] =
    useState("");

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

  const filteredProfiles =
    profiles.filter((profile) => {

      const keyword =
        search.toLowerCase();

      return (
        profile.username
          ?.toLowerCase()
          .includes(keyword) ||

        profile.id
          ?.toLowerCase()
          .includes(keyword)
      );
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

  return (
    <div className="space-y-8">

      <div>
        <h1 className="text-4xl font-bold">
          居民管理 👥
        </h1>

        <p className="text-zinc-500 mt-2">
          查看平台居民资料与身份。
        </p>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) =>
          setSearch(e.target.value)
        }
        placeholder="搜索用户名或 ID..."
        className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4 outline-none focus:border-white"
      />

      <div className="space-y-4">

        {filteredProfiles.map((profile) => (

          <div
            key={profile.id}
            className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-5"
          >

            <div className="flex items-center justify-between gap-5">

              <div className="space-y-2">

                <Link
                href={`/admin/users/${profile.id}`}
                  className="text-lg font-bold hover:text-zinc-400 transition"
                >
                  {profile.username}
                </Link>

                <p className="text-xs text-zinc-600 break-all">
                  {profile.id}
                </p>
              </div>

              <span
                className={`rounded-full border px-3 py-1 text-sm ${getRoleStyle(profile.role)}`}
              >
                {profile.role}
              </span>

            </div>
          </div>
        ))}

      </div>
    </div>
  );
}