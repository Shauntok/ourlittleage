"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type ContentFilter = "all" | "article" | "diary";
type StatusFilter = "all" | "published" | "draft";
type VisibilityFilter =
  | "all"
  | "public"
  | "hidden"
  | "private"
  | "unlisted";

export default function AdminContentPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, any>>({});

  const [filter, setFilter] = useState<ContentFilter>("all");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all");

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function fetchContent() {
    setLoading(true);

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const rows = data || [];
    setPosts(rows);

    const authorIds = Array.from(
      new Set(
        rows
          .map((post) => post.author_id)
          .filter(Boolean)
      )
    );

    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, role, status")
        .in("id", authorIds);

      const nextProfileMap: Record<string, any> = {};

      (profiles || []).forEach((profile: any) => {
        nextProfileMap[profile.id] = profile;
      });

      setProfileMap(nextProfileMap);
    } else {
      setProfileMap({});
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchContent();
  }, []);

  async function writeLog(
    action: string,
    targetId: string | number,
    details: string
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("admin_logs").insert([
      {
        admin_id: user.id,
        action,
        target_type: "post",
        target_id: String(targetId),
        details,
      },
    ]);
  }

  async function updateVisibility(id: number, visibility: string) {
    const confirmed = confirm(`确定把这篇内容设为 ${visibility} 吗？`);
    if (!confirmed) return;

    const { error } = await supabase
      .from("posts")
      .update({
        visibility,
        edited_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await writeLog(
      "update_content_visibility",
      id,
      `内容可见性修改为 ${visibility}`
    );

    fetchContent();
  }

  async function deletePost(id: number) {
    const confirmed = confirm(
      "确定删除这篇内容？这个动作不能恢复。"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await writeLog(
      "delete_content",
      id,
      "删除内容"
    );

    fetchContent();
  }

  function getTitle(post: any) {
    if (post.title) return post.title;

    return `日记 · ${new Date(
      post.created_at
    ).toLocaleDateString("zh-CN")}`;
  }

  function getViewHref(post: any) {
    if (post.type === "diary") return `/diary/${post.id}`;

    if (post.type === "article" && post.slug) {
      return `/articles/${post.slug}`;
    }

    return "/admin/content";
  }

  const filteredPosts = posts.filter((post) => {
    const keyword = search.toLowerCase().trim();
    const author = profileMap[post.author_id];

    const matchType =
      filter === "all" || post.type === filter;

    const matchStatus =
      statusFilter === "all" ||
      post.status === statusFilter;

    const matchVisibility =
      visibilityFilter === "all" ||
      post.visibility === visibilityFilter;

    const matchSearch =
      !keyword ||
      String(post.id).toLowerCase().includes(keyword) ||
      post.title?.toLowerCase().includes(keyword) ||
      post.slug?.toLowerCase().includes(keyword) ||
      post.content?.toLowerCase().includes(keyword) ||
      post.author_id?.toLowerCase().includes(keyword) ||
      author?.username?.toLowerCase().includes(keyword);

    return (
      matchType &&
      matchStatus &&
      matchVisibility &&
      matchSearch
    );
  });

  return (
    <div className="space-y-8 overflow-hidden">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <h1 className="text-4xl font-bold">
            内容管理 📚
          </h1>

          <p className="mt-2 text-zinc-500">
            搜索、筛选和管理全站文章与日记。
          </p>
        </div>

        <button
          onClick={fetchContent}
          className="rounded-full border border-zinc-700 bg-zinc-950 px-5 py-3 text-sm text-zinc-300 transition hover:border-white hover:text-white"
        >
          刷新内容
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜索标题、内容、slug、作者、ID..."
        className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4 outline-none transition focus:border-white"
      />

      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          {[
            { key: "all", label: "全部", count: posts.length },
            {
              key: "article",
              label: "文章",
              count: posts.filter((post) => post.type === "article").length,
            },
            {
              key: "diary",
              label: "日记",
              count: posts.filter((post) => post.type === "diary").length,
            },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key as ContentFilter)}
              className={
                filter === item.key
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

        <div className="flex flex-wrap gap-3">
          {[
            { key: "all", label: "全部状态" },
            { key: "published", label: "已发布" },
            { key: "draft", label: "草稿" },
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
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          {[
            { key: "all", label: "全部可见性" },
            { key: "public", label: "公开" },
            { key: "hidden", label: "隐藏" },
            { key: "private", label: "私密" },
            { key: "unlisted", label: "链接可见" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() =>
                setVisibilityFilter(item.key as VisibilityFilter)
              }
              className={
                visibilityFilter === item.key
                  ? "rounded-full border border-white bg-white px-5 py-3 text-sm font-semibold text-black transition"
                  : "rounded-full border border-zinc-800 bg-zinc-950 px-5 py-3 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-white"
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-full border border-zinc-800 bg-zinc-950 px-5 py-3 text-sm text-zinc-400">
        显示 {filteredPosts.length} / {posts.length} 条内容
      </div>

      {loading && (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
          正在读取内容...
        </div>
      )}

      {!loading && filteredPosts.length === 0 && (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
          没有找到符合条件的内容。
        </div>
      )}

      <div className="space-y-4">
        {filteredPosts.map((post) => {
          const author = profileMap[post.author_id];

          return (
            <div
              key={post.id}
              className="
                min-w-0 overflow-hidden
                rounded-3xl border border-zinc-800
                bg-zinc-950/50 p-6
                transition hover:border-zinc-600
              "
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                  {post.type === "diary" ? "📔 日记" : "📖 文章"}
                </span>

                <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs text-green-300">
                  {post.status || "unknown"}
                </span>

                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-300">
                  {post.visibility || "public"}
                </span>

                <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-500">
                  ID {post.id}
                </span>
              </div>

              <h2 className="safe-text mt-5 text-2xl font-bold text-white">
                {getTitle(post)}
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                <span>
                  作者：
                  {author?.username || "未知居民"}
                </span>

                {post.author_id && (
                  <Link
                    href={`/admin/users/${post.author_id}`}
                    className="text-zinc-400 transition hover:text-white"
                  >
                    查看作者后台 →
                  </Link>
                )}
              </div>

              {post.content && (
                <p className="safe-pre mt-4 line-clamp-3 max-w-full overflow-hidden text-sm leading-7 text-zinc-500">
                  {post.content}
                </p>
              )}

              <p className="mt-4 text-xs text-zinc-600">
                创建：{new Date(post.created_at).toLocaleString("zh-CN")}
                {post.published_at &&
                  ` · 发布：${new Date(
                    post.published_at
                  ).toLocaleString("zh-CN")}`}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={getViewHref(post)}
                  target="_blank"
                  className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-white hover:text-white"
                >
                  查看
                </Link>

                <button
                  onClick={() =>
                    updateVisibility(post.id, "public")
                  }
                  className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-300 transition hover:bg-green-500/20"
                >
                  公开
                </button>

                <button
                  onClick={() =>
                    updateVisibility(post.id, "hidden")
                  }
                  className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300 transition hover:bg-yellow-500/20"
                >
                  隐藏
                </button>

                <button
                  onClick={() =>
                    updateVisibility(post.id, "private")
                  }
                  className="rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300 transition hover:bg-blue-500/20"
                >
                  私密
                </button>

                <button
                  onClick={() =>
                    updateVisibility(post.id, "unlisted")
                  }
                  className="rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-300 transition hover:bg-purple-500/20"
                >
                  链接可见
                </button>

                <button
                  onClick={() => deletePost(post.id)}
                  className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/20"
                >
                  删除
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}