"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import TranslatedMarkdown from "@/components/TranslatedMarkdown";
import PostComments from "@/components/PostComments";

function getVisibilityLabel(visibility: string) {
  switch (visibility) {
    case "public":
      return "🌍 公开";
    case "hidden":
      return "🙈 隐藏";
    case "unlisted":
      return "🔗 链接可见";
    case "private":
      return "🔒 私密";
    default:
      return "🌍 公开";
  }
}

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = String(params.slug);

  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    async function fetchArticle() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("slug", slug)
        .eq("type", "article")
        .single();

      if (error || !data) {
        router.push("/articles");
        return;
      }

      const isAuthor = data.author_id === user.id;

      const canView =
        isAuthor ||
        (data.visibility === "public" &&
          data.status === "published");

      if (!canView) {
        router.push("/articles");
        return;
      }

      setArticle({
        ...data,
        isAuthor,
      });

      setLoading(false);
    }

    fetchArticle();
  }, [slug, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm tracking-[0.3em] text-white/35">
          正在打开这篇文章...
        </p>
      </main>
    );
  }

  const articleDate = article.published_at || article.created_at;
  const isAuthor = article.isAuthor || article.author_id === currentUserId;
  const backHref = isAuthor ? "/articles" : "/space/articles";

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-6 py-24 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />
      <div className="pointer-events-none fixed left-1/2 top-1/3 -z-10 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />

      <article className="mx-auto max-w-4xl">
        <Link
          href={backHref}
          className="text-sm text-white/35 transition hover:text-white/70"
        >
          {isAuthor ? "← 回到我的文章" : "← 回到文章广场"}
        </Link>

        <header className="mt-14 rounded-[2.4rem] border border-white/10 bg-white/[0.035] p-9 backdrop-blur-2xl">
          <p className="text-xs tracking-[0.38em] text-white/25">
            ARTICLE
          </p>

          <h1 className="mt-6 text-5xl font-light leading-tight tracking-tight md:text-6xl">
            {article.title || "无标题文章"}
          </h1>

          <p className="mt-6 text-sm text-white/35">
            {new Date(articleDate).toLocaleString("zh-CN")}
          </p>

          <div className="mt-7 flex flex-wrap gap-3 text-xs text-white/40">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
              {article.status === "published" ? "已发布" : "草稿"}
            </span>

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
              {getVisibilityLabel(article.visibility)}
            </span>
          </div>

          {article.tags && (
            <div className="mt-6 flex flex-wrap gap-2">
              {article.tags
                .split(",")
                .map((tag: string) => tag.trim())
                .filter(Boolean)
                .map((tag: string) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white/[0.05] px-3 py-1 text-xs text-white/35"
                  >
                    #{tag}
                  </span>
                ))}
            </div>
          )}
        </header>

        <section className="mt-10 rounded-[2.4rem] border border-white/10 bg-white/[0.03] p-9 backdrop-blur-2xl">
          <article className="prose prose-invert max-w-none prose-p:leading-[2.2]">
            <TranslatedMarkdown content={article.content || ""} />
          </article>
        </section>

        {isAuthor && article.notes && (
          <section className="mt-8 rounded-[2rem] border border-yellow-500/15 bg-yellow-500/[0.05] p-6 text-sm leading-8 text-yellow-100/60">
            <p className="mb-3 text-xs tracking-[0.3em] text-yellow-100/35">
              作者私密笔记
            </p>

            <p className="whitespace-pre-wrap">{article.notes}</p>
          </section>
        )}

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-4">
          {isAuthor && (
            <Link
              href={`/articles/edit/${article.id}`}
              className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm text-white/60 transition hover:text-white"
            >
              编辑文章
            </Link>
          )}

          <Link
            href={backHref}
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            {isAuthor ? "回到我的文章" : "回到文章广场"}
          </Link>
        </footer>

        <PostComments postId={article.id} />
      </article>
    </main>
  );
}