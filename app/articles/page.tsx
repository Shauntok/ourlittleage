"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Article = {
  id: number;
  title: string;
  slug: string;
  content: string;
  status: string;
  visibility: string;
  published_at: string | null;
  created_at: string;
  tags: string | null;
};

function getExcerpt(content: string) {
  return content
    ?.replace(/!\[[^\]]*\]\(.*?\)/g, "")
    .replace(/[#>*_`-]/g, "")
    .trim()
    .slice(0, 120);
}

function getFirstImage(content: string) {
  const match = content?.match(/!\[[^\]]*\]\((.*?)\)/);
  return match?.[1] || "";
}

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
      return visibility;
  }
}

export default function ArticlesPage() {
  const [articles, setArticles] =
    useState<Article[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [filter, setFilter] =
    useState<"all" | "published" | "draft">("all");

  useEffect(() => {
    fetchArticles();
  }, []);

  async function fetchArticles() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/";
      return;
    }

    const { data, error } = await supabase
      .from("posts")
      .select(
        "id, title, slug, content, status, visibility, published_at, created_at, tags"
      )
      .eq("author_id", user.id)
      .eq("type", "article")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setArticles((data || []) as Article[]);
    setLoading(false);
  }

  const filteredArticles =
    articles.filter((item) => {
      if (filter === "published") {
        return item.status === "published";
      }

      if (filter === "draft") {
        return item.status === "draft";
      }

      return true;
    });

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-6 py-20 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />

      <div className="mx-auto max-w-6xl space-y-10">
        <header className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="text-xs tracking-[0.45em] text-white/25">
              MY ARTICLES
            </p>

            <h1 className="mt-5 text-5xl font-light tracking-tight md:text-6xl">
              我的文章
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-8 text-white/40">
              这里放着你认真写下的故事、想法和作品。它们不像日记那么轻，而是更像一间间可以被别人走进的房间。
            </p>
          </div>

          <Link
            href="/articles/new"
            className="rounded-full bg-white px-8 py-4 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            ✍️ 写新文章
          </Link>
        </header>

        <div className="flex flex-wrap gap-3">
          {[
            {
              key: "all",
              label: "全部",
              count: articles.length,
            },
            {
              key: "published",
              label: "已发布",
              count: articles.filter(
                (item) => item.status === "published"
              ).length,
            },
            {
              key: "draft",
              label: "草稿",
              count: articles.filter(
                (item) => item.status === "draft"
              ).length,
            },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() =>
                setFilter(item.key as any)
              }
              className={
                filter === item.key
                  ? "rounded-full border border-white bg-white px-5 py-3 text-sm font-semibold text-black transition"
                  : "rounded-full border border-white/10 bg-white/[0.035] px-5 py-3 text-sm text-white/45 transition hover:border-white/20 hover:text-white"
              }
            >
              {item.label}
              <span className="ml-2 text-xs opacity-60">
                {item.count}
              </span>
            </button>
          ))}
        </div>

        {loading && (
          <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-14 text-center text-white/35">
            正在打开你的文章房间...
          </div>
        )}

        {!loading && filteredArticles.length === 0 && (
          <div className="flex min-h-[360px] items-center justify-center rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-14 text-center backdrop-blur-2xl">
            <div>
              <div className="text-5xl">📖</div>

              <h2 className="mt-6 text-2xl font-light text-white/70">
                这里还没有文章
              </h2>

              <p className="mt-4 max-w-md text-sm leading-7 text-white/35">
                第一篇故事不需要完美，只要它是真的。
              </p>

              <Link
                href="/articles/new"
                className="mt-8 inline-flex rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                写第一篇文章
              </Link>
            </div>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {filteredArticles.map((article) => {
            const image = getFirstImage(article.content);
            const excerpt = getExcerpt(article.content);

            return (
              <Link
                key={article.id}
                href={`/articles/${article.slug}`}
                className="
                  group
                  min-w-0
                  overflow-hidden
                  rounded-[2rem]
                  border border-white/10
                  bg-white/[0.035]
                  backdrop-blur-2xl transition-all
                  duration-500 hover:-translate-y-1
                  hover:border-white/20
                  hover:bg-white/[0.055]
                "
              >
                {image && (
                  <div className="h-56 overflow-hidden border-b border-white/10 bg-white/[0.03]">
                    <img
                      src={image}
                      alt=""
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                  </div>
                )}

                <div className="p-7">
                  <div className="mb-5 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/35">
                      {article.status === "published"
                        ? "已发布"
                        : "草稿"}
                    </span>

                    <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/35">
                      {getVisibilityLabel(article.visibility)}
                    </span>
                  </div>

                  <h2
                    className="
                      safe-text
                      line-clamp-2
                      text-2xl
                      font-light
                      text-white/90
                    "
                  >
                    {article.title || "无标题文章"}
                  </h2>

                  {excerpt && (
                    <p
                      className="
                        safe-pre
                        mt-4
                        line-clamp-3
                        text-sm
                        leading-7
                        text-white/40
                      "
                    >
                      {excerpt}...
                    </p>
                  )}

                  {article.tags && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {article.tags
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean)
                        .slice(0, 4)
                        .map((tag) => (
                          <span
                            key={tag}
                            className="
                              safe-text
                              max-w-full
                              rounded-full
                              bg-white/[0.05]
                              px-3 py-1
                              text-xs
                              text-white/35
                            "
                          >
                            #{tag}
                          </span>
                        ))}
                    </div>
                  )}

                  <p className="mt-6 text-xs text-white/25">
                    {new Date(
                      article.published_at ||
                        article.created_at
                    ).toLocaleString("zh-CN")}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}