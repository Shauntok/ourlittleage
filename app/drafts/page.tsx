"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type DraftPost = {
  id: number;
  type: "diary" | "article";
  title: string | null;
  slug: string | null;
  content: string | null;
  visibility: string | null;
  created_at: string;
  edited_at: string | null;
};

function getExcerpt(content: string | null) {
  return (content || "")
    .replace(/!\[[^\]]*\]\(.*?\)/g, "")
    .replace(/[#>*_`-]/g, "")
    .trim()
    .slice(0, 120);
}

function getDraftHref(item: DraftPost) {
  if (item.type === "diary") return `/diary/${item.id}/edit`;
  return `/articles/edit/${item.id}`;
}

function getTypeLabel(type: string) {
  return type === "diary" ? "🌙 日记草稿" : "📖 文章草稿";
}

function getVisibilityLabel(visibility: string | null) {
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
      return "🔒 私密";
  }
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<DraftPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDrafts() {
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
          "id, type, title, slug, content, visibility, created_at, edited_at"
        )
        .eq("author_id", user.id)
        .eq("status", "draft")
        .in("type", ["diary", "article"])
        .order("created_at", { ascending: false });

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      setDrafts((data || []) as DraftPost[]);
      setLoading(false);
    }

    fetchDrafts();
  }, []);

  const diaryDrafts = drafts.filter((item) => item.type === "diary").length;
  const articleDrafts = drafts.filter((item) => item.type === "article").length;

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-5 pb-24 pt-16 text-white md:px-6 md:py-24">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />
      <div className="pointer-events-none fixed left-1/2 top-1/3 -z-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl md:h-[620px] md:w-[620px]" />

      <div className="mx-auto max-w-5xl">
        <Link
          href="/home"
          className="mb-7 inline-flex text-sm text-white/35 transition hover:text-white/70 md:mb-10"
        >
          ← 回到首页
        </Link>

        <header className="mb-8 md:mb-12">
          <p className="text-xs tracking-[0.4em] text-white/25">
            DRAFT BOX
          </p>

          <h1 className="mt-3 text-5xl font-light tracking-tight md:mt-6 md:text-6xl">
            草稿箱
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-7 text-white/35 md:mt-6 md:leading-8">
            那些还没说完的话，先被暂时收在这里。等你准备好了，再慢慢继续写。
          </p>

          <div className="mt-6 flex flex-wrap gap-2 md:mt-8 md:gap-3">
            <span className="rounded-full border border-white bg-white px-4 py-2.5 text-sm font-semibold text-black md:px-5 md:py-3">
              全部 {drafts.length}
            </span>

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/45 md:px-5 md:py-3">
              日记 {diaryDrafts}
            </span>

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/45 md:px-5 md:py-3">
              文章 {articleDrafts}
            </span>
          </div>
        </header>

        {loading && (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-10 text-center text-white/35 md:rounded-[2.5rem] md:p-14">
            正在翻找你的草稿...
          </div>
        )}

        {!loading && drafts.length === 0 && (
          <div className="flex min-h-[320px] items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-2xl md:rounded-[2.5rem] md:p-14">
            <div>
              <div className="text-5xl">📭</div>

              <h2 className="mt-6 text-2xl font-light text-white/70">
                这里还没有草稿
              </h2>

              <p className="mt-4 max-w-md text-sm leading-7 text-white/35">
                也许你还没有把话说到一半。没关系，慢慢来。
              </p>

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Link
                  href="/diary/new"
                  className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  写日记
                </Link>

                <Link
                  href="/articles/new"
                  className="rounded-full border border-white/10 bg-white/[0.04] px-7 py-3 text-sm text-white/60 transition hover:border-white/25 hover:text-white"
                >
                  写文章
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 md:space-y-5">
          {drafts.map((item) => {
            const excerpt = getExcerpt(item.content);
            const displayDate = item.edited_at || item.created_at;

            return (
              <Link
                key={`${item.type}-${item.id}`}
                href={getDraftHref(item)}
                className="group block min-w-0 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.055] md:rounded-[2.4rem] md:p-7"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/35">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                    {getTypeLabel(item.type)}
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                    {getVisibilityLabel(item.visibility)}
                  </span>
                </div>

                <h2 className="safe-text mt-5 line-clamp-2 break-all text-2xl font-light text-white/85 transition group-hover:text-white md:text-3xl">
                  {item.title || (item.type === "diary" ? "未命名日记" : "未命名文章")}
                </h2>

                {excerpt && (
                  <p className="safe-pre mt-4 line-clamp-3 text-sm leading-7 text-white/40 md:line-clamp-4">
                    {excerpt}...
                  </p>
                )}

                <div className="mt-6 flex flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between">
                  <p className="text-xs text-white/25">
                    暂存于：{new Date(displayDate).toLocaleString("zh-CN")}
                  </p>

                  <span className="text-white/35 transition group-hover:text-white/65">
                    继续编辑 →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}