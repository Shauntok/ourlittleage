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

function getDateKey(date: string) {
  return new Date(date).toISOString().slice(0, 10);
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
      return "🌍 公开";
  }
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

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

  const filteredArticles = articles.filter((item) => {
    if (filter === "published" && item.status !== "published") {
      return false;
    }

    if (filter === "draft" && item.status !== "draft") {
      return false;
    }

    if (selectedDate) {
      const articleDate = item.published_at || item.created_at;

      if (getDateKey(articleDate) !== selectedDate) {
        return false;
      }
    }

    const keyword = search.trim().toLowerCase();

    if (!keyword) return true;

    return (
      item.title?.toLowerCase().includes(keyword) ||
      item.content?.toLowerCase().includes(keyword) ||
      item.tags?.toLowerCase().includes(keyword)
    );
  });

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-5 pb-24 pt-16 text-white md:px-6 md:py-24">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />
      <div className="pointer-events-none fixed left-1/2 top-1/3 -z-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl md:h-[580px] md:w-[580px]" />

      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col justify-between gap-5 md:mb-20 md:flex-row md:items-end md:gap-8">
          <div>
            <p className="text-xs tracking-[0.4em] text-white/25 md:tracking-[0.45em]">
              MY ARTICLES
            </p>

            <h1 className="mt-2 text-5xl font-light tracking-tight md:mt-6 md:text-6xl">
              我的文章
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-7 text-white/35 md:mt-6 md:leading-8">
              这里放着你认真写下的故事、想法和作品。它们不像日记那么轻，而是更像一间间可以被别人走进的房间。
            </p>
          </div>

          <Link
            href="/articles/new"
            className="hidden rounded-full bg-white px-8 py-4 text-sm font-semibold text-black transition hover:bg-white/90 md:inline-flex"
          >
            ✍️ 写新文章
          </Link>
        </header>

        <div className="mb-7 space-y-4 md:mb-10">
          <div className="flex flex-wrap gap-2 md:gap-3">
            {[
              {
                key: "all",
                label: "全部",
                count: articles.length,
              },
              {
                key: "published",
                label: "已发布",
                count: articles.filter((item) => item.status === "published")
                  .length,
              },
              {
                key: "draft",
                label: "草稿",
                count: articles.filter((item) => item.status === "draft")
                  .length,
              },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key as any)}
                className={
                  filter === item.key
                    ? "rounded-full border border-white bg-white px-4 py-2.5 text-sm font-semibold text-black transition md:px-5 md:py-3"
                    : "rounded-full border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm text-white/45 transition hover:border-white/20 hover:text-white md:px-5 md:py-3"
                }
              >
                {item.label}

                <span className="ml-2 text-xs opacity-60">{item.count}</span>
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="搜索标题、内容或标签"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-3.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/25 focus:bg-white/[0.055] md:max-w-md"
          />

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-3.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/25 focus:bg-white/[0.055] md:max-w-xs"
            />

            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate("")}
                className="rounded-full border border-white/10 bg-white/[0.035] px-5 py-3 text-sm text-white/45 transition hover:border-white/20 hover:text-white"
              >
                清除日期
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-10 text-center text-white/35 md:rounded-[2.5rem] md:p-14">
            正在打开你的文章房间...
          </div>
        )}

        {!loading && filteredArticles.length === 0 && (
          <div className="flex min-h-[280px] items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-2xl md:min-h-[360px] md:rounded-[2.5rem] md:p-14">
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
                  backdrop-blur-2xl
                  transition-all
                  duration-500
                  hover:-translate-y-1
                  hover:border-white/20
                  hover:bg-white/[0.055]
                "
              >
                {image && (
                  <div className="h-44 overflow-hidden border-b border-white/10 bg-white/[0.03] md:h-56">
                    <img
                      src={image}
                      alt=""
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                  </div>
                )}

                <div className="p-6 md:p-7">
                  <div className="mb-4 flex flex-wrap gap-2 md:mb-5">
                    <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/35">
                      {article.status === "published" ? "已发布" : "草稿"}
                    </span>

                    <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/35">
                      {getVisibilityLabel(article.visibility)}
                    </span>
                  </div>

                  <h2
                    className="
                      safe-text
                      line-clamp-2
                      text-xl
                      font-light
                      text-white/90
                      md:text-2xl
                    "
                  >
                    {article.title || "无标题文章"}
                  </h2>

                  {excerpt && (
                    <p
                      className="
                        safe-pre
                        mt-3
                        line-clamp-3
                        text-sm
                        leading-7
                        text-white/40
                        md:mt-4
                      "
                    >
                      {excerpt}...
                    </p>
                  )}

                  {article.tags && (
                    <div className="mt-4 flex flex-wrap gap-2 md:mt-5">
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
                              px-3
                              py-1
                              text-xs
                              text-white/35
                            "
                          >
                            #{tag}
                          </span>
                        ))}
                    </div>
                  )}

                  <p className="mt-5 text-xs text-white/25 md:mt-6">
                    {new Date(
                      article.published_at || article.created_at
                    ).toLocaleString("zh-CN")}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <Link
        href="/articles/new"
        className="fixed bottom-6 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-xl text-black shadow-[0_0_40px_rgba(255,255,255,0.22)] transition hover:bg-white/90 md:hidden"
        aria-label="写文章"
      >
        ✍️
      </Link>
    </main>
  );
}