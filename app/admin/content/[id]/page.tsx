"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/lib/supabase";

function getTitle(post: any) {
  if (post.title) return post.title;

  if (post.type === "diary") {
    return `日记 · ${new Date(post.created_at).toLocaleDateString("zh-CN")}`;
  }

  return "无标题内容";
}

function getViewHref(post: any) {
  if (post.type === "diary") return `/diary/${post.id}`;
  if (post.type === "article" && post.slug) return `/articles/${post.slug}`;
  return "/admin/content";
}

export default function AdminContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [post, setPost] = useState<any>(null);
  const [author, setAuthor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPost();
  }, [id]);

  async function fetchPost() {
    setLoading(true);

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    if (!data) {
      setPost(null);
      setLoading(false);
      return;
    }

    setPost(data);

    if (data.author_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, role, status")
        .eq("id", data.author_id)
        .maybeSingle();

      setAuthor(profile || null);
    }

    setLoading(false);
  }

  async function writeLog(action: string, details: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !post) return;

    await supabase.from("admin_logs").insert([
      {
        admin_id: user.id,
        action,
        target_type: "post",
        target_id: String(post.id),
        details,
      },
    ]);
  }

  async function updateVisibility(visibility: string) {
    if (!post) return;

    const ok = confirm(`确定把这篇内容设为 ${visibility} 吗？`);
    if (!ok) return;

    const { error } = await supabase
      .from("posts")
      .update({
        visibility,
        edited_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    if (error) {
      alert(error.message);
      return;
    }

    await writeLog(
      "update_content_visibility",
      `内容可见性修改为 ${visibility}`
    );

    setPost((current: any) => ({
      ...current,
      visibility,
    }));
  }

  async function softDeletePost() {
    if (!post) return;

    const confirmed = confirm(
      "确定把这篇内容移入回收站吗？内容不会立刻永久删除，之后可恢复。"
    );

    if (!confirmed) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("请先登录。");
      return;
    }

    const { error } = await supabase
      .from("posts")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        delete_reason: "admin_soft_delete",
        edited_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    if (error) {
      alert(error.message);
      return;
    }

    await writeLog("soft_delete_content", "内容已移入回收站");

    alert("内容已移入回收站。");
    router.push("/admin/content");
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
        正在读取内容全文...
      </div>
    );
  }

  if (!post) {
    return (
      <div className="space-y-5">
        <Link href="/admin/content" className="text-sm text-zinc-500">
          ← 返回内容管理
        </Link>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
          找不到这篇内容。
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-hidden">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <Link
            href="/admin/content"
            className="text-sm text-zinc-500 transition hover:text-white"
          >
            ← 返回内容管理
          </Link>

          <h1 className="safe-text mt-4 break-words text-4xl font-bold text-white">
            {getTitle(post)}
          </h1>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-300">
              {post.type === "diary" ? "📔 日记" : "📖 文章"}
            </span>

            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-green-300">
              {post.status || "unknown"}
            </span>

            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-blue-300">
              {post.visibility || "public"}
            </span>

            <span className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-500">
              ID {post.id}
            </span>
          </div>
        </div>

        <Link
          href={getViewHref(post)}
          target="_blank"
          className="rounded-full border border-zinc-700 px-5 py-3 text-sm text-zinc-300 transition hover:border-white hover:text-white"
        >
          前台查看 ↗
        </Link>
      </div>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
        <h2 className="text-xl font-bold">作者资料</h2>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-zinc-400">
          <span>作者：{author?.username || "未知居民"}</span>

          {post.author_id && (
            <Link
              href={`/admin/users/${post.author_id}`}
              className="text-zinc-300 transition hover:text-white"
            >
              查看作者后台 →
            </Link>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
        <h2 className="text-xl font-bold">管理操作</h2>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={() => updateVisibility("public")}
            className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-300 transition hover:bg-green-500/20"
          >
            公开
          </button>

          <button
            onClick={() => updateVisibility("hidden")}
            className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300 transition hover:bg-yellow-500/20"
          >
            隐藏
          </button>

          <button
            onClick={() => updateVisibility("private")}
            className="rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300 transition hover:bg-blue-500/20"
          >
            私密
          </button>

          <button
            onClick={() => updateVisibility("unlisted")}
            className="rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-300 transition hover:bg-purple-500/20"
          >
            链接可见
          </button>

          <button
            onClick={softDeletePost}
            className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/20"
          >
            移入回收站
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
        <h2 className="text-xl font-bold">内容全文</h2>

        <div className="prose prose-invert mt-5 max-w-none break-words">
          <ReactMarkdown>{post.content || "这篇内容没有正文。"}</ReactMarkdown>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6 text-sm text-zinc-500">
        <p>创建时间：{new Date(post.created_at).toLocaleString("zh-CN")}</p>

        {post.published_at && (
          <p className="mt-2">
            发布时间：{new Date(post.published_at).toLocaleString("zh-CN")}
          </p>
        )}

        {post.edited_at && (
          <p className="mt-2">
            编辑时间：{new Date(post.edited_at).toLocaleString("zh-CN")}
          </p>
        )}
      </section>
    </div>
  );
}