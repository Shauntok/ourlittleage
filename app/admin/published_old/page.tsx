"use client";

import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useEffect, useState } from "react";
import AdminPostActions from "@/components/AdminPostActions";

export default function PublishedPage() {
  // ===== 已发布文章列表 =====
  const [posts, setPosts] = useState<any[]>([]);

  // ===== 读取已发布文章 =====
  useEffect(() => {
    async function fetchPosts() {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("status", "published")
        .order("created_at", {
          ascending: false,
        });

      if (data) {
        setPosts(data);
      }
    }

    fetchPosts();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white px-6 py-20">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold">
          已发布文章 ✅
        </h1>

        {posts.length === 0 && (
          <div className="admin-empty">
            <div className="admin-empty-icon">✅</div>

            <h2 className="admin-empty-title">
              还没有已发布文章
            </h2>

            <p className="admin-empty-text">
              发布后的文章会出现在这里。
            </p>

            <Link
              href="/admin/dashboard"
              className="admin-btn admin-btn-primary inline-block"
            >
              去发布文章
            </Link>
          </div>
        )}

        {posts.map((post) => (
          <div
            key={post.id}
             className="relative group border border-zinc-800 rounded-2xl p-6 pr-20 space-y-3 transition duration-300 hover:-translate-y-1 hover:border-zinc-500 hover:bg-zinc-950 hover:shadow-2xl hover:shadow-black/50"
          >
            <h2 className="text-2xl font-bold">
              {post.title}
            </h2>

            <p className="text-zinc-400 text-sm">
              {post.slug}
            </p>

            <div className="flex gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs border border-green-500 text-green-400">
                  ✅ 已发布
                </span>

                <span className="px-3 py-1 rounded-full text-xs border border-blue-500 text-blue-400">
                  🌍 {post.visibility || "public"}
                </span>

              </div>

            <div className="space-y-2 text-sm text-zinc-500">

              {post.published_at && (
                <p>
                  发布时间：
                  {new Date(
                    post.published_at
                  ).toLocaleString()}
                </p>
              )}

              {post.edited_at && (
                <p>
                  最后编辑：
                  {new Date(
                    post.edited_at
                  ).toLocaleString()}
                </p>
              )}

              <p>
                已编辑 {post.edit_count || 0} 次
              </p>

            </div>

            {/* ===== Tags ===== */}
            {post.tags && (
              <div className="flex flex-wrap gap-2 pt-2">
                {String(post.tags)
                  .split(/[,，]/)
                  .map((tag) => tag.trim())
                  .filter(Boolean)
                  .map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))}
              </div>
            )}

            <AdminPostActions
              id={post.id}
              slug={post.slug}
              showVisibilityActions
              onDelete={async () => {
                const confirmed = confirm(
                  "确定删除这篇已发布文章吗？"
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

                setPosts((prev) =>
                  prev.filter((p) => p.id !== post.id)
                );
              }}
            /> 
          </div>
        ))}
      </div>
    </main>
  );
}