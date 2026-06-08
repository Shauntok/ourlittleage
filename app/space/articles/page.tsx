"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type ProfileInfo = {
  username: string | null;
  avatar_url: string | null;
};

type ArticlePost = {
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
    .slice(0, 180);
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

export default function ArticlesSpacePage() {
  const [posts, setPosts] = useState<ArticlePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<"newest" | "hot">("newest");

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("posts")
      .select(`
        id,
        title,
        slug,
        content,
        tags,
        published_at,
        author_id
      `)
      .eq("type", "article")
      .eq("status", "published")
      .eq("visibility", "public")
      .order("published_at", {
        ascending: false,
      });

    if (error || !data) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const authorIds = Array.from(
      new Set(data.map((post) => post.author_id).filter(Boolean))
    );

    const { data: profiles } =
      authorIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", authorIds)
        : { data: [] as any[] };

    const profileMap = new Map(
      (profiles || []).map((profile: any) => [
        profile.id,
        {
          username: profile.username,
          avatar_url: profile.avatar_url,
        },
      ])
    );

    const postIds = data.map((post) => post.id);

    const { data: likesData } =
      postIds.length > 0
        ? await supabase
            .from("post_likes")
            .select("post_id")
            .in("post_id", postIds)
            .eq("is_active", true)
        : { data: [] as any[] };

    const { data: commentsData } =
      postIds.length > 0
        ? await supabase
            .from("comments")
            .select("post_id")
            .in("post_id", postIds)
            .eq("is_deleted", false)
            .eq("is_hidden", false)
        : { data: [] as any[] };

    const likeCountMap = new Map<number, number>();
    const commentCountMap = new Map<number, number>();

    (likesData || []).forEach((like: any) => {
      likeCountMap.set(like.post_id, (likeCountMap.get(like.post_id) || 0) + 1);
    });

    (commentsData || []).forEach((comment: any) => {
      commentCountMap.set(
        comment.post_id,
        (commentCountMap.get(comment.post_id) || 0) + 1
      );
    });

    const postsWithProfiles = data.map((post) => ({
      ...post,
      authorProfile: profileMap.get(post.author_id) || null,
      likeCount: likeCountMap.get(post.id) || 0,
      commentCount: commentCountMap.get(post.id) || 0,
    }));

    setPosts(postsWithProfiles);
    setLoading(false);
  }

  const sortedPosts = [...posts].sort((a, b) => {
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

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-6 py-24 text-white">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />
      <div className="fixed left-1/2 top-1/3 -z-10 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="mx-auto max-w-5xl">
        <header className="mb-16">
          <Link
            href="/space"
            className="mb-8 inline-flex text-sm text-white/35 transition hover:text-white/70"
          >
            ← 回到深夜广场
          </Link>

          <p className="text-xs tracking-[0.45em] text-white/25">
            PUBLIC ARTICLES
          </p>

          <h1 className="mt-6 text-5xl font-light tracking-tight md:text-6xl">
            文章广场
          </h1>

          <p className="mt-6 max-w-xl text-sm leading-8 text-white/35">
            有些故事不适合一句话说完。
            有些人，会把整个世界慢慢写下来。
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setSortMode("newest")}
              className={`rounded-full border px-5 py-3 text-sm transition ${
                sortMode === "newest"
                  ? "border-white bg-white text-black"
                  : "border-white/10 bg-white/[0.04] text-white/45 hover:border-white/25 hover:text-white"
              }`}
            >
              最新优先
            </button>

            <button
              type="button"
              onClick={() => setSortMode("hot")}
              className={`rounded-full border px-5 py-3 text-sm transition ${
                sortMode === "hot"
                  ? "border-white bg-white text-black"
                  : "border-white/10 bg-white/[0.04] text-white/45 hover:border-white/25 hover:text-white"
              }`}
            >
              热门优先
            </button>

            <button
              type="button"
              onClick={fetchPosts}
              className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-white/45 transition hover:border-white/25 hover:text-white"
            >
              刷新
            </button>
          </div>
        </header>

        {loading && (
          <div className="py-24 text-center text-white/30">
            正在翻开大家留下的故事...
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="rounded-[2.8rem] border border-white/10 bg-white/[0.03] p-16 text-center backdrop-blur-2xl">
            <p className="text-2xl font-light text-white/65">
              这里暂时还没有文章。
            </p>

            <p className="mt-6 text-sm leading-8 text-white/30">
              也许今晚，
              会有人开始写下第一段故事。
            </p>
          </div>
        )}

        <div className="grid gap-7">
          {sortedPosts.map((post) => {
            const excerpt = getExcerpt(post.content);
            const tags = normalizeTags(post.tags);

            const author = post.authorProfile;
            const authorHref = author?.username
              ? `/u/${encodeURIComponent(author.username)}`
              : null;

            return (
              <article
                key={post.id}
                className="min-w-0 overflow-hidden rounded-[2.2rem] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl transition-all duration-500 hover:border-white/20 hover:bg-white/[0.05]"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
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

                      <p className="mt-1 text-xs tracking-[0.18em] text-white/25">
                        {formatDateTime(post.published_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white/40">
                      文章
                    </span>

                    <span className="rounded-full border border-pink-500/20 bg-pink-500/[0.06] px-4 py-2 text-xs text-pink-100/55">
                      喜欢 {post.likeCount || 0}
                    </span>

                    <span className="rounded-full border border-blue-500/20 bg-blue-500/[0.06] px-4 py-2 text-xs text-blue-100/55">
                      评论 {post.commentCount || 0}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/articles/${post.slug}`}
                  className="group mt-7 block min-w-0 overflow-hidden"
                >
                  <h2 className="safe-text text-2xl font-light leading-tight text-white/88 transition group-hover:text-white">
                    {post.title}
                  </h2>

                  <p className="safe-pre mt-7 max-w-3xl text-[15px] leading-[2.15] text-white/42">
                    {excerpt}
                    {post.content.length > 180 ? "..." : ""}
                  </p>

                  {tags.length > 0 && (
                    <div className="mt-8 flex flex-wrap gap-3">
                      {tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="safe-text max-w-full rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white/45"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-10">
                    <p className="text-sm text-white/25 transition group-hover:text-white/50">
                      进入这篇故事 →
                    </p>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}