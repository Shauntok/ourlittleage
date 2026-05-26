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
  const nowTime = Date.now();

  const diffDays = Math.floor(
    (nowTime - joinedTime) / (1000 * 60 * 60 * 24)
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

type Props = {
  params: Promise<{
    username: string;
  }>;
};

export default async function UserPage({ params }: Props) {
  const { username } = await params;

  const decodedUsername = decodeURIComponent(username);

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", decodedUsername)
    .single();

  if (!profile) {
    notFound();
  }

  const residentTitle = getResidentTitle(profile.level || 1);

  const joinedDays = getJoinedDays(
    profile.joined_at || profile.created_at
  );

  const isStatusExpired =
    !profile.status_expires_at ||
    new Date(profile.status_expires_at).getTime() < Date.now();

  const { data: userBadges } = await supabase
    .from("user_badges")
    .select(`
      id,
      badges (
        id,
        name,
        color,
        description
      )
    `)
    .eq("user_id", profile.id);

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("author_id", profile.id)
    .eq("status", "published")
    .eq("visibility", "public")
    .order("published_at", {
      ascending: false,
    });

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-6 py-20 text-white">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />

      <div className="fixed left-1/2 top-1/3 -z-10 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="mx-auto max-w-6xl space-y-12">
        <Link
          href="/space"
          className="inline-flex text-sm text-white/35 transition hover:text-white/70"
        >
          ← 回到深夜广场
        </Link>

        {/* 房间头部 */}
        <section className="overflow-hidden rounded-[2.8rem] border border-white/10 bg-white/[0.035] backdrop-blur-2xl">
          {/* Banner */}
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

            <div className="absolute bottom-8 left-8 select-none text-7xl font-black tracking-tight text-white/5">
              ROOM
            </div>

            {(profile.status_message || profile.mood_emoji) &&
              !isStatusExpired && (
                <div className="absolute right-6 top-6 z-10 max-w-xs rounded-[1.5rem] border border-violet-500/20 bg-black/60 px-5 py-4 backdrop-blur-2xl shadow-[0_0_45px_rgba(139,92,246,0.12)]">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {profile.mood_emoji || "🌙"}
                    </span>

                    {profile.status_message && (
                      <span className="break-words text-sm leading-6 text-white/75">
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

          {/* 用户资料 */}
          <div className="relative px-8 pb-10">
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

            <div className="mt-7 space-y-6">
              <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-5 py-3 backdrop-blur-xl">
                <div className="h-3 w-3 animate-pulse rounded-full bg-green-400" />

                <p className="text-xs uppercase tracking-[0.28em] text-white/40">
                  {residentTitle}
                </p>
              </div>

              <div>
                <h1 className="text-5xl font-light tracking-tight md:text-6xl">
                  {profile.username}
                </h1>

                <p className="mt-3 text-sm text-white/35">
                  {profile.show_joined_days
                    ? `已在小时代居住 ${joinedDays} 天。`
                    : "正在这个世界留下故事。"}
                </p>
              </div>

              <p className="max-w-2xl text-base leading-8 text-white/55">
                {profile.bio || "这个房间暂时还很安静。"}
              </p>

              {(profile.show_level ||
                profile.show_exp ||
                profile.show_trust_score) && (
                <div className="flex flex-wrap gap-3">
                  {profile.show_level && (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/45">
                      Lv.{profile.level || 1}
                    </span>
                  )}

                  {profile.show_exp && (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/45">
                      经验 {profile.exp || 0}
                    </span>
                  )}

                  {profile.show_trust_score && (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/45">
                      信任 {profile.trust_score || 0}
                    </span>
                  )}
                </div>
              )}

              {profile.show_exp && (
                <div className="max-w-xl space-y-2">
                  <div className="flex items-center justify-between text-sm text-white/35">
                    <span>成长进度</span>

                    <span>{profile.exp || 0} / 100 EXP</span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full border border-white/10 bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                      style={{
                        width: `${Math.min(
                          ((profile.exp || 0) / 100) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {userBadges && userBadges.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {userBadges.map((item: any) => {
                    const badge = item.badges;

                    if (!badge) return null;

                    return (
                      <div
                        key={badge.id}
                        className={`rounded-full border px-4 py-2 text-sm backdrop-blur-xl ${
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

        {/* 公开内容 */}
        <section className="space-y-7">
          <div>
            <p className="text-xs tracking-[0.4em] text-white/25">
              PUBLIC WRITINGS
            </p>

            <h2 className="mt-4 text-3xl font-light">
              公开留下的东西
            </h2>
          </div>

          {posts?.length === 0 && (
            <div className="rounded-[2.2rem] border border-white/10 bg-white/[0.03] p-10 text-white/35">
              这个房间暂时还没有公开内容。
            </div>
          )}

          <div className="grid gap-6">
            {posts?.map((post) => {
              const imageUrls = getImages(post.content || "");
              const excerpt = getExcerpt(post.content || "");
              const title = getPostTitle(post);

              return (
                <Link
                  key={post.id}
                  href={
                    post.type === "diary"
                      ? `/diary/${post.id}`
                      : `/posts/${post.slug}`
                  }
                  className="
                    group block rounded-[2.4rem]
                    border border-white/10
                    bg-white/[0.03]
                    p-8
                    backdrop-blur-2xl
                    transition-all duration-700 ease-out
                    hover:-translate-y-1
                    hover:border-white/20
                    hover:bg-white/[0.055]
                    hover:shadow-[0_0_70px_rgba(255,255,255,0.05)]
                  "
                >
                  <div className="flex flex-wrap items-center gap-3 text-xs text-white/30">
                    <span>
                      {post.type === "diary" ? "日记" : "文章"}
                    </span>

                    <span>·</span>

                    <span>
                      {new Date(
                        post.published_at || post.created_at
                      ).toLocaleString("zh-CN")}
                    </span>
                  </div>

                  <h3 className="mt-5 text-2xl font-light text-white/85 transition group-hover:text-white">
                    <TranslatedText text={title} />
                  </h3>

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
                    <p className="mt-5 max-w-3xl text-sm leading-8 text-white/42">
                      <TranslatedText text={`${excerpt}...`} />
                    </p>
                  )}

                  <p className="mt-7 text-sm text-white/25 transition group-hover:text-white/50">
                    进入这段生活 →
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}