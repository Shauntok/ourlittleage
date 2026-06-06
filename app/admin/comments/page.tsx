"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "hidden" | "deleted">(
    "active"
  );

  useEffect(() => {
    fetchComments();
  }, [filter]);

  async function fetchComments() {
    setLoading(true);

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

    setComments(data || []);
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

      <div className="flex flex-wrap gap-3">
        {[
          {
            key: "active",
            label: "正常评论",
          },
          {
            key: "hidden",
            label: "已隐藏",
          },
          {
            key: "deleted",
            label: "已删除",
          },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key as any)}
            className={
              filter === item.key
                ? "rounded-full border border-white bg-white px-5 py-3 text-sm font-semibold text-black transition"
                : "rounded-full border border-zinc-800 bg-zinc-950 px-5 py-3 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-white"
            }
          >
            {item.label}
          </button>
        ))}
      </div>

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
        {comments.map((comment) => {
          const profile = Array.isArray(comment.profiles)
            ? comment.profiles[0]
            : comment.profiles;

          const post = Array.isArray(comment.posts)
            ? comment.posts[0]
            : comment.posts;

          return (
            <div
              key={comment.id}
              className="min-w-0 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6"
            >
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                <div className="min-w-0 flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-zinc-800 bg-zinc-900">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.username || "居民"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm">
                          🌙
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="safe-text font-semibold text-zinc-100">
                        {profile?.username || "未知居民"}
                      </p>

                      <p className="text-xs text-zinc-600">
                        {new Date(comment.created_at).toLocaleString("zh-CN")}
                      </p>
                    </div>
                  </div>

                  <p className="safe-pre rounded-2xl border border-zinc-800 bg-black/30 p-4 text-sm leading-8 text-zinc-300">
                    {comment.content}
                  </p>

                  <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                    <span>
                      目标：
                      {post?.type === "diary"
                        ? "日记"
                        : post?.type === "article"
                        ? "文章"
                        : "未知内容"}
                    </span>

                    {post && (
                      <Link
                        href={getPostHref(comment)}
                        target="_blank"
                        className="text-zinc-400 transition hover:text-white"
                      >
                        查看原文 ↗
                      </Link>
                    )}

                    <span>ID: {comment.id}</span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 md:flex-col">
                  {!comment.is_hidden && !comment.is_deleted && (
                    <button
                      onClick={() => hideComment(comment.id)}
                      className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300 transition hover:bg-yellow-500/20"
                    >
                      隐藏
                    </button>
                  )}

                  {(comment.is_hidden || comment.is_deleted) && (
                    <button
                      onClick={() => restoreComment(comment.id)}
                      className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-300 transition hover:bg-green-500/20"
                    >
                      恢复
                    </button>
                  )}

                  {!comment.is_deleted && (
                    <button
                      onClick={() => deleteComment(comment.id)}
                      className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/20"
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}