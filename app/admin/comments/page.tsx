"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import CommentFilters from "@/components/admin/comments/CommentFilters";
import CommentCard from "@/components/admin/comments/CommentCard";
import CommentSearch from "@/components/admin/comments/CommentSearch";

import type { CommentFilter } from "@/components/admin/comments/types";

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CommentFilter>("active");
  const [search, setSearch] = useState("");
  const [allComments, setAllComments] = useState<any[]>([]);

  useEffect(() => {
    fetchComments();
  }, [filter]);

  async function fetchComments() {
    setLoading(true);

    const { data: allRows } = await supabase
      .from("comments")
      .select("id,is_hidden,is_deleted");

    setAllComments(allRows || []);

    let query = supabase
      .from("comments")
      .select(`
        *,
        profiles (
          username,
          avatar_url
        ),
        posts (
          id,
          title,
          slug,
          type
        )
      `)
      .order("created_at", {
        ascending: false,
      });

    if (filter === "active") {
      query = query.eq("is_hidden", false).eq("is_deleted", false);
    }

    if (filter === "hidden") {
      query = query.eq("is_hidden", true).eq("is_deleted", false);
    }

    if (filter === "deleted") {
      query = query.eq("is_deleted", true);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const rows = data || [];

    setComments(rows);
    setLoading(false);
  }

  async function writeLog(action: string, commentId: string, details: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("admin_logs").insert([
      {
        admin_id: user.id,
        action,
        target_type: "comment",
        target_id: commentId,
        details,
      },
    ]);
  }

  async function hideComment(commentId: string) {
    const confirmed = confirm("确定隐藏这条评论吗？");
    if (!confirmed) return;

    const { error } = await supabase
      .from("comments")
      .update({
        is_hidden: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId);

    if (error) {
      alert(error.message);
      return;
    }

    await writeLog("hide_comment", commentId, "隐藏评论");
    fetchComments();
  }

  async function restoreComment(commentId: string) {
    const { error } = await supabase
      .from("comments")
      .update({
        is_hidden: false,
        is_deleted: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId);

    if (error) {
      alert(error.message);
      return;
    }

    await writeLog("restore_comment", commentId, "恢复评论");
    fetchComments();
  }

  async function deleteComment(commentId: string) {
    const confirmed = confirm("确定删除这条评论吗？这会软删除，不会直接从数据库移除。");
    if (!confirmed) return;

    const { error } = await supabase
      .from("comments")
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId);

    if (error) {
      alert(error.message);
      return;
    }

    await writeLog("delete_comment", commentId, "软删除评论");
    fetchComments();
  }

  const totalComments = allComments.length;

  const activeCount = allComments.filter(
    (item) => !item.is_hidden && !item.is_deleted
  ).length;

  const hiddenCount = allComments.filter(
    (item) => item.is_hidden && !item.is_deleted
  ).length;

  const deletedCount = allComments.filter(
    (item) => item.is_deleted
  ).length;

  const filteredComments = comments.filter((comment) => {
  const keyword = search.toLowerCase().trim();

  if (!keyword) return true;

  const profile = Array.isArray(comment.profiles)
    ? comment.profiles[0]
    : comment.profiles;

  const post = Array.isArray(comment.posts)
    ? comment.posts[0]
    : comment.posts;

  return (
    String(comment.id).toLowerCase().includes(keyword) ||
    comment.content?.toLowerCase().includes(keyword) ||
    profile?.username?.toLowerCase().includes(keyword) ||
    post?.title?.toLowerCase().includes(keyword) ||
    post?.slug?.toLowerCase().includes(keyword)
  );
});

  function getPostHref(comment: any) {
    const post = comment.posts;

    if (!post) return "/admin/published";

    if (post.type === "diary") {
      return `/diary/${post.id}`;
    }

    if (post.type === "article" && post.slug) {
      return `/articles/${post.slug}`;
    }

    return "/admin/published";
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <h1 className="text-4xl font-bold">
            评论管理 💬
          </h1>

          <p className="mt-2 text-zinc-500">
            查看、隐藏、恢复和删除居民评论。
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="总评论"
          value={totalComments}
        />

        <StatCard
          title="正常评论"
          value={activeCount}
        />

        <StatCard
          title="已隐藏"
          value={hiddenCount}
        />

        <StatCard
          title="已删除"
          value={deletedCount}
        />
      </div>

      <CommentSearch search={search} setSearch={setSearch} />

      <CommentFilters filter={filter} setFilter={setFilter} />

      {loading && (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
          正在读取评论...
        </div>
      )}

      {!loading && comments.length === 0 && (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
          这个分类暂时没有评论。
        </div>
      )}

      <div className="space-y-4">
        {comments.map((comment) => (
          <CommentCard
            key={comment.id}
            comment={comment}
            getPostHref={getPostHref}
            hideComment={hideComment}
            restoreComment={restoreComment}
            deleteComment={deleteComment}
          />
        ))}
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
      <p className="text-sm text-zinc-500">
        {title}
      </p>

      <p className="mt-3 text-3xl font-bold text-white">
        {value}
      </p>
    </div>
  );
}

