"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminUserDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [profile, setProfile] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [currentRole, setCurrentRole] =
    useState<string | null>(null);

  async function fetchUser() {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    setProfile(profileData);

    const { data: badgeData } = await supabase
      .from("user_badges")
      .select(`
        id,
        badges (
          id,
          name,
          color
        )
      `)
      .eq("user_id", id);

    setBadges(badgeData || []);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setCurrentRole(myProfile?.role || "user");
    }
  }

  useEffect(() => {
    fetchUser();
  }, [id]);

        async function updateRole(
        newRole: string
        ) {

        // ===== 当前登录用户 =====
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        // ===== 只有 owner 可修改 =====
        if (currentRole !== "owner") {
            alert("只有 owner 可以修改身份");
            return;
        }

        const { error } = await supabase
            .from("profiles")
            .update({
            role: newRole,
            })
            .eq("id", id);

        if (error) {
            alert(error.message);
            return;
        }

        // ===== 写入日志 =====
        await supabase.from("admin_logs").insert([
            {
            admin_id: user.id,
            action: "update_role",
            target_type: "user",
            target_id: id,
            details: `修改身份为 ${newRole}`,
            },
        ]);

        // ===== 更新本地 UI =====
        setProfile((current: any) => ({
            ...current,
            role: newRole,
        }));

        alert("身份已更新 👑");
        }

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

  if (!profile) {
    return (
      <div className="text-zinc-500">
        读取居民资料中...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-5">
        <div className="h-24 w-24 overflow-hidden rounded-full border border-zinc-800 bg-zinc-900">
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt={profile.username}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl text-zinc-600">
              👤
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <h1 className="text-4xl font-bold">
              {profile.username}
            </h1>

            <p className="text-zinc-500 text-sm break-all mt-2">
              {profile.id}
            </p>
          </div>

          {currentRole === "owner" ? (
            <select
                value={profile.role || "user"}
                onChange={(e) =>
                updateRole(e.target.value)
                }
                className={`rounded-full border px-3 py-1 text-sm bg-black outline-none ${getRoleStyle(
                profile.role
                )}`}
            >
                <option value="user">user</option>
                <option value="moderator">moderator</option>
                <option value="admin">admin</option>
                <option value="owner">owner</option>
            </select>
            ) : (
            <span
                className={`inline-flex rounded-full border px-3 py-1 text-sm ${getRoleStyle(
                profile.role
                )}`}
            >
                {profile.role}
            </span>
            )}
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6 space-y-3">
        <p className="text-sm text-zinc-500">
          居民简介
        </p>

        <p className="text-zinc-300">
          {profile.bio || "这个居民还没有留下简介。"}
        </p>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6 space-y-4">
        <p className="text-sm text-zinc-500">
          已拥有徽章
        </p>

        <div className="flex flex-wrap gap-3">
          {badges.length === 0 && (
            <p className="text-zinc-600 text-sm">
              暂无徽章
            </p>
          )}

          {badges.map((item: any) => {
            const badge = item.badges;
            if (!badge) return null;

            return (
              <div
                key={item.id}
                className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm"
              >
                🎖️ {badge.name}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6 space-y-3">
        <p className="text-sm text-zinc-500">
          注册时间
        </p>

        <p className="text-zinc-300">
          {profile.created_at
            ? new Date(profile.created_at).toLocaleString("zh-CN")
            : "未知"}
        </p>
      </div>
    </div>
  );
}