"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { addUserGrowth } from "@/lib/community-growth";
import ReportButton from "@/components/ReportButton";
import { checkFirstCommentBadge } from "@/lib/badge-awards";

type Props = {
  postId: number;
};

type SortMode = "oldest" | "newest";

type ProfileInfo = {
  username: string | null;
  avatar_url: string | null;
};

type CommentItem = {
  id: string;
  post_id: number;
  author_id: string;
  content: string;
  created_at: string;
  profiles: ProfileInfo | ProfileInfo[] | null;
  likeCount?: number;
  likedByMe?: boolean;
};

function getProfile(profile: ProfileInfo | ProfileInfo[] | null) {
  if (Array.isArray(profile)) {
    return profile[0] || null;
  }

  return profile;
}

export default function PostComments({ postId }: Props) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [content, setContent] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("oldest");

  const [loading, setLoading] = useState(false);
  const [likeLoadingId, setLikeLoadingId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    fetchComments();
    getCurrentUser();
  }, [postId, sortMode]);

  async function getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setCurrentUserId(user.id);
    }
  }

  async function fetchComments() {
    setFetching(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setCurrentUserId(user.id);
    }

    const { data, error } = await supabase
      .from("comments")
      .select(`
        id,
        post_id,
        author_id,
        content,
        created_at,
        profiles (
          username,
          avatar_url
        )
      `)
      .eq("post_id", postId)
      .eq("is_deleted", false)
      .eq("is_hidden", false)
      .order("created_at", {
        ascending: sortMode === "oldest",
      });

    if (error) {
      alert(error.message);
      setFetching(false);
      return;
    }

    const rows = (data || []) as CommentItem[];
    const commentIds = rows.map((comment) => comment.id);

    const { data: likesData } =
      commentIds.length > 0
        ? await supabase
            .from("comment_likes")
            .select("comment_id, user_id, is_active")
            .in("comment_id", commentIds)
            .eq("is_active", true)
        : { data: [] as any[] };

    const likeCountMap = new Map<string, number>();
    const likedByMeMap = new Map<string, boolean>();

    (likesData || []).forEach((like: any) => {
      likeCountMap.set(
        like.comment_id,
        (likeCountMap.get(like.comment_id) || 0) + 1
      );

      if (user && like.user_id === user.id) {
        likedByMeMap.set(like.comment_id, true);
      }
    });

    const commentsWithLikes = rows.map((comment) => ({
      ...comment,
      likeCount: likeCountMap.get(comment.id) || 0,
      likedByMe: likedByMeMap.get(comment.id) || false,
    }));

    setComments(commentsWithLikes);
    setFetching(false);
  }

  async function submitComment() {
    if (!content.trim()) {
      alert("请输入评论内容。");
      return;
    }

    if (content.trim().length < 2) {
      alert("评论至少需要 2 个字。");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("请先登录。");
      return;
    }

    setLoading(true);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .single();

    if (profileError) {
      alert(profileError.message);
      setLoading(false);
      return;
    }

    if (profile?.status === "muted") {
      alert("你目前已被禁言，无法发表评论。");
      setLoading(false);
      return;
    }

    if (profile?.status === "banned") {
      alert("你的账号已被封禁。");
      await supabase.auth.signOut();
      window.location.href = "/";
      return;
    }

    const { error } = await supabase.from("comments").insert([
      {
        post_id: postId,
        author_id: user.id,
        content: content.trim(),
      },
    ]);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    await addUserGrowth({
      userId: user.id,
      light: 0.01,
      reason: "write_comment",
    });

    await checkFirstCommentBadge(user.id);

    setContent("");
    fetchComments();
  }

  async function toggleCommentLike(comment: CommentItem) {
    if (!currentUserId) {
      alert("请先登录后再喜欢留言。");
      return;
    }

    if (currentUserId === comment.author_id) {
      alert("这束光已经属于你自己了。");
      return;
    }

    setLikeLoadingId(comment.id);

    const { data: existingLike, error: existingError } = await supabase
      .from("comment_likes")
      .select("id, is_active, rewarded")
      .eq("comment_id", comment.id)
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (existingError) {
      setLikeLoadingId(null);
      alert(existingError.message);
      return;
    }

    if (existingLike?.is_active) {
      const { error } = await supabase
        .from("comment_likes")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingLike.id);

      setLikeLoadingId(null);

      if (error) {
        alert(error.message);
        return;
      }

      setComments((current) =>
        current.map((item) =>
          item.id === comment.id
            ? {
                ...item,
                likedByMe: false,
                likeCount: Math.max((item.likeCount || 0) - 1, 0),
              }
            : item
        )
      );

      return;
    }

    if (existingLike && !existingLike.is_active) {
      const { error } = await supabase
        .from("comment_likes")
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingLike.id);

      if (error) {
        setLikeLoadingId(null);
        alert(error.message);
        return;
      }

      setComments((current) =>
        current.map((item) =>
          item.id === comment.id
            ? {
                ...item,
                likedByMe: true,
                likeCount: (item.likeCount || 0) + 1,
              }
            : item
        )
      );

      if (!existingLike.rewarded) {
        const success = await addUserGrowth({
          userId: comment.author_id,
          light: 0.003,
          reason: "comment_liked",
        });

        if (success) {
          await supabase
            .from("comment_likes")
            .update({
              rewarded: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingLike.id);
        }
      }

      setLikeLoadingId(null);
      return;
    }

    const { data: insertedLike, error } = await supabase
      .from("comment_likes")
      .insert([
        {
          comment_id: comment.id,
          user_id: currentUserId,
          is_active: true,
          rewarded: false,
        },
      ])
      .select("id, rewarded")
      .single();

    if (error) {
      setLikeLoadingId(null);
      alert(error.message);
      return;
    }

    setComments((current) =>
      current.map((item) =>
        item.id === comment.id
          ? {
              ...item,
              likedByMe: true,
              likeCount: (item.likeCount || 0) + 1,
            }
          : item
      )
    );

    if (insertedLike && !insertedLike.rewarded) {
      const success = await addUserGrowth({
        userId: comment.author_id,
        light: 0.003,
        reason: "comment_liked",
      });

      if (success) {
        await supabase
          .from("comment_likes")
          .update({
            rewarded: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", insertedLike.id);
      }
    }

    setLikeLoadingId(null);
  }

  async function deleteComment(id: string) {
    const confirmed = confirm("确定删除这条留言吗？");

    if (!confirmed) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("请先登录。");
      return;
    }

    const { error } = await supabase
      .from("comments")
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("author_id", user.id);

    if (error) {
      alert(error.message);
      return;
    }

    fetchComments();
  }

  return (
    <section className="mt-24 border-t border-white/10 pt-12">
      <div>
        <p className="text-xs tracking-[0.35em] text-white/25">COMMENTS</p>

        <h2 className="mt-4 text-3xl font-light">居民留言</h2>

        <p className="mt-4 text-sm leading-7 text-white/35">
          在这里留下温柔一点的回应。也许作者今晚刚好需要这一句话。
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] backdrop-blur-2xl">
        <textarea
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="写下你的留言..."
          className="w-full resize-none bg-transparent px-5 py-5 leading-8 text-white outline-none break-words whitespace-pre-wrap placeholder:text-white/25"
        />

        <div className="flex justify-end border-t border-white/5 bg-white/[0.015] px-5 py-4">
          <button
            onClick={submitComment}
            disabled={loading}
            className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition-all duration-300 hover:scale-[1.02] hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "送出中..." : "留下留言"}
          </button>
        </div>
      </div>

      <div className="mt-14 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-white/35">
          {fetching
            ? "正在翻看留言..."
            : comments.length > 0
            ? `${comments.length} 条留言`
            : "还没有留言"}
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSortMode("oldest")}
            className={`rounded-full border px-4 py-2 text-xs transition ${
              sortMode === "oldest"
                ? "border-white bg-white text-black"
                : "border-white/10 bg-white/[0.04] text-white/45 hover:border-white/20 hover:text-white/75"
            }`}
          >
            最早
          </button>

          <button
            type="button"
            onClick={() => setSortMode("newest")}
            className={`rounded-full border px-4 py-2 text-xs transition ${
              sortMode === "newest"
                ? "border-white bg-white text-black"
                : "border-white/10 bg-white/[0.04] text-white/45 hover:border-white/20 hover:text-white/75"
            }`}
          >
            最新
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {fetching && <p className="text-sm text-white/35">正在翻看留言...</p>}

        {!fetching && comments.length === 0 && (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-sm text-white/35">这里暂时还没有留言。</p>
          </div>
        )}

        {comments.map((comment) => {
          const profile = getProfile(comment.profiles);
          const profileHref = profile?.username
            ? `/u/${encodeURIComponent(profile.username)}`
            : null;

          return (
            <div
              key={comment.id}
              className="min-w-0 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-6"
            >
              <div className="flex items-start gap-4">
                {profileHref ? (
                  <Link
                    href={profileHref}
                    className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.04] transition hover:scale-105 hover:border-white/25"
                    title="进入居民房间"
                  >
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
                  </Link>
                ) : (
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
                    <div className="flex h-full w-full items-center justify-center text-sm">
                      🌙
                    </div>
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div>
                    {profileHref ? (
                      <Link
                        href={profileHref}
                        className="safe-text inline-flex max-w-full text-sm font-medium text-white/80 transition hover:text-white"
                      >
                        {profile?.username || "已离开的居民"}
                      </Link>
                    ) : (
                      <p className="safe-text text-sm font-medium text-white/80">
                        已离开的居民
                      </p>
                    )}

                    <p className="mt-1 text-xs text-white/25">
                      {new Date(comment.created_at).toLocaleString("zh-CN")}
                    </p>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-8 text-white/65 [overflow-wrap:anywhere]">
                    {comment.content}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() => toggleCommentLike(comment)}
                      disabled={likeLoadingId === comment.id}
                      className={`rounded-full border px-4 py-2 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        comment.likedByMe
                          ? "border-pink-500/30 bg-pink-500/10 text-pink-200"
                          : "border-white/10 bg-white/[0.04] text-white/45 hover:border-pink-500/25 hover:text-pink-100"
                      }`}
                    >
                      {comment.likedByMe ? "已喜欢" : "喜欢"} ·{" "}
                      {comment.likeCount || 0}
                    </button>

                    {currentUserId !== comment.author_id && (
                      <ReportButton
                        targetType="comment"
                        targetId={comment.id}
                        authorId={comment.author_id}
                        compact
                      />
                    )}

                    {currentUserId === comment.author_id && (
                      <button
                        onClick={() => deleteComment(comment.id)}
                        className="text-xs text-red-200/50 transition hover:text-red-200"
                      >
                        删除留言
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}