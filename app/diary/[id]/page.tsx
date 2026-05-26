"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import TranslatedMarkdown from "@/components/TranslatedMarkdown";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

function formatWeekday(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    weekday: "long",
  }).format(new Date(date));
}

function formatTime(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function getMoodLabel(date: string) {
  const hour = new Date(date).getHours();

  if (hour >= 0 && hour < 5) return "🌙 深夜";
  if (hour >= 5 && hour < 11) return "🌤 清晨";
  if (hour >= 11 && hour < 18) return "☀️ 午后";

  return "🌆 夜晚";
}

export default function DiaryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [loading, setLoading] = useState(true);
  const [diary, setDiary] = useState<any>(null);

  useEffect(() => {
    async function fetchDiary() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/home");;
        return;
      }

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .eq("author_id", user.id)
        .eq("type", "diary")
        .single();

      if (error || !data) {
        router.push("/diary");
        return;
      }

      setDiary(data);
      setLoading(false);
    }

    fetchDiary();
  }, [id, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm tracking-[0.3em] text-white/35">
          正在翻开那一天...
        </p>
      </main>
    );
  }

  const diaryDate = diary.published_at || diary.created_at;

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-6 py-24 text-white">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />
      <div className="fixed left-1/2 top-1/3 -z-10 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />

      <article className="mx-auto max-w-3xl">
        <Link
          href="/diary"
          className="text-sm text-white/35 transition hover:text-white/70"
        >
          ← 回到日记
        </Link>

        <header className="mt-14 rounded-[2.3rem] border border-white/10 bg-white/[0.035] p-9 backdrop-blur-2xl shadow-[0_0_80px_rgba(255,255,255,0.045)]">
          <p className="text-xs tracking-[0.38em] text-white/25">
            那一天
          </p>

          <h1 className="mt-5 text-5xl font-light tracking-tight md:text-6xl">
            {formatDate(diaryDate)}
          </h1>

          <p className="mt-6 text-sm leading-7 text-white/35">
            {formatWeekday(diaryDate)} · {getMoodLabel(diaryDate)} ·{" "}
            {formatTime(diaryDate)}
          </p>

          <div className="mt-7 flex flex-wrap gap-3 text-xs text-white/40">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
              {diary.visibility === "public" ? "🌍 已公开" : "🔒 私密"}
            </span>

            {diary.edit_count > 0 && (
              <span className="rounded-full border border-yellow-500/15 bg-yellow-500/[0.06] px-4 py-2 text-yellow-100/60">
                后来补写过 {diary.edit_count} 次
              </span>
            )}
          </div>
        </header>

        <section className="mt-10 rounded-[2.3rem] border border-white/10 bg-white/[0.03] p-9 backdrop-blur-2xl">
          <article
            className="
              prose prose-invert max-w-none
              prose-p:text-white/75 prose-p:leading-[2.4]
              prose-headings:font-light prose-headings:text-white/90
              prose-blockquote:border-white/20 prose-blockquote:text-white/55
              text-[17px] leading-[2.4]
            "
          >
            <TranslatedMarkdown content={diary.content || ""} />
          </article>
        </section>

        <footer className="mt-10 space-y-6">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-6 text-sm leading-7 text-white/35 backdrop-blur-2xl">
            {diary.edited_at ? (
              <>
                <p>后来又回来补写了一些东西。</p>
                <p className="mt-2 text-white/25">
                  补写于：{new Date(diary.edited_at).toLocaleString()}
                </p>
              </>
            ) : (
              <p>这是那天留下的原始记录。</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href={`/diary/${diary.id}/edit`}
              className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm text-white/60 transition hover:text-white"
            >
              编辑日记
            </Link>

            <Link
              href="/diary"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              回到日记页
            </Link>
          </div>
        </footer>
      </article>
    </main>
  );
}