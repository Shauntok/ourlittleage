"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ProfileInfo = {
  username: string | null;
  avatar_url: string | null;
};

export type ArticlePost = {
  id: number;
  title: string;
  slug: string;
  content: string;
  tags: string | null;
  published_at: string;
  author_id: string;
  authorProfile?: ProfileInfo | null;
  likeCount?: number;
  commentCount?: number;
};

function getExcerpt(content: string) {
  return content
    .replace(/!\[[^\]]*\]\(.*?\)/g, "")
    .replace(/[#>*`-]/g, "")
    .trim()
    .slice(0, 150);
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function normalizeTags(tags: any) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;

  if (typeof tags === "string") {
    return tags
      .split(/[,，]/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

export default function ArticlesSpaceClient({
  initialPosts,
}: {
  initialPosts: ArticlePost[];
}) {
  const router = useRouter();

  const [sortMode, setSortMode] = useState<"newest" | "hot">("newest");
  const [visibleCount, setVisibleCount] = useState(20);

  const sortedPosts = [...initialPosts].sort((a, b) => {
    if (sortMode === "hot") {
      const scoreA = (a.likeCount || 0) * 3 + (a.commentCount || 0) * 2;
      const scoreB = (b.likeCount || 0) * 3 + (b.commentCount || 0) * 2;

      return scoreB - scoreA;
    }

    return (
      new Date(b.published_at).getTime() -
      new Date(a.published_at).getTime()
    );
  });

  const visiblePosts = sortedPosts.slice(0, visibleCount);
  const hasMore = visibleCount < sortedPosts.length;

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-5 pb-24 pt-16 text-white md:px-6 md:py-24">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />
      <div className="fixed left-1/2 top-1/3 -z-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl md:h-[620px] md:w-[620px]" />

      <div className="mx-auto max-w-5xl">
        <Link
          href="/space"
          className="mb-7 inline-flex text-sm text-white/35 transition hover:text-white/70 md:mb-10"
        >
          ← 回到深夜广场
        </Link>

        <header className="mb-7 md:mb-12">
          <p className="text-xs tracking-[0.4em] text-white/25 md:tracking-[0.45em]">
            PUBLIC ARTICLES
          </p>

          <h1 className="mt-2 text-5xl font-light tracking-tight md:mt-6 md:text-6xl">
            文章广场
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-7 text-white/35 md:mt-6 md:leading-8">
            有些故事不适合一句话说完。有些人，会把整个世界慢慢写下来。
          </p>

          <div className="mt-6 flex flex-wrap gap-2 md:mt-8 md:gap-3">
            <button
              type="button"
              onClick={() => {
                setSortMode("newest");
                setVisibleCount(20);
              }}
              className={`rounded-full border px-4 py-2.5 text-sm transition md:px-5 md:py-3 ${
                sortMode === "newest"
                  ? "border-white bg-white text-black"
                  : "border-white/10 bg-white/[0.04] text-white/45 hover:border-white/25 hover:text-white"
              }`}
            >
              最新
            </button>

            <button
              type="button"
              onClick={() => {
                setSortMode("hot");
                setVisibleCount(20);
              }}
              className={`rounded-full border px-4 py-2.5 text-sm transition md:px-5 md:py-3 ${
                sortMode === "hot"
                  ? "border-white bg-white text-black"
                  : "border-white/10 bg-white/[0.04] text-white/45 hover:border-white/25 hover:text-white"
              }`}
            >
              热门
            </button>

            <button
              type="button"
              onClick={() => router.refresh()}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/45 transition hover:border-white/25 hover:text-white md:px-5 md:py-3"
            >
              刷新
            </button>
          </div>
        </header>

        {initialPosts.length === 0 && (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-2xl md:rounded-[2.8rem] md:p-16">
            <p className="text-2xl font-light text-white/65">
              这里暂时还没有文章。
            </p>

            <p className="mt-4 text-sm leading-8 text-white/30">
              也许今晚，会有人开始写下第一段故事。
            </p>
          </div>
        )}

        {initialPosts.length > 0 && (
          <>
            <div className="grid gap-4 md:gap-7">
              {visiblePosts.map((post) => {
                const excerpt = getExcerpt(post.content);
                const tags = normalizeTags(post.tags);
                const author = post.authorProfile;
                const authorHref = author?.username
                  ? `/u/${encodeURIComponent(author.username)}`
                  : null;

                return (
                  <article
                    key={post.id}
                    className="min-w-0 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl transition-all duration-500 hover:border-white/20 hover:bg-white/[0.05] md:rounded-[2.2rem] md:p-8"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        {authorHref ? (
                          <Link
                            href={authorHref}
                            className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.04] transition hover:scale-105 hover:border-white/25"
                            title="进入居民房间"
                          >
                            {author?.avatar_url ? (
                              <img
                                src={author.avatar_url}
                                alt={author.username || "居民"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-sm">
                                🌙
                              </div>
                            )}
                          </Link>
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm">
                            🌙
                          </div>
                        )}

                        <div className="min-w-0">
                          {authorHref ? (
                            <Link
                              href={authorHref}
                              className="safe-text block truncate text-sm font-medium text-white/70 transition hover:text-white"
                            >
                              {author?.username || "已离开的居民"}
                            </Link>
                          ) : (
                            <p className="safe-text truncate text-sm font-medium text-white/45">
                              已离开的居民
                            </p>
                          )}

                          <p className="mt-1 truncate text-xs text-white/25">
                            {formatDateTime(post.published_at)}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/40 md:px-4 md:py-2">
                        📖 文章
                      </span>
                    </div>

                    <Link
                      href={`/articles/${post.slug}`}
                      className="group mt-5 block min-w-0 overflow-hidden md:mt-7"
                    >
                      <h2 className="safe-text line-clamp-2 break-all text-xl font-light leading-tight text-white/88 transition group-hover:text-white md:text-2xl">
                        {post.title}
                      </h2>

                      <p className="safe-pre mt-4 line-clamp-3 break-words max-w-3xl text-sm leading-7 text-white/42 md:mt-7 md:text-[15px] md:leading-[2.15]">
                        {excerpt}
                        {post.content.length > 150 ? "..." : ""}
                      </p>

                      {tags.length > 0 && (
                        <div className="mt-5 flex flex-wrap gap-2 md:mt-8 md:gap-3">
                          {tags.slice(0, 5).map((tag: string) => (
                            <span
                              key={tag}
                              className="safe-text max-w-full rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/45 md:px-4 md:py-2"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-6 flex flex-wrap gap-2 md:mt-8 md:gap-3">
                        <span className="rounded-full border border-pink-500/20 bg-pink-500/[0.06] px-3 py-1.5 text-xs text-pink-100/60 md:px-4 md:py-2">
                          ❤️ 喜欢 {post.likeCount || 0}
                        </span>

                        <span className="rounded-full border border-blue-500/20 bg-blue-500/[0.06] px-3 py-1.5 text-xs text-blue-100/60 md:px-4 md:py-2">
                          💬 评论 {post.commentCount || 0}
                        </span>
                      </div>

                      <p className="mt-6 text-sm text-white/25 transition group-hover:text-white/50 md:mt-8">
                        进入这篇故事 →
                      </p>
                    </Link>
                  </article>
                );
              })}
            </div>

            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + 20)}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-7 py-3 text-sm text-white/55 transition hover:border-white/25 hover:text-white"
                >
                  加载更多文章
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}