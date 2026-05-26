"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

function getMoodLabel(date: string) {
  const hour = new Date(date).getHours();

  if (hour >= 0 && hour < 5) return "🌙 深夜";
  if (hour >= 5 && hour < 11) return "🌤 清晨";
  if (hour >= 11 && hour < 18) return "☀️ 午后";

  return "🌆 夜晚";
}

export default function DiaryPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [diaries, setDiaries] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDiaries() {
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
        .eq("author_id", user.id)
        .eq("type", "diary")
        .order("published_at", {
          ascending: false,
        });

      if (!error && data) {
        setDiaries(data);
      }

      setLoading(false);
    }

    fetchDiaries();
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm tracking-[0.3em] text-white/35">
          正在翻找那些日子...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-6 py-24 text-white">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />

      <div className="fixed left-1/2 top-1/3 -z-10 h-[580px] w-[580px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <header className="mb-20">
          <p className="text-xs tracking-[0.45em] text-white/25">
            DIARY
          </p>

          <h1 className="mt-6 text-6xl font-light tracking-tight">
            日记
          </h1>

          <p className="mt-6 max-w-md text-sm leading-8 text-white/35">
            那些没有及时说出口的话，
            后来都慢慢留在了这里。
          </p>
        </header>

        {/* Empty */}
        {diaries.length === 0 && (
          <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-10 text-center backdrop-blur-2xl">
            <p className="text-sm leading-8 text-white/40">
              这里还没有留下任何一天。
            </p>

            <Link
              href="/diary/new"
              className="mt-8 inline-flex rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              写下第一篇日记
            </Link>
          </div>
        )}

        {/* Diary Cards */}
        <section className="space-y-8">
          {diaries.map((diary) => {
            const diaryDate =
              diary.published_at || diary.created_at;

            return (
              <Link
                key={diary.id}
                href={`/diary/${diary.id}`}
                className="
                  group block rounded-[2.3rem]
                  border border-white/10
                  bg-white/[0.03]
                  p-8 backdrop-blur-2xl
                  transition-all duration-700
                  hover:-translate-y-1
                  hover:bg-white/[0.05]
                  hover:border-white/20
                "
              >
                <div className="flex flex-wrap items-center gap-3 text-xs text-white/35">
                  <span>
                    {formatWeekday(diaryDate)}
                  </span>

                  <span>·</span>

                  <span>
                    {getMoodLabel(diaryDate)}
                  </span>

                  {diary.visibility === "public" && (
                    <>
                      <span>·</span>
                      <span>🌍 已公开</span>
                    </>
                  )}
                </div>

                <h2 className="mt-5 text-4xl font-light tracking-tight text-white/90 transition group-hover:text-white">
                  {formatDate(diaryDate)}
                </h2>

                <p className="mt-8 line-clamp-4 text-[15px] leading-[2.2] text-white/50">
                  {diary.content}
                </p>

                <div className="mt-10 flex items-center justify-between">
                  <p className="text-sm text-white/25">
                    {diary.edit_count > 0
                      ? `后来回来补写过 ${diary.edit_count} 次`
                      : "那一天留下的原始记录"}
                  </p>

                  <span className="text-sm text-white/20 transition group-hover:text-white/40">
                    翻开 →
                  </span>
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}