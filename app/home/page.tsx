"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getHomeAtmosphere } from "@/lib/getHomeAtmosphere";
import FloatingParticles from "@/components/FloatingParticles";
import PageTransition from "@/components/PageTransition";
import MouseGlow from "@/components/MouseGlow";

export default function HomePage() {
  const router = useRouter();
  const atmosphere = getHomeAtmosphere();

  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("居民");

  const [latestDiary, setLatestDiary] = useState("今晚还没有新的痕迹。");
  const [latestArticle, setLatestArticle] = useState("还没有新的故事。");
  const [latestDiaryId, setLatestDiaryId] = useState<number | null>(null);
  const [latestArticleSlug, setLatestArticleSlug] = useState("");

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", data.user.id)
        .single();

      setDisplayName(
        profile?.username || data.user.email?.split("@")[0] || "居民"
      );

      const { data: latestDiaryPost } = await supabase
        .from("posts")
        .select("id, content")
        .eq("type", "diary")
        .eq("visibility", "public")
        .eq("status", "published")
        .order("published_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (latestDiaryPost?.content) {
        setLatestDiary(latestDiaryPost.content.slice(0, 28));
        setLatestDiaryId(latestDiaryPost.id);
      }

      const { data: latestArticlePost } = await supabase
        .from("posts")
        .select("slug, title")
        .eq("type", "article")
        .eq("visibility", "public")
        .eq("status", "published")
        .order("published_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (latestArticlePost?.title) {
        setLatestArticle(latestArticlePost.title);
        setLatestArticleSlug(latestArticlePost.slug);
      }

      setLoading(false);
    }

    checkUser();
  }, [router]);

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black text-white">
        <FloatingParticles />

        <p className="relative z-10 text-sm tracking-[0.3em] text-white/35">
          正在回到你的房间...
        </p>
      </main>
    );
  }

  const lifeCards = [
    {
      label: "今日氛围",
      title: atmosphere.label,
      desc: atmosphere.quote,
      href: "/home",
    },
    {
      label: "最新故事",
      title: "📝 " + latestArticle,
      desc: "有人刚刚留下了一篇新的故事。",
      href: latestArticleSlug ? `/posts/${latestArticleSlug}` : "/space/articles",
    },
    {
      label: "今晚动态",
      title: "🌙 " + latestDiary,
      desc: "有人刚刚留下了新的日记。",
      href: latestDiaryId ? `/diary/${latestDiaryId}` : "/space/diaries",
    },
    {
      label: "今日状态",
      title: "☕ 今天也辛苦了",
      desc: "不需要每天都完美，能走到这里已经很好了。",
      href: "/home",
    },
  ];

  const homeCards = [
    {
      icon: "📔",
      title: "我的日记",
      desc: "那些只属于你的今天。",
      href: "/diary",
    },
    {
      icon: "📝",
      title: "我的文章",
      desc: "慢慢写下完整的故事。",
      href: "/space/articles",
    },
    {
      icon: "🕯️",
      title: "深夜广场",
      desc: "看看别人留下的光。",
      href: "/space",
    },
    {
      icon: "🎧",
      title: "今晚状态",
      desc: "给这个夜晚一点声音。",
      href: "/home",
    },
  ];

  return (
    <PageTransition>
      <main className="relative min-h-screen overflow-x-hidden bg-black text-white">
        <MouseGlow />
        <FloatingParticles />

        {/* 背景 */}
        <div className="fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />

        <div
          className={`
            fixed left-1/2 top-1/3 -z-10
            h-[520px] w-[520px]
            -translate-x-1/2 rounded-full
            ${atmosphere.glow}
            blur-3xl
          `}
        />

        {/* Navbar */}
        <nav className="fixed left-1/2 top-5 z-50 flex w-[92%] max-w-6xl -translate-x-1/2 items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 backdrop-blur-2xl">
          <div className="text-sm font-semibold tracking-wide text-white/80">
            小时代
          </div>

          <div className="hidden items-center gap-6 text-xs text-white/45 md:flex">
            <Link href="/home" className="text-white/80">
              首页
            </Link>

            <Link href="/space" className="transition hover:text-white/80">
              广场
            </Link>

            <Link href="/diary" className="transition hover:text-white/80">
              日记
            </Link>

            <Link
              href="/space/articles"
              className="transition hover:text-white/80"
            >
              文章
            </Link>

            <span>我的房间</span>
          </div>

          <div className="text-xs text-white/40">{atmosphere.label}</div>
        </nav>

        {/* Hero */}
        <PageTransition>
        <section className="relative z-10 flex min-h-[78vh] items-center justify-center px-6 pt-28">
          <div className="mx-auto max-w-5xl text-center">
            <p className="mb-5 text-xs tracking-[0.45em] text-white/25">
              RESIDENT HOME
            </p>

            <h1 className="
                text-5xl font-light leading-tight tracking-tight
                md:text-7xl
                animate-pulse
            ">
              欢迎回来，{displayName}.
            </h1>

            <h2 className="mt-6 text-2xl font-light text-white/75">
              {atmosphere.heroTitle}
            </h2>

            <p className="mx-auto mt-8 max-w-xl text-sm leading-7 text-white/45">
              {atmosphere.heroText}
            </p>

            <p className="mt-6 text-sm italic text-white/25">
              “{atmosphere.quote}”
            </p>

            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <button
                onClick={() => router.push("/diary/new")}
                className="rounded-full bg-white px-8 py-4 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                ✍️ 写日记
              </button>

              <button
                onClick={() => router.push("/write")}
                className="
                  rounded-full border border-white/10
                  bg-white/[0.04]
                  px-8 py-4 text-sm text-white/70
                  backdrop-blur-xl transition
                  hover:bg-white/[0.08]
                  hover:text-white
                "
              >
                📖 写文章
              </button>
            </div>
          </div>
        </section>
        </PageTransition>

        {/* 生活碎片 */}
        <section className="relative z-10 px-6 pb-16">
          <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2 xl:grid-cols-4">
            {lifeCards.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="
                    rounded-[2rem] border border-white/10
                    bg-white/[0.035] p-6 backdrop-blur-2xl
                    shadow-[0_0_50px_rgba(255,255,255,0.04)]
                    transition-all duration-700 ease-out
                    hover:-translate-y-2
                    hover:scale-[1.015]
                    hover:border-white/20
                    hover:bg-white/[0.055]
                    hover:shadow-[0_0_80px_rgba(255,255,255,0.06)]
                    "
              >
                <p className="text-xs tracking-[0.3em] text-white/30">
                  {item.label}
                </p>

                <h3 className="mt-4 line-clamp-2 text-2xl font-light">
                  {item.title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-white/45">
                  {item.desc}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Home Cards */}
        <section className="relative z-10 px-6 pb-32">
          <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-4">
            {homeCards.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="
                    rounded-[2rem] border border-white/10
                    bg-white/[0.035] p-6 backdrop-blur-2xl
                    shadow-[0_0_50px_rgba(255,255,255,0.04)]
                    transition-all duration-700 ease-out
                    hover:-translate-y-2
                    hover:scale-[1.015]
                    hover:border-white/20
                    hover:bg-white/[0.055]
                    hover:shadow-[0_0_80px_rgba(255,255,255,0.06)]
                    "
              >
                <div className="mb-8 text-3xl">{item.icon}</div>

                <h2 className="text-lg font-light text-white/85">
                  {item.title}
                </h2>

                <p className="mt-4 text-sm leading-6 text-white/35">
                  {item.desc}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </PageTransition>
  );
}