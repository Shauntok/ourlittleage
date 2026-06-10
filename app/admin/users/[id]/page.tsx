"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

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
        created_at,
        badges (
          id,
          name,
          color,
          description
        ),
        assigner:assigned_by (
          id,
          username
        )
      `)
      .eq("user_id", id);

    setBadges(badgeData || []);

    const { data: postsData } = await supabase
      .from("posts")
      .select("id, title, slug, content, type, status, visibility, created_at, published_at")
      .eq("author_id", id)
      .order("created_at", { ascending: false })
      .limit(8);

    setUserPosts(postsData || []);

    const { count: articleTotal } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", id)
      .eq("type", "article");

    const { count: diaryTotal } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", id)
      .eq("type", "diary");

    const { count: commentTotal } = await supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("author_id", id)
      .eq("is_deleted", false);

    setStats({
      articleTotal: articleTotal || 0,
      diaryTotal: diaryTotal || 0,
      commentTotal: commentTotal || 0,
      reportTotal: 0,
    });

    const { data: commentsData } = await supabase
      .from("comments")
      .select("id, content, post_id, created_at, is_hidden, is_deleted")
      .eq("author_id", id)
      .order("created_at", { ascending: false })
      .limit(8);

    setUserComments(commentsData || []);

    const postIds = (postsData || []).map((post) => String(post.id));
    const commentIds = (commentsData || []).map((comment) => String(comment.id));

    const { data: reportsData } = await supabase
      .from("reports")
      .select(`
        *,
        profiles (
          username
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    const filteredReports = (reportsData || []).filter((report: any) => {
      const targetId = String(report.target_id || "");

      return (
        report.target_user_id === id ||
        report.reported_user_id === id ||
        report.user_id === id ||
        postIds.includes(targetId) ||
        commentIds.includes(targetId)
      );
    });

    setRelatedReports(filteredReports.slice(0, 8));

    setStats((current) => ({
      ...current,
      reportTotal: filteredReports.length,
    }));

    const { data: logsData } = await supabase
      .from("admin_logs")
      .select("*")
      .eq("target_type", "user")
      .eq("target_id", id)
      .order("created_at", { ascending: false })
      .limit(8);

    setAdminLogs(logsData || []);

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
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
        <div className="flex min-w-0 items-center gap-5">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border border-zinc-800 bg-zinc-900">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username || "居民"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl text-zinc-600">
                👤
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-3">
            <div>
              <h1 className="safe-text text-4xl font-bold">
                {profile.username || "无名居民"}
              </h1>

              <p className="mt-2 break-all text-sm text-zinc-500">
                {profile.id}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {currentRole === "owner" || currentRole === "admin" ? (
                <select
                  value={profile.role || "user"}
                  onChange={(e) => updateRole(e.target.value)}
                  className={`rounded-full border bg-black px-3 py-1 text-sm outline-none ${getRoleStyle(
                    profile.role || "user"
                  )}`}
                >
                  <option value="user">user</option>
                  <option value="moderator">moderator</option>

                  {currentRole === "owner" && <option value="admin">admin</option>}
                  {currentRole === "owner" && <option value="owner">owner</option>}
                </select>
              ) : (
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-sm ${getRoleStyle(
                    profile.role || "user"
                  )}`}
                >
                  {profile.role || "user"}
                </span>
              )}

              {currentRole === "owner" || currentRole === "admin" ? (
                <select
                  value={profile.status || "active"}
                  onChange={(e) => updateStatus(e.target.value)}
                  className={`rounded-full border bg-black px-3 py-1 text-sm outline-none ${getStatusStyle(
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

        <Link
          href={roomHref}
          target="_blank"
          className="rounded-full border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm text-zinc-300 transition hover:border-white hover:text-white"
        >
          查看居民房间 ↗
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
        <StatCard title="等级" value={`Lv${profile.level || 1}`} />
        <StatCard title="留下的光" value={formatDecimal(profile.exp)} />
        <StatCard title="社区信任" value={formatDecimal(profile.trust_score)} />
        <StatCard title="文章" value={stats.articleTotal} />
        <StatCard title="日记" value={stats.diaryTotal} />
        <StatCard title="评论" value={stats.commentTotal} />
        <StatCard title="举报" value={stats.reportTotal} />
        <StatCard title="徽章" value={badges.length} />
      </div>

      {(currentRole === "owner" || currentRole === "admin") && (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
          <h2 className="text-2xl font-bold">成长数值调整</h2>

          <p className="mt-2 text-sm text-zinc-500">
            Alpha 当前最高 Lv5。后续 Beta 可以扩展到更高等级。
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => addLight(0.03)} className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-300 transition hover:bg-green-500/20">
              +0.03 光
            </button>

            <button onClick={() => addLight(0.05)} className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-300 transition hover:bg-green-500/20">
              +0.05 光
            </button>

            <button onClick={() => addLight(0.10)} className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-300 transition hover:bg-green-500/20">
              +0.10 光
            </button>

            <button onClick={() => changeLevel(1)} className="rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300 transition hover:bg-blue-500/20">
              等级 +1
            </button>

            <button onClick={() => changeLevel(-1)} className="rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300 transition hover:bg-blue-500/20">
              等级 -1
            </button>

            <button onClick={() => adjustTrust(0.02)} className="rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-300 transition hover:bg-purple-500/20">
              +0.02 信任
            </button>

            <button onClick={() => adjustTrust(-0.02)} className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/20">
              -0.02 信任
            </button>
          </div>
        </section>
      )}

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
        <p className="text-sm text-zinc-500">居民简介</p>

        <p className="safe-pre mt-3 text-zinc-300">
          {profile.bio || "这个居民还没有留下简介。"}
        </p>
      </div>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
        <h2 className="text-2xl font-bold">最近内容</h2>

        <div className="mt-5 space-y-3">
          {userPosts.length === 0 && (
            <p className="text-sm text-zinc-600">这个居民还没有发布内容。</p>
          )}

          {userPosts.map((post) => (
            <Link
              key={post.id}
              href={getPostHref(post)}
              target="_blank"
              className="block min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-black/30 p-4 transition hover:border-zinc-500"
            >
              <p className="safe-text font-semibold text-zinc-100">
                {getPostTitle(post)}
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                {post.type} · {post.status} · {post.visibility}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
        <h2 className="text-2xl font-bold">最近评论</h2>

        <div className="mt-5 space-y-3">
          {userComments.length === 0 && (
            <p className="text-sm text-zinc-600">这个居民还没有留下评论。</p>
          )}

          {userComments.map((comment) => (
            <div
              key={comment.id}
              className="min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-black/30 p-4"
            >
              <p className="safe-pre text-sm leading-7 text-zinc-300">
                {comment.content}
              </p>

              <p className="mt-2 text-xs text-zinc-600">
                {new Date(comment.created_at).toLocaleString("zh-CN")} ·{" "}
                {comment.is_deleted
                  ? "已删除"
                  : comment.is_hidden
                  ? "已隐藏"
                  : "正常"}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
        <h2 className="text-2xl font-bold">相关举报记录</h2>

        <div className="mt-5 space-y-3">
          {relatedReports.length === 0 && (
            <p className="text-sm text-zinc-600">暂无相关举报记录。</p>
          )}

          {relatedReports.map((report) => (
            <Link
              key={report.id}
              href="/admin/reports"
              className="block min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-black/30 p-4 transition hover:border-zinc-500"
            >
              <p className="safe-text font-semibold text-red-100">
                🚩 {report.reason || "没有填写原因"}
              </p>

              {report.details && (
                <p className="safe-pre mt-2 text-sm leading-7 text-zinc-400">
                  {report.details}
                </p>
              )}

              <p className="mt-2 text-xs text-zinc-600">
                举报人：{report.profiles?.username || "未知居民"} · 目标：
                {report.target_type || "未知"} ·{" "}
                {report.created_at
                  ? new Date(report.created_at).toLocaleString("zh-CN")
                  : "未知时间"}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
        <p className="text-sm text-zinc-500">已拥有徽章</p>

        <div className="mt-4 flex flex-wrap gap-3">
          {badges.length === 0 && (
            <p className="text-sm text-zinc-600">暂无徽章</p>
          )}

          {badges.map((item: any) => {
            const badge = item.badges;
            const assigner = Array.isArray(item.assigner)
              ? item.assigner[0]
              : item.assigner;

            if (!badge) return null;

            return (
              <div
                key={item.id}
                className="safe-text rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm"
              >
                🎖️ {badge.name}
                {assigner?.username ? ` · ${assigner.username}` : ""}
              </div>
            );
          })}
        </div>
      </div>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
        <h2 className="text-2xl font-bold">最近管理记录</h2>

        <div className="mt-5 space-y-3">
          {adminLogs.length === 0 && (
            <p className="text-sm text-zinc-600">暂无管理记录。</p>
          )}

          {adminLogs.map((log) => (
            <div
              key={log.id}
              className="min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-black/30 p-4"
            >
              <p className="safe-text font-semibold text-zinc-100">
                {log.action}
              </p>

              <p className="safe-pre mt-1 text-sm text-zinc-500">
                {log.details}
              </p>

              <p className="mt-2 text-xs text-zinc-600">
                {log.created_at
                  ? new Date(log.created_at).toLocaleString("zh-CN")
                  : "未知时间"}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
        <p className="text-sm text-zinc-500">注册时间</p>

        <p className="mt-3 text-zinc-300">
          {profile.created_at
            ? new Date(profile.created_at).toLocaleString("zh-CN")
            : "未知"}
        </p>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-5">
      <p className="text-sm text-zinc-500">{title}</p>

      <p className="safe-text mt-3 text-2xl font-bold">{value}</p>
    </div>
  );
}