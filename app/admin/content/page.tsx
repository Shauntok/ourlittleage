"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ContentFilters from "@/components/admin/content/ContentFilters";
import ContentCard from "@/components/admin/content/ContentCard";
import ContentStats from "@/components/admin/content/ContentStats";
import ContentSearch from "@/components/admin/content/ContentSearch";

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

  useEffect(() => {
    fetchContent();
  }, []);

  async function fetchContent() {
    setLoading(true);

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .is("deleted_at", null)
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
      new Set(rows.map((post) => post.author_id).filter(Boolean))
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

  async function softDeletePost(id: number) {
    const confirmed = confirm(
      "确定把这篇内容移入回收站吗？内容不会立刻永久删除，之后可恢复。"
    );

    if (!confirmed) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("请先登录。");
      return;
    }

    const { error } = await supabase
      .from("posts")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        delete_reason: "admin_soft_delete",
        edited_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await writeLog("soft_delete_content", id, "内容已移入回收站");

    fetchContent();
  }

  function getTitle(post: any) {
    if (post.title) return post.title;

    return `日记 · ${new Date(post.created_at).toLocaleDateString("zh-CN")}`;
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

    const matchType = filter === "all" || post.type === filter;

    const matchStatus =
      statusFilter === "all" || post.status === statusFilter;

    const matchVisibility =
      visibilityFilter === "all" || post.visibility === visibilityFilter;

    const matchSearch =
      !keyword ||
      String(post.id).toLowerCase().includes(keyword) ||
      post.title?.toLowerCase().includes(keyword) ||
      post.slug?.toLowerCase().includes(keyword) ||
      post.content?.toLowerCase().includes(keyword) ||
      post.author_id?.toLowerCase().includes(keyword) ||
      author?.username?.toLowerCase().includes(keyword);

    return matchType && matchStatus && matchVisibility && matchSearch;
  });

  return (
    <div className="space-y-8 overflow-hidden">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <h1 className="text-4xl font-bold">内容管理 📚</h1>

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

      <ContentStats posts={posts} />

      <ContentSearch search={search} setSearch={setSearch} />

      <ContentFilters
        posts={posts}
        filter={filter}
        setFilter={setFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        visibilityFilter={visibilityFilter}
        setVisibilityFilter={setVisibilityFilter}
      />

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
        {filteredPosts.map((post) => (
          <ContentCard
            key={post.id}
            post={post}
            author={profileMap[post.author_id]}
            updateVisibility={updateVisibility}
            softDeletePost={softDeletePost}
            getTitle={getTitle}
            getViewHref={getViewHref}
          />
        ))}
      </div>
    </div>
  );
}