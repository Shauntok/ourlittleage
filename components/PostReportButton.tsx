"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  postId: string;
};

export default function PostReportButton({
  postId,
}: Props) {

  const [loading, setLoading] =
    useState(false);

  async function reportPost() {

    const reason = prompt(
      "请输入举报原因"
    );

    if (!reason) return;

    setLoading(true);

    // ===== 获取当前用户 =====
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("请先登录");
      setLoading(false);
      return;
    }

    // ===== 写入举报 =====
    const { error } = await supabase
      .from("reports")
      .insert([
        {
          reporter_id: user.id,
          target_type: "post",
          target_id: postId,
          reason,
        },
      ]);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("举报已提交 🚩");
  }

  return (
    <button
      onClick={reportPost}
      disabled={loading}
      className="
        rounded-full
        border
        border-zinc-800
        bg-zinc-950/50
        px-3
        py-1.5
        text-sm
        text-zinc-400
        hover:border-red-500/40
        hover:text-red-300
        transition
      "
    >
      {loading
        ? "提交中..."
        : "🚩 举报"}
    </button>
  );
}