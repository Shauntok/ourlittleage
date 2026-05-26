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

  async function updateRole(newRole: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    if (currentRole === "moderator") {
      alert("moderator 无法修改身份");
      return;
    }

    if (currentRole === "admin") {
      if (profile.role === "owner") {
        alert("admin 无法修改 owner");
        return;
      }

      if (newRole === "owner") {
        alert("admin 无法创建 owner");
        return;
      }
    }

    if (
      profile.role === "owner" &&
      profile.id !== user.id
    ) {
      alert("不能修改 owner 身份");
      return;
    }

    if (
      profile.id === user.id &&
      profile.role === "owner" &&
      newRole !== "owner"
    ) {
      alert("不能把自己的 owner 权限降级，否则会失去最高权限。");
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

    await supabase.from("admin_logs").insert([
      {
        admin_id: user.id,
        action: "update_role",
        target_type: "user",
        target_id: id,
        details: `修改身份为 ${newRole}`,
      },
    ]);

    setProfile((current: any) => ({
      ...current,
      role: newRole,
    }));

    alert("身份已更新 👑");
  }

  async function updateStatus(newStatus: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    if (currentRole === "moderator") {
      alert("moderator 无法修改状态");
      return;
    }

    if (
      currentRole === "admin" &&
      profile.role === "owner"
    ) {
      alert("admin 无法管理 owner");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        status: newStatus,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await supabase.from("admin_logs").insert([
      {
        admin_id: user.id,
        action: "update_status",
        target_type: "user",
        target_id: id,
        details: `修改状态为 ${newStatus}`,
      },
    ]);

    // ===== 自动发送系统通知 =====
    let notificationTitle = "";
    let notificationContent = "";

    if (newStatus === "warned") {
      notificationTitle = "⚠️ 社区观察提醒";
      notificationContent =
        "你目前已进入社区观察状态，请注意发言规范与社区秩序。";
    }

    if (newStatus === "muted") {
      notificationTitle = "🔇 你已被暂时禁言";
      notificationContent =
        "你目前暂时无法发表评论，请等待管理层进一步处理。";
    }

    if (newStatus === "banned") {
      notificationTitle = "🚫 账号已封禁";
      notificationContent =
        "由于违反社区规范，你的账号已被封禁。";
    }

    if (notificationTitle && notificationContent) {
      await supabase.from("notifications").insert([
        {
          user_id: id,
          title: notificationTitle,
          content: notificationContent,
          type: "system",
        },
      ]);
    }

    setProfile((current: any) => ({
      ...current,
      status: newStatus,
    }));

    alert("状态已更新 🚨");
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
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
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

          <div className="flex flex-wrap gap-3">
            {currentRole === "owner" ||
            currentRole === "admin" ? (
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
                <option value="moderator">
                  moderator
                </option>

                {currentRole === "owner" && (
                  <option value="admin">
                    admin
                  </option>
                )}

                {currentRole === "owner" && (
                  <option value="owner">
                    owner
                  </option>
                )}
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

            {currentRole === "owner" ||
            currentRole === "admin" ? (
              <select
                value={profile.status || "active"}
                onChange={(e) =>
                  updateStatus(e.target.value)
                }
                className={`rounded-full border px-3 py-1 text-sm bg-black outline-none ${getStatusStyle(
                  profile.status || "active"
                )}`}
              >
                <option value="active">active</option>
                <option value="warned">warned</option>
                <option value="muted">muted</option>
                <option value="banned">banned</option>
              </select>
            ) : (
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-sm ${getStatusStyle(
                  profile.status || "active"
                )}`}
              >
                {profile.status || "active"}
              </span>
            )}
          </div>
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
            ? new Date(
                profile.created_at
              ).toLocaleString("zh-CN")
            : "未知"}
        </p>
      </div>
    </div>
  );
}