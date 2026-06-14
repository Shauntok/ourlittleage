"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function AdminHomePage() {
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    users: 0,
    todayUsers: 0,
    onlineUsers: 0,
    articles: 0,
    diaries: 0,
    todayPosts: 0,
    comments: 0,
    todayComments: 0,
    reports: 0,
    feedbacks: 0,
    muted: 0,
    banned: 0,
  });

  const [latestUsers, setLatestUsers] = useState<any[]>([]);
  const [latestPosts, setLatestPosts] = useState<any[]>([]);
  const [latestReports, setLatestReports] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function getCount(table: string, filter?: (query: any) => any) {
    let query = supabase.from(table).select("id", {
      count: "exact",
      head: true,
    });

    if (filter) query = filter(query);

    const { count } = await query;
    return count || 0;
  }

  async function loadDashboard() {
    setLoading(true);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const [
      users,
      todayUsers,
      onlineUsers,
      articles,
      diaries,
      todayPosts,
      comments,
      todayComments,
      reports,
      feedbacks,
      muted,
      banned,
    ] = await Promise.all([
      getCount("profiles"),
      getCount("profiles", (q) => q.gte("created_at", todayStart.toISOString())),
      getCount("profiles", (q) => q.gte("last_seen_at", fiveMinutesAgo)),
      getCount("posts", (q) => q.eq("type", "article")),
      getCount("posts", (q) => q.eq("type", "diary")),
      getCount("posts", (q) => q.gte("created_at", todayStart.toISOString())),
      getCount("comments"),
      getCount("comments", (q) =>
        q.gte("created_at", todayStart.toISOString())
      ),
      getCount("reports", (q) =>
        q.neq("status", "resolved").neq("status", "rejected")
      ),
      getCount("feedbacks", (q) =>
        q.neq("status", "resolved").neq("status", "closed")
      ),
      getCount("profiles", (q) => q.eq("status", "muted")),
      getCount("profiles", (q) => q.eq("status", "banned")),
    ]);

    const { data: usersData } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, role, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: postsData } = await supabase
      .from("posts")
      .select(
        "id, title, slug, content, type, status, visibility, created_at, published_at"
      )
      .order("created_at", { ascending: false })
      .limit(6);

    const { data: reportsData } = await supabase
      .from("reports")
      .select(
        `
        id,
        target_type,
        reason,
        status,
        created_at,
        profiles (
          username
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(6);

    setStats({
      users,
      todayUsers,
      onlineUsers,
      articles,
      diaries,
      todayPosts,
      comments,
      todayComments,
      reports,
      feedbacks,
      muted,
      banned,
    });

    setLatestUsers(usersData || []);
    setLatestPosts(postsData || []);
    setLatestReports(reportsData || []);
    setLoading(false);
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

  if (loading) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-8 text-zinc-500 md:p-10">
        正在读取小时代后台数据...
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-10">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="min-w-0">
          <p className="text-xs tracking-[0.3em] text-zinc-600 md:tracking-[0.35em]">
            ADMIN CONTROL CENTER
          </p>

          <h1 className="mt-3 text-3xl font-bold md:mt-4 md:text-4xl">
            小时代控制中心 🌙
          </h1>

          <p className="mt-3 text-sm leading-7 text-zinc-500 md:text-base">
            平台运营概览、风险提醒与快速处理入口。
          </p>
        </div>

        <button
          onClick={loadDashboard}
          className="w-full rounded-full border border-zinc-700 bg-zinc-950 px-5 py-3 text-sm text-zinc-300 transition hover:border-white hover:text-white md:w-auto"
        >
          刷新数据
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard title="居民总数" value={stats.users} icon="👥" />
        <StatCard title="今日新增" value={stats.todayUsers} icon="🌱" />
        <StatCard title="当前在线" value={stats.onlineUsers} icon="🟢" />
        <StatCard title="文章" value={stats.articles} icon="📝" />
        <StatCard title="日记" value={stats.diaries} icon="📔" />
        <StatCard title="今日内容" value={stats.todayPosts} icon="✨" />
        <StatCard title="评论总数" value={stats.comments} icon="💬" />
        <StatCard title="今日评论" value={stats.todayComments} icon="🗣️" />
        <StatCard title="待处理举报" value={stats.reports} icon="🚩" danger />
        <StatCard title="待处理反馈" value={stats.feedbacks} icon="💌" danger />
        <StatCard title="禁言用户" value={stats.muted} icon="🔇" />
        <StatCard title="封禁用户" value={stats.banned} icon="🚫" danger />
      </div>

      {(stats.reports > 0 || stats.banned > 0 || stats.muted > 0) && (
        <section className="rounded-3xl border border-red-500/20 bg-red-500/[0.06] p-5 md:p-6">
          <h2 className="text-xl font-bold text-red-100 md:text-2xl">
            风险提醒
          </h2>

          <div className="mt-4 space-y-2 text-sm leading-7 text-red-100/70">
            {stats.reports > 0 && <p>🚩 还有 {stats.reports} 条举报需要处理。</p>}
            {stats.muted > 0 && <p>🔇 当前有 {stats.muted} 位居民处于禁言状态。</p>}
            {stats.banned > 0 && <p>🚫 当前有 {stats.banned} 位居民被封禁。</p>}
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-2 md:gap-3">
        <QuickLink href="/admin/users" primary>
          👥 居民管理
        </QuickLink>
        <QuickLink href="/admin/comments">💬 评论管理</QuickLink>
        <QuickLink href="/admin/reports">🚩 举报中心</QuickLink>
        <QuickLink href="/admin/content">📚 内容管理</QuickLink>
        <QuickLink href="/admin/badges">🎖️ 徽章系统</QuickLink>
        <QuickLink href="/admin/growth">✨ 成长记录</QuickLink>
        <QuickLink href="/admin/feedback">💌 反馈中心</QuickLink>
        <QuickLink href="/admin/announcements">📢 世界公告</QuickLink>
        <QuickLink href="/admin/broadcast">📬 全站信件</QuickLink>
      </div>

      <div className="grid gap-5 xl:grid-cols-2 xl:gap-6">
        <section className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-5 md:p-6">
          <SectionHeader title="最新注册居民" href="/admin/users" label="查看全部 →" />

          <div className="space-y-3">
            {latestUsers.length === 0 && <p className="text-zinc-500">暂无居民。</p>}

            {latestUsers.map((user) => (
              <Link
                key={user.id}
                href={`/admin/users/${user.id}`}
                className="block min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-black/30 p-4 transition hover:border-zinc-500"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="safe-text truncate font-semibold text-zinc-100">
                      {user.username || "无名居民"}
                    </p>

                    <p className="mt-1 text-xs text-zinc-600">
                      {user.role || "user"} · {user.status || "active"}
                    </p>
                  </div>

                  <p className="shrink-0 text-xs text-zinc-600">
                    {new Date(user.created_at).toLocaleDateString("zh-CN")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-5 md:p-6">
          <SectionHeader title="最新举报" href="/admin/reports" label="去处理 →" />

          <div className="space-y-3">
            {latestReports.length === 0 && (
              <p className="text-zinc-500">目前没有举报。</p>
            )}

            {latestReports.map((report) => {
              const profile = Array.isArray(report.profiles)
                ? report.profiles[0]
                : report.profiles;

              return (
                <Link
                  key={report.id}
                  href="/admin/reports"
                  className="block min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-black/30 p-4 transition hover:border-zinc-500"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="safe-text truncate font-semibold text-zinc-100">
                        🚩 {report.reason || "没有填写原因"}
                      </p>

                      <p className="mt-1 text-xs text-zinc-600">
                        举报人：{profile?.username || "未知居民"} ·{" "}
                        {report.target_type}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs text-yellow-300">
                      {report.status || "pending"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-5 md:p-6">
        <SectionHeader title="最新内容" href="/admin/content" label="内容管理 →" />

        <div className="space-y-3">
          {latestPosts.length === 0 && <p className="text-zinc-500">暂无内容。</p>}

          {latestPosts.map((post) => (
            <div
              key={post.id}
              className="min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-black/30 p-4"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="min-w-0">
                  <p className="safe-text truncate font-semibold text-zinc-100">
                    {getPostTitle(post)}
                  </p>

                  <p className="mt-1 text-xs text-zinc-600">
                    {post.type || "unknown"} · {post.status} · {post.visibility}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    href={getPostHref(post)}
                    target="_blank"
                    className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition hover:border-white hover:text-white"
                  >
                    查看
                  </Link>

                  <Link
                    href="/admin/content"
                    className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition hover:border-white hover:text-white"
                  >
                    管理
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function QuickLink({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "rounded-full border border-white bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
          : "rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-300 transition hover:border-white hover:text-white"
      }
    >
      {children}
    </Link>
  );
}

function SectionHeader({
  title,
  href,
  label,
}: {
  title: string;
  href: string;
  label: string;
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <h2 className="text-xl font-bold md:text-2xl">{title}</h2>

      <Link href={href} className="shrink-0 text-sm text-zinc-500 transition hover:text-white">
        {label}
      </Link>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  danger = false,
}: {
  title: string;
  value: number;
  icon: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 md:rounded-3xl md:p-6 ${
        danger
          ? "border-red-500/20 bg-red-500/[0.06]"
          : "border-zinc-800 bg-zinc-950/60"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="safe-text truncate text-xs text-zinc-500 md:text-sm">
          {title}
        </p>

        <span className="shrink-0 text-lg md:text-xl">{icon}</span>
      </div>

      <p className="mt-3 text-3xl font-bold md:mt-4 md:text-4xl">{value}</p>
    </div>
  );
}