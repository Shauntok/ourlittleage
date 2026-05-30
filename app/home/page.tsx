"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getHomeAtmosphere } from "@/lib/getHomeAtmosphere";
import { getNightBroadcast } from "@/lib/getNightBroadcast";
import FloatingParticles from "@/components/FloatingParticles";
import PageTransition from "@/components/PageTransition";
import MouseGlow from "@/components/MouseGlow";

export default function HomePage() {
  const router = useRouter();
  const atmosphere = getHomeAtmosphere();
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineResidents, setOnlineResidents] =useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("居民");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [latestDiary, setLatestDiary] =useState("今晚还没有新的痕迹。");
  const [latestArticle, setLatestArticle] =useState("还没有新的故事。");
  const [latestDiaryId, setLatestDiaryId] =useState<number | null>(null);
  const [latestArticleSlug, setLatestArticleSlug] = useState<string | null>(null);
  const [nightBroadcast, setNightBroadcast] =useState("今晚似乎有很多人睡不着。");

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();

      const fiveMinutesAgo = new Date(
        Date.now() - 5 * 60 * 1000
      ).toISOString();

      const { count: onlineResidentsCount } = await supabase
        .from("profiles")
        .select("id", {
          count: "exact",
          head: true,
        })
        .gte("last_seen_at", fiveMinutesAgo);

      setOnlineCount(onlineResidentsCount || 0);

      const { data: onlineProfiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, mood_emoji, status_message, last_seen_at")
        .gte("last_seen_at", fiveMinutesAgo)
        .order("last_seen_at", {
          ascending: false,
        })
        .limit(6);

      setOnlineResidents(onlineProfiles || []);

      if (!data.user) {
        router.push("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", data.user.id)
        .single();

      const finalDisplayName =
        profile?.username ||
        data.user.email?.split("@")[0] ||
        "居民";

      setDisplayName(finalDisplayName);
      setAvatarUrl(profile?.avatar_url || "");

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
        setLatestDiary(
          latestDiaryPost.content.slice(0, 28)
        );

        setLatestDiaryId(latestDiaryPost.id);
      }

      const { data: latestArticlePost } = await supabase
        .from("posts")
        .select("id, slug, title")
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

      const broadcasts: string[] = [];

      if (latestArticlePost?.title) {
        broadcasts.push(
          `有人刚刚写下了《${latestArticlePost.title}》。`
        );
      }

      if (latestDiaryPost?.content) {
        broadcasts.push(
          "有人刚刚留下了一篇新的日记。"
        );
      }

      setNightBroadcast(
        broadcasts.length > 0
          ? broadcasts[
              Math.floor(
                Math.random() * broadcasts.length
              )
            ]
          : getNightBroadcast(onlineCount)
      );

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

  const profileHref =
    displayName && displayName !== "居民"
      ? `/u/${encodeURIComponent(displayName)}`
      : "/settings/profile";

  const lifeCards = [
    {
      label: "深夜灯火",
      title: `🌙 ${onlineCount} 位居民还醒着`,
      desc: "有人正在房间里，慢慢留下今天。",
      href: "/space",
    },
    {
      label: "最新故事",
      title: "📝 " + latestArticle,
      desc: "有人刚刚留下了一篇新的故事。",
      href: latestArticleSlug
        ? `/articles/${latestArticleSlug}`
        : "/space/articles",
    },
    {
      label: "今晚动态",
      title: "🌙 " + latestDiary,
      desc: "有人刚刚留下了新的日记。",
      href: latestDiaryId
        ? `/diary/${latestDiaryId}`
        : "/space/diaries",
    },
    {
      label: "我的房间",
      title: "👤 " + displayName,
      desc: "看看别人眼中的你。",
      href: profileHref,
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
      icon: "⚙️",
      title: "房间设置",
      desc: "头像、简介、状态和背景。",
      href: "/settings/profile",
    },
    {
      icon: "🕯️",
      title: "深夜广场",
      desc: "看看别人留下的光。",
      href: "/space",
    },
    {
      icon: "👤",
      title: "我的房间",
      desc: "回到属于你的角落。",
      href: profileHref,
    },
  ];

  return (
    <PageTransition>
      <main className="relative min-h-screen overflow-x-hidden bg-black text-white">
        <MouseGlow />
        <FloatingParticles />

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

        <section className="relative z-10 flex min-h-[78vh] items-center justify-center px-6 pt-28">
          <div className="mx-auto max-w-5xl text-center">
            <div
              className="
                mx-auto mb-8 inline-flex items-center gap-3
                rounded-full border border-violet-500/20
                bg-violet-500/10
                px-5 py-3
                text-sm text-violet-100
                backdrop-blur-xl
              "
            >
              <span className="animate-pulse">
                🌙
              </span>

              <span>{nightBroadcast}</span>
            </div>

            <p className="mb-5 text-xs tracking-[0.45em] text-white/25">
              RESIDENT HOME
            </p>

            <h1 className="text-5xl font-light leading-tight tracking-tight md:text-7xl">
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

        {/* 在线居民 */}
        {onlineResidents.length > 0 && (
          <section className="relative z-10 px-6 pb-16">
            <div className="mx-auto max-w-6xl rounded-[2.5rem] border border-white/10 bg-white/[0.035] p-8 backdrop-blur-2xl shadow-[0_0_70px_rgba(255,255,255,0.035)]">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                <div>
                  <p className="text-xs tracking-[0.35em] text-white/25">
                    AWAKE RESIDENTS
                  </p>

                  <h2 className="mt-4 text-3xl font-light">
                    深夜还亮着灯的房间
                  </h2>

                  <p className="mt-4 max-w-xl text-sm leading-7 text-white/35">
                    有些居民还没有睡，正在这个世界里慢慢经过。
                  </p>
                </div>

                <Link
                  href="/space"
                  className="text-sm text-white/35 transition hover:text-white/70"
                >
                  去广场看看 →
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                {onlineResidents.map((resident) => {
                  const href = resident.username
                    ? `/u/${encodeURIComponent(resident.username)}`
                    : "/space";

                  return (
                    <Link
                      key={resident.id}
                      href={href}
                      className="
                        group flex items-center gap-4 rounded-2xl
                        border border-white/10 bg-black/35
                        px-5 py-4
                        transition-all duration-500
                        hover:-translate-y-1
                        hover:border-white/20
                        hover:bg-white/[0.055]
                      "
                    >
                      <div className="relative">
                        <div className="h-12 w-12 overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
                          {resident.avatar_url ? (
                            <img
                              src={resident.avatar_url}
                              alt={resident.username || "居民"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-lg">
                              🌙
                            </div>
                          )}
                        </div>

                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border border-black bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.8)]" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm text-white/75">
                          {resident.username || "无名居民"}
                        </p>

                        <p className="mt-1 truncate text-xs text-white/35">
                          {resident.mood_emoji
                            ? `${resident.mood_emoji} ${resident.status_message || "还醒着"}`
                            : "还醒着"}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

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
                <div className="mb-8 text-3xl">
                  {item.icon}
                </div>

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