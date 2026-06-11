"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import UserStats from "@/components/admin/users/UserStats";
import UserGrowthActions from "@/components/admin/users/UserGrowthActions";
import UserRecentPosts from "@/components/admin/users/UserRecentPosts";
import UserRecentComments from "@/components/admin/users/UserRecentComments";
import UserRelatedReports from "@/components/admin/users/UserRelatedReports";
import UserBadges from "@/components/admin/users/UserBadges";
import UserAdminLogs from "@/components/admin/users/UserAdminLogs";
import UserProfileHeader from "@/components/admin/users/UserProfileHeader";
import UserBioCard from "@/components/admin/users/UserBioCard";
import UserJoinedCard from "@/components/admin/users/UserJoinedCard";
import { fetchUserDetailData }
from "@/components/admin/users/userDetailData";

export default function AdminUserDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [profile, setProfile] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userComments, setUserComments] = useState<any[]>([]);
  const [relatedReports, setRelatedReports] = useState<any[]>([]);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);

  const [stats, setStats] = useState({
    articleTotal: 0,
    diaryTotal: 0,
    commentTotal: 0,
    reportTotal: 0,
  });

  function toNumber(value: any) {
    return Number(value || 0);
  }

  function formatDecimal(value: any) {
    return toNumber(value).toFixed(2);
  }

  function isTargetOwner() {
    return profile?.role === "owner";
  }

  function isSelf(userId: string) {
    return profile?.id === userId;
  }

  async function fetchUser() {
    const data = await fetchUserDetailData(id);

    setProfile(data.profileData);
    setBadges(data.badgeData || []);
    setUserPosts(data.postsData || []);
    setUserComments(data.commentsData || []);
    setRelatedReports(data.filteredReports || []);
    setAdminLogs(data.logsData || []);
    setCurrentRole(data.currentRole);
    setStats(data.stats);
  }

  useEffect(() => {
    fetchUser();
  }, [id]);

  async function writeUserLog(action: string, details: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("admin_logs").insert([
      {
        admin_id: user.id,
        action,
        target_type: "user",
        target_id: id,
        details,
      },
    ]);
  }

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

    if (profile.role === "owner" && !isSelf(user.id)) {
      alert("不能修改其他 owner 身份");
      return;
    }

    if (isSelf(user.id) && profile.role === "owner" && newRole !== "owner") {
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

    await writeUserLog("update_role", `修改身份为 ${newRole}`);

    setProfile((current: any) => ({
      ...current,
      role: newRole,
    }));

    fetchUser();
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

    if (currentRole === "admin" && profile.role === "owner") {
      alert("admin 无法管理 owner");
      return;
    }

    if (isTargetOwner() && !isSelf(user.id)) {
      alert("不能修改其他 owner 的状态。");
      return;
    }

    if (isTargetOwner() && newStatus !== "active") {
      alert("owner 不能被警告、禁言或封禁。");
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

    await writeUserLog("update_status", `修改状态为 ${newStatus}`);

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
      notificationContent = "由于违反社区规范，你的账号已被封禁。";
    }

    if (notificationTitle && notificationContent) {
      await supabase.from("notifications").insert([
        {
          user_id: id,
          title: notificationTitle,
          content: notificationContent,
          type: "system",
          is_important: true,
        },
      ]);

      window.dispatchEvent(new Event("notifications-updated"));
    }

    setProfile((current: any) => ({
      ...current,
      status: newStatus,
    }));

    fetchUser();
    alert("状态已更新 🚨");
  }

  async function updateGrowth(updates: any, message: string) {
    if (currentRole !== "owner" && currentRole !== "admin") {
      alert("只有 owner / admin 可以调整成长数值。");
      return false;
    }

    if (currentRole === "admin" && profile.role === "owner") {
      alert("admin 无法调整 owner 的成长数值。");
      return false;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", id);

    if (error) {
      alert(error.message);
      return false;
    }

    await writeUserLog("update_growth", message);

    setProfile((current: any) => ({
      ...current,
      ...updates,
    }));

    fetchUser();
    return true;
  }

  async function addLight(amount: number) {
    const currentLight = toNumber(profile.exp);
    const nextLight = Number((currentLight + amount).toFixed(2));

    const success = await updateGrowth(
      {
        exp: nextLight,
      },
      `留下的光 +${amount.toFixed(2)}，目前 ${nextLight.toFixed(2)}`
    );

    if (!success) return;

    await supabase.from("notifications").insert([
      {
        user_id: id,
        title: "✨ 留下的光增加",
        content: `你获得了 ${amount.toFixed(2)} 点「留下的光」。当前留下的光：${nextLight.toFixed(2)}`,
        type: "system",
      },
    ]);

    window.dispatchEvent(new Event("notifications-updated"));
  }

  async function adjustTrust(amount: number) {
    const currentTrust = toNumber(profile.trust_score);
    const nextTrust = Math.max(0, Number((currentTrust + amount).toFixed(2)));

    const success = await updateGrowth(
      {
        trust_score: nextTrust,
      },
      `社区信任 ${amount > 0 ? "+" : ""}${amount.toFixed(2)}，目前 ${nextTrust.toFixed(2)}`
    );

    if (!success) return;

    await supabase.from("notifications").insert([
      {
        user_id: id,
        title: "🌙 社区信任变化",
        content: `你的社区信任 ${
          amount > 0 ? "增加" : "减少"
        }了 ${Math.abs(amount).toFixed(2)} 点。当前社区信任：${nextTrust.toFixed(2)}`,
        type: "system",
      },
    ]);

    window.dispatchEvent(new Event("notifications-updated"));
  }

  async function changeLevel(amount: number) {
    const nextLevel = Math.min(5, Math.max(1, (profile.level || 1) + amount));

    const success = await updateGrowth(
      {
        level: nextLevel,
      },
      `等级 ${amount > 0 ? "+" : ""}${amount}，目前 Lv.${nextLevel}`
    );

    if (!success) return;

    await supabase.from("notifications").insert([
      {
        user_id: id,
        title: "🏆 居民等级变更",
        content: `你的居民等级已变更为 Lv.${nextLevel}`,
        type: "system",
        is_important: true,
      },
    ]);

    window.dispatchEvent(new Event("notifications-updated"));
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

  function getPostTitle(post: any) {
    if (post.title) return post.title;

    if (post.type === "diary") {
      return `日记 · ${new Date(post.created_at).toLocaleDateString("zh-CN")}`;
    }

    return "无标题内容";
  }

  function getPostHref(post: any) {
    if (post.type === "diary") return `/diary/${post.id}`;
    if (post.type === "article" && post.slug) return `/articles/${post.slug}`;
    return "/admin/content";
  }

  if (!profile) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
        读取居民资料中...
      </div>
    );
  }

  const roomHref = profile.username
    ? `/u/${encodeURIComponent(profile.username)}`
    : "/admin/users";

  return (
    <div className="space-y-8">
      
      <UserProfileHeader
        profile={profile}
        currentRole={currentRole}
        roomHref={roomHref}
        updateRole={updateRole}
        updateStatus={updateStatus}
        getRoleStyle={getRoleStyle}
        getStatusStyle={getStatusStyle}
      />

      <UserStats
        profile={profile}
        stats={stats}
        badgeTotal={badges.length}
        formatDecimal={formatDecimal}
      />

      <UserGrowthActions
        currentRole={currentRole}
        addLight={addLight}
        adjustTrust={adjustTrust}
        changeLevel={changeLevel}
      />

      <UserBioCard bio={profile.bio} />

      <UserBadges badges={badges} />

      <UserRecentPosts
        posts={userPosts}
        getPostHref={getPostHref}
        getPostTitle={getPostTitle}
      />

      <UserRecentComments comments={userComments} />

      <UserRelatedReports reports={relatedReports} />
      <UserAdminLogs logs={adminLogs} />

      <UserJoinedCard createdAt={profile.created_at} />
    </div>
  );
}