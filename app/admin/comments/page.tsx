"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import CommentFilters from "@/components/admin/comments/CommentFilters";
import CommentCard from "@/components/admin/comments/CommentCard";
import CommentSearch from "@/components/admin/comments/CommentSearch";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

import type { CommentFilter } from "@/components/admin/comments/types";

type ConfirmConfig = {
  title: string;
  description: string;
  confirmText: string;
  danger?: boolean;
  action: (() => Promise<void>) | null;
};

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CommentFilter>("active");
  const [search, setSearch] = useState("");
  const [allComments, setAllComments] = useState<any[]>([]);

  const [message, setMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig>({
    title: "",
    description: "",
    confirmText: "确认",
    danger: false,
    action: null,
  });

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  function showMessage(text: string) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 3500);
  }

  function openConfirm(config: ConfirmConfig) {
    setConfirmConfig(config);
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    if (!confirmConfig.action) return;

    setConfirmLoading(true);
    await confirmConfig.action();
    setConfirmLoading(false);
    setConfirmOpen(false);
  }

  async function fetchComments() {
    setLoading(true);

    const { data: allRows } = await supabase
      .from("comments")
      .select("id,is_hidden,is_deleted");

    setAllComments(allRows || []);

    let query = supabase
      .from("comments")
      .select(
        `
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
      `
      )
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
      showMessage(error.message);
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

  function hideComment(commentId: string) {
    openConfirm({
      title: "隐藏这条评论？",
      description: "隐藏后，普通居民将不会再看到这条评论。",
      confirmText: "隐藏评论",
      danger: true,
      action: async () => {
        const { error } = await supabase
          .from("comments")
          .update({
            is_hidden: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", commentId);

        if (error) {
          showMessage(error.message);
          return;
        }

        await writeLog("hide_comment", commentId, "隐藏评论");
        await fetchComments();
      },
    });
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
      showMessage(error.message);
      return;
    }

    await writeLog("restore_comment", commentId, "恢复评论");
    await fetchComments();
  }

  function deleteComment(commentId: string) {
    openConfirm({
      title: "删除这条评论？",
      description: "这会软删除评论，不会直接从数据库移除。",
      confirmText: "删除评论",
      danger: true,
      action: async () => {
        const { error } = await supabase
          .from("comments")
          .update({
            is_deleted: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", commentId);

        if (error) {
          showMessage(error.message);
          return;
        }

        await writeLog("delete_comment", commentId, "软删除评论");
        await fetchComments();
      },
    });
  }

  const totalComments = allComments.length;

  const activeCount = allComments.filter(
    (item) => !item.is_hidden && !item.is_deleted
  ).length;

  const hiddenCount = allComments.filter(
    (item) => item.is_hidden && !item.is_deleted
  ).length;

  const deletedCount = allComments.filter((item) => item.is_deleted).length;

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
    const post = Array.isArray(comment.posts)
      ? comment.posts[0]
      : comment.posts;

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
          <h1 className="text-4xl font-bold">评论管理 💬</h1>

          <p className="mt-2 text-zinc-500">
            查看、隐藏、恢复和删除居民评论。
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="总评论" value={totalComments} />
        <StatCard title="正常评论" value={activeCount} />
        <StatCard title="已隐藏" value={hiddenCount} />
        <StatCard title="已删除" value={deletedCount} />
      </div>

      <CommentSearch search={search} setSearch={setSearch} />

      <CommentFilters filter={filter} setFilter={setFilter} />

      {loading && (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
          正在读取评论...
        </div>
      )}

      {!loading && filteredComments.length === 0 && (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
          这个分类暂时没有评论。
        </div>
      )}

      <div className="space-y-4">
        {filteredComments.map((comment) => (
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

      {message && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-white/10 bg-zinc-900/95 px-5 py-3 text-sm text-white shadow-2xl backdrop-blur-xl">
          {message}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmText={confirmConfig.confirmText}
        cancelText="取消"
        danger={confirmConfig.danger}
        loading={confirmLoading}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
      />
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

      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}