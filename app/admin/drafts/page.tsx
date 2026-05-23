"use client";

import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useEffect, useState } from "react";
import AdminPostActions from "@/components/AdminPostActions";

// ===== 清掉 Markdown 图片，只留下文字摘要 =====
function getExcerpt(content: string) {
  return content
    .replace(/!\[[^\]]*\]\(.*?\)/g, "")
    .trim()
    .slice(0, 120);
}

// ===== 把 tags 统一变成 array =====
function normalizeTags(tags: any) {
  if (Array.isArray(tags)) {
    return tags;
  }

  if (typeof tags === "string") {
    try {
      const parsed = JSON.parse(tags);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {}

    return tags
      .split(/[,，]/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

export default function DraftsPage() {
  // ===== 草稿列表 =====
  const [drafts, setDrafts] = useState<any[]>([]);

  // ===== 读取草稿 =====
  useEffect(() => {
    async function fetchDrafts() {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("status", "draft")
        .order("created_at", {
          ascending: false,
        });

      if (data) {
        setDrafts(data);
      }
    }

    fetchDrafts();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white px-6 py-20">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold">
          草稿箱 📝
        </h1>

        {drafts.length === 0 && (
          <div className="admin-empty">
            <div className="admin-empty-icon">📝</div>

            <h2 className="admin-empty-title">
              还没有草稿
            </h2>

            <p className="admin-empty-text">
              你保存的草稿会出现在这里。
            </p>

            <Link
              href="/admin/dashboard"
              className="admin-btn admin-btn-primary inline-block"
            >
              新建文章
            </Link>
          </div>
        )}

        {drafts.map((post) => {
          const tags = normalizeTags(post.tags);
          const excerpt = getExcerpt(post.content || "");

          return (
            <div
              key={post.id}
                className="relative group border border-zinc-800 rounded-2xl p-6 pr-20 space-y-3 transition duration-300 hover:-translate-y-1 hover:border-zinc-500 hover:bg-zinc-950 hover:shadow-2xl hover:shadow-black/50"            >
              {/* ===== 标题 ===== */}
              <h2 className="text-2xl font-bold">
                {post.title}
              </h2>

              {/* ===== Slug ===== */}
              <p className="text-zinc-400 text-sm">
                {post.slug}
              </p>

              {/* ===== 时间 ===== */}
              <div className="space-y-1 text-sm text-zinc-500">
                <p>
                  第一次保存：
                  {new Date(post.created_at).toLocaleString()}
                </p>

                {post.edited_at && (
                  <p>
                    最后编辑：
                    {new Date(post.edited_at).toLocaleString()}
                  </p>
                )}

                <p className="text-zinc-500 text-sm">
                    已编辑 {post.edit_count || 0} 次
                </p>
              </div>

              {/* ===== 文章摘要 ===== */}
              {excerpt && (
                <p className="text-zinc-400 leading-7">
                  {excerpt}...
                </p>
              )}

              {/* ===== Tags ===== */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="text-xs px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* ===== 操作按钮 ===== */}
                <AdminPostActions
                  id={post.id}
                  slug={post.slug}
                  onDelete={async () => {
                    const confirmed = confirm(
                      "确定删除这篇文章吗？"
                    );

                    if (!confirmed) return;

                    const { error } = await supabase
                      .from("posts")
                      .delete()
                      .eq("id", post.id);

                    if (error) {
                      alert(error.message);
                      return;
                    }

                    setDrafts((currentDrafts) =>
                      currentDrafts.filter(
                        (draft) => draft.id !== post.id
                      )
                    );
                  }}
                />
            </div>
          );
        })}
      </div>
    </main>
  );
}