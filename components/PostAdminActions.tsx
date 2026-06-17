"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function PostAdminActions({
  id,
}: {
  id: number;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  function showMessage(text: string) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 3500);
  }

  function deletePost() {
    setShowDeleteDialog(true);
  }

  async function confirmDeletePost() {
    setShowDeleteDialog(false);
    setLoading(true);

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", id);

    setLoading(false);

    if (error) {
      showMessage(error.message);
      return;
    }

    showMessage("文章已删除");

    router.push("/admin/published");
  }

  return (
    <>
      <aside className="sticky top-28 flex flex-col gap-3 self-start">
        <a
          href={`/admin/edit/${id}`}
          className="rounded-2xl bg-white px-5 py-3 text-center font-bold text-black transition hover:opacity-80"
        >
          编辑
        </a>

        <button
          type="button"
          onClick={deletePost}
          disabled={loading}
          className="rounded-2xl border border-red-500 px-5 py-3 text-red-400 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "删除中..." : "删除"}
        </button>
      </aside>

      {message && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-white/10 bg-zinc-900/95 px-5 py-3 text-sm text-white shadow-2xl backdrop-blur-xl">
          {message}
        </div>
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        title="删除这篇文章？"
        description="删除后将无法恢复，请确认是否继续。"
        confirmText="确认删除"
        cancelText="取消"
        danger
        loading={loading}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeletePost}
      />
    </>
  );
}