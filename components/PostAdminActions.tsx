"use client";

import { supabase } from "@/lib/supabase";

export default function PostAdminActions({
  id,
}: {
  id: number;
}) {
  async function deletePost() {
    const confirmed = confirm("确定删除这篇文章吗？");

    if (!confirmed) return;

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("文章已删除");
    window.location.href = "/admin/published";
  }

  return (
  <aside className="sticky top-28 flex flex-col gap-3 self-start">
    <a
      href={`/admin/edit/${id}`}
      className="px-5 py-3 rounded-2xl bg-white text-black font-bold text-center hover:opacity-80 transition"
    >
      编辑
    </a>

    <button
      onClick={deletePost}
      className="px-5 py-3 rounded-2xl border border-red-500 text-red-400 hover:bg-red-500 hover:text-white transition"
    >
      删除
    </button>
  </aside>
);
}