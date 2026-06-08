"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  targetType: "post" | "comment" | "user";
  targetId: string | number;
  authorId?: string;
};

export default function ReportButton({ targetType, targetId, authorId }: Props) {
  const [loading, setLoading] = useState(false);

  async function submitReport() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("请先登录后再举报。");
      return;
    }

    if (authorId && user.id === authorId) {
      alert("自己的内容不用举报啦，如果想调整，可以回去编辑。");
      return;
    }

    const reason = prompt(
      "请简单写下举报原因，例如：辱骂、骚扰、色情、暴力、垃圾内容。"
    );

    if (!reason?.trim()) return;

    setLoading(true);

    const { error } = await supabase.from("reports").insert([
      {
        reporter_id: user.id,
        target_type: targetType,
        target_id: String(targetId),
        reason: reason.trim(),
        status: "pending",
      },
    ]);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("举报已提交，管理员会查看。谢谢你帮忙守护小时代。");
  }

  return (
    <button
      type="button"
      onClick={submitReport}
      disabled={loading}
      className="rounded-full border border-red-500/25 bg-red-500/[0.06] px-4 py-2 text-xs text-red-200/70 transition hover:bg-red-500/[0.12] hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {loading ? "提交中..." : "举报"}
    </button>
  );
}