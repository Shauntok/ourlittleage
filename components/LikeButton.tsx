"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { addUserGrowth } from "@/lib/community-growth";

type Props = {
  postId: number;
  authorId: string;
  initialCount?: number;
  compact?: boolean;
};

export default function LikeButton({
  postId,
  authorId,
  initialCount = 0,
  compact = false,
}: Props) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchLikeState();
  }, [postId]);

  function showMessage(text: string) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 3000);
  }

  async function fetchLikeState() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setCurrentUserId(user.id);

    const { data: myLike } = await supabase
      .from("post_likes")
      .select("id, is_active")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    setLiked(!!myLike?.is_active);
  }

  async function notifyAuthor(actorId: string) {
    if (!actorId || actorId === authorId) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", actorId)
      .maybeSingle();

    const likerName = profile?.username || "有位居民";

    const { error } = await supabase.rpc("create_notification", {
      p_user_id: authorId,
      p_title: "有人喜欢了你的内容 💗",
      p_content: `${likerName} 刚刚给你的内容留下了一点喜欢。`,
      p_type: "system",
    });

    if (error) {
      console.error("notifyAuthor rpc error:", error);
    }
  }

  async function rewardAuthor(actorId: string, likeId: string) {
    if (!actorId || actorId === authorId) return;

    const success = await addUserGrowth({
      userId: authorId,
      actorId,
      light: 0.005,
      reason: "post_liked",
    });

    if (!success) return;

    const { error: rewardError } = await supabase
      .from("post_likes")
      .update({
        rewarded: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", likeId);

    if (rewardError) {
      console.error("mark like rewarded error:", rewardError);
      return;
    }

    await notifyAuthor(actorId);
  }

  async function toggleLike() {
    if (loading) return;

    setMessage("");

    if (!currentUserId) {
      showMessage("先登录一下，再把喜欢留下来。");
      return;
    }

    if (currentUserId === authorId) {
      showMessage("这束光已经在你自己的房间里啦。");
      return;
    }

    setLoading(true);

    const { data: existingLike, error: existingError } = await supabase
      .from("post_likes")
      .select("id, is_active, rewarded")
      .eq("post_id", postId)
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (existingError) {
      setLoading(false);
      showMessage(existingError.message);
      return;
    }

    if (existingLike?.is_active) {
      const { error } = await supabase
        .from("post_likes")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingLike.id);

      setLoading(false);

      if (error) {
        showMessage(error.message);
        return;
      }

      setLiked(false);
      setLikeCount((current) => Math.max(current - 1, 0));
      return;
    }

    if (existingLike && !existingLike.is_active) {
      const { error } = await supabase
        .from("post_likes")
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingLike.id);

      if (error) {
        setLoading(false);
        showMessage(error.message);
        return;
      }

      setLiked(true);
      setLikeCount((current) => current + 1);

      if (!existingLike.rewarded) {
        await rewardAuthor(currentUserId, existingLike.id);
      }

      setLoading(false);
      return;
    }

    const { data: insertedLike, error } = await supabase
      .from("post_likes")
      .insert([
        {
          post_id: postId,
          user_id: currentUserId,
          is_active: true,
          rewarded: false,
        },
      ])
      .select("id, rewarded")
      .single();

    if (error) {
      setLoading(false);
      showMessage(error.message);
      return;
    }

    setLiked(true);
    setLikeCount((current) => current + 1);

    await rewardAuthor(currentUserId, insertedLike.id);

    setLoading(false);
  }

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={toggleLike}
        disabled={loading}
        className={`rounded-full border transition disabled:cursor-not-allowed disabled:opacity-40 ${
          compact ? "px-5 py-2.5 text-sm" : "px-5 py-3 text-sm"
        } ${
          liked
            ? "border-pink-500/30 bg-pink-500/10 text-pink-200"
            : "border-white/10 bg-white/[0.04] text-white/45 hover:border-pink-500/25 hover:text-pink-100"
        }`}
      >
        {liked ? "❤️ 已喜欢" : "🤍 喜欢"} {likeCount}
      </button>

      {message && (
        <p className="max-w-[220px] text-xs leading-5 text-amber-200/75">
          {message}
        </p>
      )}
    </div>
  );
}