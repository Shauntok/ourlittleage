"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type DiaryPost = {
  id: number;
  content: string;
  published_at: string;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(new Date(date));
}

export default function PublicDiaryPage() {
  const [posts, setPosts] = useState<DiaryPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      const { data, error } = await supabase
        .from("posts")
        .select("id, content, published_at")
        .eq("type", "diary")
        .eq("visibility", "public")
        .eq("status", "published")
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
    <main className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />

      <div className="fixed left-1/2 top-1/3 -z-10 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-14">
          <p className="text-xs tracking-[0.45em] text-white/25">
            PUBLIC DIARY
          </p>

          <h1 className="mt-6 text-5xl font-light tracking-tight md:text-6xl">
            深夜广场
          </h1>

          <p className="mt-6 max-w-xl text-sm leading-8 text-white/35">
            有些人把今天留在这里，
            也许只是希望世界某个角落，
            会有人刚好看到。
          </p>
        </header>

        {/* Loading */}
        {loading && (
          <div className="py-20 text-center text-white/30">
            正在翻看大家留下的今天...
          </div>
        )}

        {/* Empty */}
        {!loading && posts.length === 0 && (
          <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-14 text-center backdrop-blur-2xl">
            <p className="text-xl text-white/55">
              今晚还没有人留下日记。
            </p>

            <p className="mt-5 text-sm leading-8 text-white/30">
              也许你会成为今晚第一个说话的人。
            </p>

            <Link
              href="/diary/new"
              className="
                mt-8 inline-flex items-center justify-center
                rounded-full bg-white px-7 py-3
                text-sm font-semibold text-black
                transition hover:bg-white/90
              "
            >
              ✍️ 写下今天
            </Link>
          </div>
        )}

        {/* Posts */}
        <div className="space-y-6">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/diary/${post.id}`}
              className="
                block rounded-[2.2rem]
                border border-white/10
                bg-white/[0.03]
                p-8
                backdrop-blur-2xl
                transition-all duration-500
                hover:border-white/20
                hover:bg-white/[0.05]
              "
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs tracking-[0.25em] text-white/25">
                  {formatDate(post.published_at)}
                </p>

                <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white/40">
                  日记
                </span>
              </div>

              <div className="mt-6">
                <p className="line-clamp-5 whitespace-pre-wrap text-[17px] leading-[2.2] text-white/78">
                  {post.content}
                </p>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <p className="text-sm text-white/25">
                  点击进入这一天 →
                </p>

                <div className="h-10 w-10 rounded-full border border-white/10 bg-white/[0.03]" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}