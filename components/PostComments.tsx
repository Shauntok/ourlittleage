"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  postId: number;
};

export default function PostComments({
  postId,
}: Props) {
  const [comments, setComments] =
    useState<any[]>([]);
  const [content, setContent] =
    useState("");
  const [loading, setLoading] =
    useState(false);

  async function fetchComments() {
    const { data } = await supabase
      .from("comments")
      .select(`
        *,
        profiles (
          username,
          avatar
        )
      `)
      .eq("post_id", postId)
      .is("deleted_at", null)
      .order("created_at", {
        ascending: true,
      });

    setComments(data || []);
  }

  useEffect(() => {
    fetchComments();
  }, [postId]);

  async function submitComment() {
    if (!content.trim()) {
      alert("请输入评论内容");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    
    if (!user) {
      alert("请先登录");
      setLoading(false);
      return;
    }

    // ===== 检查用户状态 =====
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .single();

    if (profile?.status === "muted") {
      alert("你目前已被禁言，无法发表评论。");
      return;
    }

    if (profile?.status === "banned") {
      alert("你的账号已被封禁。");

      await supabase.auth.signOut();

      window.location.href = "/";
      return;
    }

    const { error } = await supabase
      .from("comments")
      .insert([
        {
          post_id: postId,
          user_id: user.id,
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

  return (
    <section className="mt-20 border-t border-zinc-800 pt-10 space-y-8">
      <div>
        <h2 className="text-3xl font-bold">
          居民留言 💬
        </h2>

        <p className="text-zinc-500 mt-2">
          在这里留下温柔一点的回应。
        </p>
      </div>

      <div className="space-y-4">
        <textarea
          rows={4}
          value={content}
          onChange={(e) =>
            setContent(e.target.value)
          }
          placeholder="写下你的留言..."
          className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4 outline-none focus:border-white"
        />

        <button
          onClick={submitComment}
          disabled={loading}
          className="rounded-2xl bg-white px-6 py-3 font-bold text-black hover:opacity-80 transition"
        >
          {loading ? "送出中..." : "留下留言"}
        </button>
      </div>

      <div className="space-y-5">
        {comments.length === 0 && (
          <p className="text-zinc-500">
            这里暂时还没有留言。
          </p>
        )}

        {comments.map((comment) => (
          <div
            key={comment.id}
            className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-5"
          >
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full overflow-hidden border border-zinc-700 bg-zinc-900 shrink-0">
                {comment.profiles?.avatar ? (
                  <img
                    src={comment.profiles.avatar}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-sm">
                    👤
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div>
                  <p className="font-bold">
                    {comment.profiles?.username ||
                      "已离开的居民"}
                  </p>

                  <p className="text-xs text-zinc-600">
                    {new Date(
                      comment.created_at
                    ).toLocaleString()}
                  </p>
                </div>

                <p className="text-zinc-300 leading-7">
                  {comment.content}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}