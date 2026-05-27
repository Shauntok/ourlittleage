"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  postId: number;
};

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
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    fetchComments();
    getCurrentUser();
  }, [postId]);

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
        ascending: true,
      });

    if (error) {
      alert(error.message);
      setFetching(false);
      return;
    }

    setComments((data || []) as CommentItem[]);
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

    setContent("");
    fetchComments();
  }

  async function deleteComment(id: string) {
    const confirmed = confirm("确定删除这条留言吗？");

    if (!confirmed) return;

    const { error } = await supabase
      .from("comments")
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    fetchComments();
  }

  return (
    <section className="mt-24 border-t border-white/10 pt-12">
      <div>
        <p className="text-xs tracking-[0.35em] text-white/25">
          COMMENTS
        </p>

        <h2 className="mt-4 text-3xl font-light">
          居民留言
        </h2>

        <p className="mt-4 text-sm leading-7 text-white/35">
          在这里留下温柔一点的回应。也许作者今晚刚好需要这一句话。
        </p>
      </div>

      <div className="mt-8 space-y-4">
        <textarea
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="写下你的留言..."
          className="
            w-full resize-none rounded-[2rem]
            border border-white/10
            bg-white/[0.035]
            p-5 leading-8 text-white
            outline-none transition
            placeholder:text-white/25
            focus:border-white/25
            focus:bg-white/[0.055]
          "
        />

        <button
          onClick={submitComment}
          disabled={loading}
          className="
            rounded-full bg-white px-7 py-3
            text-sm font-semibold text-black
            transition hover:bg-white/90
            disabled:cursor-not-allowed disabled:opacity-40
          "
        >
          {loading ? "送出中..." : "留下留言"}
        </button>
      </div>

      <div className="mt-14 space-y-5">
        {fetching && (
          <p className="text-sm text-white/35">
            正在翻看留言...
          </p>
        )}

        {!fetching && comments.length === 0 && (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-sm text-white/35">
              这里暂时还没有留言。
            </p>
          </div>
        )}

        {comments.map((comment) => {
          const profile = getProfile(comment.profiles);

          return (
            <div
              key={comment.id}
              className="
                rounded-[2rem]
                border border-white/10
                bg-white/[0.03]
                p-6
              "
            >
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm">
                      🌙
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div>
                    <p className="text-sm font-medium text-white/80">
                      {profile?.username || "已离开的居民"}
                    </p>

                    <p className="mt-1 text-xs text-white/25">
                      {new Date(comment.created_at).toLocaleString("zh-CN")}
                    </p>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-white/65">
                    {comment.content}
                  </p>

                  {currentUserId === comment.author_id && (
                    <button
                      onClick={() => deleteComment(comment.id)}
                      className="mt-5 text-xs text-red-200/50 transition hover:text-red-200"
                    >
                      删除留言
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}