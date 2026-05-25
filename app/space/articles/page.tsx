"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type ArticlePost = {
  id: number;
  title: string;
  slug: string;
  content: string;
  tags: string | null;
  published_at: string;
};

function getExcerpt(content: string) {
  return content
    .replace(/!\[[^\]]*\]\(.*?\)/g, "")
    .replace(/[#>*`-]/g, "")
    .trim()
    .slice(0, 180);
}

function getReadingTime(content: string) {
  const words = content.trim().length;

  const minutes = Math.max(
    1,
    Math.ceil(words / 450)
  );

  return `${minutes} 分钟阅读`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

function normalizeTags(tags: any) {
  if (!tags) return [];

  if (Array.isArray(tags)) {
    return tags;
  }

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

  useEffect(() => {
    async function fetchPosts() {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          id,
          title,
          slug,
          content,
          tags,
          published_at
        `)
        .eq("type", "article")
        .eq("status", "published")
        .eq("visibility", "public")
        .order("published_at", {
          ascending: false,
        });

      if (!error && data) {
        setPosts(data);
      }

      setLoading(false);
    }

    fetchPosts();
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-6 py-24 text-white">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />

      <div className="fixed left-1/2 top-1/3 -z-10 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="mx-auto max-w-6xl">
        {/* Header */}
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
        </header>

        {/* Loading */}
        {loading && (
          <div className="py-24 text-center text-white/30">
            正在翻开大家留下的故事...
          </div>
        )}

        {/* Empty */}
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

        {/* Posts */}
        <div className="grid gap-7">
          {posts.map((post) => {
            const excerpt =
              getExcerpt(post.content);

            const readingTime =
              getReadingTime(post.content);

            const tags =
              normalizeTags(post.tags);

            return (
              <Link
                key={post.id}
                href={`/posts/${post.slug}`}
                className="
                  group rounded-[2.5rem]
                  border border-white/10
                  bg-white/[0.03]
                  p-10
                  backdrop-blur-2xl
                  transition-all duration-700
                  hover:-translate-y-1
                  hover:border-white/20
                  hover:bg-white/[0.05]
                "
              >
                {/* Top */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-white/30">
                  <span>
                    {formatDate(post.published_at)}
                  </span>

                  <span>·</span>

                  <span>{readingTime}</span>
                </div>

                {/* Title */}
                <h2 className="mt-6 text-3xl font-light leading-tight text-white/88 transition group-hover:text-white">
                  {post.title}
                </h2>

                {/* Excerpt */}
                <p className="mt-7 max-w-3xl text-[15px] leading-[2.15] text-white/42">
                  {excerpt}...
                </p>

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="mt-8 flex flex-wrap gap-3">
                    {tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="
                          rounded-full border border-white/10
                          bg-white/[0.04]
                          px-4 py-2
                          text-xs text-white/45
                        "
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Bottom */}
                <div className="mt-10 flex items-center justify-between">
                  <p className="text-sm text-white/25 transition group-hover:text-white/50">
                    进入这篇故事 →
                  </p>

                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full border border-white/10 bg-white/[0.03]" />

                    <div className="h-10 w-10 rounded-full border border-white/10 bg-white/[0.03]" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}