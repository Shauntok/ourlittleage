"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DiaryCalendarFilter from "@/components/diary/DiaryCalendarFilter";

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

function getDateInputValue(date: string) {
  return new Date(date).toISOString().slice(0, 10);
}

function getVisibilityLabel(visibility: string) {
  switch (visibility) {
    case "public":
      return "🌍 已公开";
    case "private":
      return "🔒 私密";
    case "hidden":
      return "🙈 隐藏";
    case "unlisted":
      return "🔗 链接可见";
    default:
      return "🌍 已公开";
  }
}

export default function DiaryPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [diaries, setDiaries] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [selectedDate, setSelectedDate] = useState("");

  const filteredDiaries = diaries.filter((diary) => {
    if (filter === "published" && diary.status !== "published") {
      return false;
    }

    if (filter === "draft" && diary.status !== "draft") {
      return false;
    }

    if (selectedDate) {
      const diaryDate = diary.published_at || diary.created_at;

      if (getDateInputValue(diaryDate) !== selectedDate) {
        return false;
      }
    }

    return true;
  });

  useEffect(() => {
    async function fetchDiaries() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/home");
        return;
      }

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("author_id", user.id)
        .or("type.eq.diary,type.is.null");

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      const sortedDiaries = (data || []).sort((a, b) => {
        const dateA = new Date(a.published_at || a.created_at).getTime();
        const dateB = new Date(b.published_at || b.created_at).getTime();

        return dateB - dateA;
      });

      setDiaries(sortedDiaries);
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
    <main className="min-h-screen overflow-x-hidden bg-black px-5 pb-24 pt-16 text-white md:px-6 md:py-24">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />
      <div className="pointer-events-none fixed left-1/2 top-1/3 -z-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl md:h-[580px] md:w-[580px]" />

      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col justify-between gap-5 md:mb-20 md:flex-row md:items-end md:gap-8">
          <div>
            <p className="text-xs tracking-[0.4em] text-white/25 md:tracking-[0.45em]">
              MY DIARY
            </p>

            <h1 className="mt-2 text-5xl font-light tracking-tight md:mt-6 md:text-6xl">
              我的日记
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-7 text-white/35 md:mt-6 md:leading-8">
              那些没有及时说出口的话，后来都慢慢留在了这里。
            </p>
          </div>

          <Link
            href="/diary/new"
            className="hidden rounded-full bg-white px-8 py-4 text-sm font-semibold text-black transition hover:bg-white/90 md:inline-flex"
          >
            ✍️ 写日记
          </Link>
        </header>

        <div className="mb-7 space-y-4 md:mb-10">
          <div className="flex flex-wrap gap-2 md:gap-3">
            {[
              {
                key: "all",
                label: "全部",
                count: diaries.length,
              },
              {
                key: "published",
                label: "已发布",
                count: diaries.filter((item) => item.status === "published")
                  .length,
              },
              {
                key: "draft",
                label: "草稿",
                count: diaries.filter((item) => item.status === "draft").length,
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

          <DiaryCalendarFilter
            diaries={diaries}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />
        </div>

        {filteredDiaries.length === 0 && (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-2xl md:rounded-[2.5rem] md:p-10">
            <p className="text-sm leading-8 text-white/40">
              这个分类里暂时还没有日记。
            </p>

            <Link
              href="/diary/new"
              className="mt-8 inline-flex rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              写下今天
            </Link>
          </div>
        )}

        <section className="grid gap-5 md:grid-cols-2">
          {filteredDiaries.map((diary) => {
            const diaryDate = diary.published_at || diary.created_at;

            return (
              <Link
                key={diary.id}
                href={`/diary/${diary.id}`}
                className="
                  group
                  block
                  min-w-0
                  overflow-hidden
                  rounded-[2rem]
                  border
                  border-white/10
                  bg-white/[0.03]
                  p-6
                  backdrop-blur-2xl
                  transition-all
                  duration-700
                  hover:-translate-y-1
                  hover:border-white/20
                  hover:bg-white/[0.05]
                  md:p-8
                "
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/35 md:gap-3">
                  <span>{formatWeekday(diaryDate)}</span>
                  <span>·</span>
                  <span>{getMoodLabel(diaryDate)}</span>
                  <span>·</span>
                  <span>{getVisibilityLabel(diary.visibility)}</span>
                </div>

                <h2 className="safe-text mt-4 text-3xl font-light tracking-tight text-white/90 transition group-hover:text-white md:mt-5 md:text-4xl">
                  {formatDate(diaryDate)}
                </h2>

                <p
                  className="
                    safe-pre
                    mt-5
                    line-clamp-3
                    text-[14px]
                    leading-[2]
                    text-white/50
                    md:mt-8
                    md:line-clamp-4
                    md:text-[15px]
                    md:leading-[2.2]
                  "
                >
                  {diary.content}
                </p>

                <div className="mt-6 flex items-center justify-between md:mt-10">
                  <p className="text-xs text-white/25 md:text-sm">
                    {(diary.edit_count || 0) > 0
                      ? `后来回来补写过 ${diary.edit_count} 次`
                      : "那一天留下的原始记录"}
                  </p>

                  <span className="text-xs text-white/20 transition group-hover:text-white/40 md:text-sm">
                    翻开 →
                  </span>
                </div>
              </Link>
            );
          })}
        </section>
      </div>

      <Link
        href="/diary/new"
        className="fixed bottom-6 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-xl text-black shadow-[0_0_40px_rgba(255,255,255,0.22)] transition hover:bg-white/90 md:hidden"
        aria-label="写日记"
      >
        ✍️
      </Link>
    </main>
  );
}