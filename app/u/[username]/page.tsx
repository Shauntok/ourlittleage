import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import TranslatedText from "@/components/TranslatedText";

function getImages(content: string) {
  return Array.from(content.matchAll(/!\[[^\]]*\]\((.*?)\)/g))
    .map((match) => match[1])
    .slice(0, 3);
}

function getExcerpt(content: string) {
  return content
    .replace(/!\[[^\]]*\]\(.*?\)/g, "")
    .trim()
    .slice(0, 140);
}

function getResidentTitle(level: number) {
  if (level >= 50) return "小时代长老";
  if (level >= 20) return "资深居民";
  if (level >= 10) return "深夜居民";
  if (level >= 5) return "常驻居民";
  return "新住民";
}

function getJoinedDays(joinedAt: string) {
  const joinedTime = new Date(joinedAt).getTime();
  const diffDays = Math.floor(
    (Date.now() - joinedTime) / (1000 * 60 * 60 * 24)
  );

  return Math.max(diffDays, 0);
}

function getPostTitle(post: any) {
  if (post.title) return post.title;

  const date = new Date(
    post.published_at || post.created_at
  ).toLocaleDateString("zh-CN");

  return `${date} 的日记`;
}

function getLevelProgress(exp: number) {
  const total = Number(exp || 0);

  if (total >= 10) {
    return {
      level: 5,
      current: 0,
      max: 0,
      percent: 100,
      text: "Lv5 已满阶",
    };
  }

  if (total >= 6) {
    return {
      level: 4,
      current: Number((total - 6).toFixed(2)),
      max: 4,
      percent: ((total - 6) / 4) * 100,
      text: `Lv4 · ${Number(total - 6).toFixed(2)} / 4.00 光`,
    };
  }

  if (total >= 3) {
    return {
      level: 3,
      current: Number((total - 3).toFixed(2)),
      max: 3,
      percent: ((total - 3) / 3) * 100,
      text: `Lv3 · ${Number(total - 3).toFixed(2)} / 3.00 光`,
    };
  }

  if (total >= 1) {
    return {
      level: 2,
      current: Number((total - 1).toFixed(2)),
      max: 2,
      percent: ((total - 1) / 2) * 100,
      text: `Lv2 · ${Number(total - 1).toFixed(2)} / 2.00 光`,
    };
  }

  return {
    level: 1,
    current: Number(total.toFixed(2)),
    max: 1,
    percent: total * 100,
    text: `Lv1 · ${total.toFixed(2)} / 1.00 光`,
  };
}

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function UserPage({ params, searchParams }: Props) {
  const { username } = await params;
  const { tab } = await searchParams;

  const activeTab = tab === "diary" || tab === "article" ? tab : "all";
  const decodedUsername = decodeURIComponent(username);

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", decodedUsername)
    .single();

  if (!profile) notFound();

  const residentTitle = getResidentTitle(profile.level || 1);
  const levelProgress = getLevelProgress(Number(profile.exp || 0));
  const joinedDays = getJoinedDays(profile.joined_at || profile.created_at);

  const isStatusExpired =
    !profile.status_expires_at ||
    new Date(profile.status_expires_at).getTime() < Date.now();

  const { data: userBadges } = await supabase
    .from("user_badges")
    .select(`
      id,
      created_at,
      badges (
        id,
        name,
        color,
        description
      )
    `)
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("author_id", profile.id)
    .eq("status", "published")
    .eq("visibility", "public")
    .order("published_at", { ascending: false });

  const publicPosts = posts || [];
  const publicDiaries = publicPosts.filter((post) => post.type === "diary");
  const publicArticles = publicPosts.filter((post) => post.type === "article");

  const postIds = publicPosts.map((post) => post.id);

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

  const totalLikes = Array.from(likeCountMap.values()).reduce(
    (sum, count) => sum + count,
    0
  );

  const totalComments = Array.from(commentCountMap.values()).reduce(
    (sum, count) => sum + count,
    0
  );

  const profilePath = `/u/${encodeURIComponent(decodedUsername)}`;

  const showDiaries = activeTab === "all" || activeTab === "diary";
  const showArticles = activeTab === "all" || activeTab === "article";

  const roomTheme =
    profile.theme === "ocean"
      ? "from-blue-950 via-slate-950 to-black"
      : profile.theme === "forest"
      ? "from-emerald-950 via-green-950 to-black"
      : profile.theme === "sunset"
      ? "from-orange-950 via-amber-950 to-black"
      : profile.theme === "mist"
      ? "from-zinc-700 via-zinc-800 to-black"
      : "from-black via-zinc-950 to-black";

  function StatCard({
    label,
    value,
    desc,
  }: {
    label: string;
    value: string | number;
    desc: string;
  }) {
    return (
      <div className="min-w-0 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-2xl">
        <p className="text-xs tracking-[0.3em] text-white/25">{label}</p>
        <h3 className="safe-text mt-4 text-2xl font-light text-white/85">
          {value}
        </h3>
        <p className="mt-3 text-sm leading-6 text-white/35">{desc}</p>
      </div>
    );
  }

  function MetaPills({ post }: { post: any }) {
    return (
      <div className="mt-5 flex flex-wrap gap-2">
        <span className="rounded-full border border-pink-500/20 bg-pink-500/[0.06] px-3 py-1 text-xs text-pink-100/55">
          喜欢 {likeCountMap.get(post.id) || 0}
        </span>

        <span className="rounded-full border border-blue-500/20 bg-blue-500/[0.06] px-3 py-1 text-xs text-blue-100/55">
          评论 {commentCountMap.get(post.id) || 0}
        </span>
      </div>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-6 py-20 text-white">
      <div className={`fixed inset-0 -z-10 bg-gradient-to-b ${roomTheme}`} />
      <div className="fixed left-1/2 top-1/3 -z-10 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="mx-auto max-w-6xl space-y-12">
        <Link
          href="/space"
          className="inline-flex text-sm text-white/35 transition hover:text-white/70"
        >
          ← 回到深夜广场
        </Link>

        <section className="min-w-0 overflow-hidden rounded-[2.8rem] border border-white/10 bg-white/[0.035] backdrop-blur-2xl">
          <div className="relative h-[300px] w-full">
            {profile.banner_url ? (
              <img
                src={profile.banner_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-zinc-900 via-black to-zinc-950" />
            )}

            <div className="absolute inset-0 bg-black/50" />

            {(profile.status_message || profile.mood_emoji) &&
              !isStatusExpired && (
                <div className="absolute right-6 top-6 z-10 max-w-xs overflow-hidden rounded-[1.5rem] border border-violet-500/20 bg-black/60 px-5 py-4 backdrop-blur-2xl shadow-[0_0_45px_rgba(139,92,246,0.12)]">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="shrink-0 text-2xl">
                      {profile.mood_emoji || "🌙"}
                    </span>

                    {profile.status_message && (
                      <span className="safe-pre text-sm leading-6 text-white/75">
                        {profile.status_message}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-white/30">
                    今日状态将在夜里安静下来
                  </p>
                </div>
              )}
          </div>

          <div id="about-user" className="relative min-w-0 px-8 pb-10 scroll-mt-28">
            <div className="-mt-16 h-32 w-32 overflow-hidden rounded-full border-4 border-black bg-zinc-900 shadow-[0_0_55px_rgba(255,255,255,0.12)]">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-5xl text-white/25">
                  👤
                </div>
              )}
            </div>

            <div className="mt-7 min-w-0 space-y-6">
              <div className="inline-flex max-w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-5 py-3 backdrop-blur-xl">
                <div className="h-3 w-3 shrink-0 animate-pulse rounded-full bg-green-400" />
                <p className="safe-text text-xs uppercase tracking-[0.28em] text-white/40">
                  {residentTitle}
                </p>
              </div>

              <div className="min-w-0">
                <h1 className="safe-text text-5xl font-light tracking-tight md:text-6xl">
                  {profile.username}
                </h1>

                <p className="mt-3 text-sm text-white/35">
                  {profile.show_joined_days
                    ? `已在小时代居住 ${joinedDays} 天。`
                    : "正在这个世界留下故事。"}
                </p>
              </div>

              <p className="safe-pre max-w-2xl text-base leading-8 text-white/55">
                {profile.bio || "这个房间暂时还很安静。"}
              </p>

              <div className="flex flex-wrap gap-3">
                {profile.show_level && (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/45">
                    Lv.{profile.level || 1}
                  </span>
                )}

                {profile.show_exp && (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/45">
                    留下的光 {levelProgress.current.toFixed(2)}
                  </span>
                )}

                {profile.show_trust_score && (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/45">
                    社区信任 {Number(profile.trust_score || 0).toFixed(2)}
                  </span>
                )}
              </div>

              {profile.show_exp && (
                <div className="max-w-xl space-y-2">
                  <div className="flex items-center justify-between text-sm text-white/35">
                    <span>留下的光</span>
                    <span>{levelProgress.text}</span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full border border-white/10 bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                      style={{
                        width: `${Math.min(levelProgress.percent, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {userBadges && userBadges.length > 0 && (
                <div id="badges" className="flex flex-wrap gap-3 scroll-mt-28">
                  {userBadges.map((item: any) => {
                    const badge = item.badges;
                    if (!badge) return null;

                    return (
                      <div
                        key={badge.id}
                        className={`safe-text max-w-full rounded-full border px-4 py-2 text-sm backdrop-blur-xl ${
                          badge.color === "gold"
                            ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-100"
                            : badge.color === "emerald"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                            : badge.color === "rose"
                            ? "border-rose-500/30 bg-rose-500/10 text-rose-100"
                            : badge.color === "sky"
                            ? "border-sky-500/30 bg-sky-500/10 text-sky-100"
                            : "border-violet-500/30 bg-violet-500/10 text-violet-100"
                        }`}
                      >
                        🎖️ {badge.name}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="public-writings" className="space-y-10 scroll-mt-28">
          <div>
            <p className="text-xs tracking-[0.4em] text-white/25">
              PUBLIC WRITINGS
            </p>

            <h2 className="mt-4 text-3xl font-light">
              公开留下的东西
            </h2>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`${profilePath}?tab=all#public-writings`}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  activeTab === "all"
                    ? "border-white bg-white text-black"
                    : "border-white/10 bg-white/[0.04] text-white/45 hover:border-white/20 hover:text-white/75"
                }`}
              >
                全部 {publicPosts.length}
              </Link>

              <Link
                href={`${profilePath}?tab=article#public-writings`}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  activeTab === "article"
                    ? "border-white bg-white text-black"
                    : "border-white/10 bg-white/[0.04] text-white/45 hover:border-white/20 hover:text-white/75"
                }`}
              >
                文章 {publicArticles.length}
              </Link>

              <Link
                href={`${profilePath}?tab=diary#public-writings`}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  activeTab === "diary"
                    ? "border-white bg-white text-black"
                    : "border-white/10 bg-white/[0.04] text-white/45 hover:border-white/20 hover:text-white/75"
                }`}
              >
                日记 {publicDiaries.length}
              </Link>
            </div>
          </div>

          {publicPosts.length === 0 && (
            <div className="rounded-[2.2rem] border border-white/10 bg-white/[0.03] p-10 text-white/35">
              这个房间暂时还没有公开内容。
            </div>
          )}

          {showArticles && publicArticles.length > 0 && (
            <div id="public-articles" className="space-y-5 scroll-mt-28">
              <h3 className="text-xl font-light text-white/75">文章</h3>

              {publicArticles.map((post) => {
                const imageUrls = getImages(post.content || "");
                const excerpt = getExcerpt(post.content || "");
                const title = getPostTitle(post);

                return (
                  <Link
                    key={post.id}
                    href={`/articles/${post.slug}`}
                    className="group block min-w-0 overflow-hidden rounded-[2.4rem] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl transition-all duration-700 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.055]"
                  >
                    <p className="text-xs text-white/30">
                      文章 ·{" "}
                      {new Date(post.published_at || post.created_at).toLocaleString("zh-CN")}
                    </p>

                    <h3 className="safe-text mt-5 text-2xl font-light text-white/85">
                      <TranslatedText text={title} />
                    </h3>

                    <MetaPills post={post} />

                    {imageUrls.length > 0 && (
                      <div className="mt-5 grid grid-cols-3 gap-3">
                        {imageUrls.map((url) => (
                          <img
                            key={url}
                            src={url}
                            alt=""
                            className="aspect-square w-full rounded-2xl border border-white/10 object-cover"
                          />
                        ))}
                      </div>
                    )}

                    {excerpt && (
                      <p className="safe-pre mt-5 text-sm leading-8 text-white/42">
                        <TranslatedText text={`${excerpt}...`} />
                      </p>
                    )}

                    <p className="mt-7 text-sm text-white/25">
                      阅读这篇文章 →
                    </p>
                  </Link>
                );
              })}
            </div>
          )}

          {showDiaries && publicDiaries.length > 0 && (
            <div id="public-diaries" className="space-y-5 scroll-mt-28">
              <h3 className="text-xl font-light text-white/75">日记</h3>

              {publicDiaries.map((post) => {
                const excerpt = getExcerpt(post.content || "");
                const title = getPostTitle(post);

                return (
                  <Link
                    key={post.id}
                    href={`/diary/${post.id}`}
                    className="group block min-w-0 overflow-hidden rounded-[2.4rem] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl transition-all duration-700 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.055]"
                  >
                    <p className="text-xs text-white/30">
                      日记 ·{" "}
                      {new Date(post.published_at || post.created_at).toLocaleString("zh-CN")}
                    </p>

                    <h3 className="safe-text mt-5 text-2xl font-light text-white/85">
                      <TranslatedText text={title} />
                    </h3>

                    <MetaPills post={post} />

                    {excerpt && (
                      <p className="safe-pre mt-5 text-sm leading-8 text-white/42">
                        <TranslatedText text={`${excerpt}...`} />
                      </p>
                    )}

                    <p className="mt-7 text-sm text-white/25">
                      翻开这一天 →
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}