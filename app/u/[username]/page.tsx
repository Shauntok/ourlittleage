import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import TranslatedText from "@/components/TranslatedText";

// ===== 从 Markdown 内容里提取最多 3 张图片 =====
function getImages(content: string) {
  return Array.from(
    content.matchAll(/!\[[^\]]*\]\((.*?)\)/g)
  )
    .map((match) => match[1])
    .slice(0, 3);
}

// ===== 清掉 Markdown 图片，只保留文字摘要 =====
function getExcerpt(content: string) {
  return content
    .replace(/!\[[^\]]*\]\(.*?\)/g, "")
    .trim()
    .slice(0, 120);
}

// ===== 根据等级显示居民称号 =====
function getResidentTitle(level: number) {
  if (level >= 50) return "小时代长老";
  if (level >= 20) return "资深居民";
  if (level >= 10) return "深夜居民";
  if (level >= 5) return "常驻居民";

  return "新住民";
}

// ===== 计算用户已经居住几天 =====
function getJoinedDays(joinedAt: string) {
  const joinedTime = new Date(joinedAt).getTime();

  const nowTime = Date.now();

  const diffDays = Math.floor(
    (nowTime - joinedTime) /
      (1000 * 60 * 60 * 24)
  );

  return Math.max(diffDays, 0);
}

type Props = {
  params: Promise<{
    username: string;
  }>;
};

// ===== 用户主页 / 小时代居民房间 =====
export default async function UserPage({
  params,
}: Props) {

  const { username } = await params;

  const decodedUsername =
    decodeURIComponent(username);

  // ===== 读取用户资料 =====
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", decodedUsername)
    .single();

  if (!profile) {
    notFound();
  }

  // ===== 居民称号 =====
  const residentTitle = getResidentTitle(
    profile.level || 1
  );

  // ===== 居住天数 =====
  const joinedDays = getJoinedDays(
    profile.joined_at ||
    profile.created_at
  );

  // ===== 今日状态是否过期 =====
  const isStatusExpired =
    !profile.status_expires_at ||
    new Date(
      profile.status_expires_at
    ).getTime() < Date.now();

  // ===== 读取用户徽章 =====
  const { data: userBadges } =
    await supabase
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

  // ===== 读取公开故事 =====
  const { data: posts } =
    await supabase
      .from("posts")
      .select("*")
      .eq("author_id", profile.id)
      .eq("status", "published")
      .eq("visibility", "public")
      .order("published_at", {
        ascending: false,
      });

  return (
    <main className="min-h-screen bg-black px-6 py-20 text-white">

      <div className="mx-auto max-w-5xl space-y-12">

        {/* ===== 房间头部 ===== */}
        <section className="overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-950/60">

          {/* ===== Banner ===== */}
          <div className="relative h-[260px] w-full">

            {profile.banner_url ? (
              <img
                src={profile.banner_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-zinc-900 via-black to-zinc-950" />
            )}

            {/* ===== Banner 遮罩 ===== */}
            <div className="absolute inset-0 bg-black/45" />

            {/* ===== 今日状态（右上角） ===== */}
            {(profile.status_message ||
              profile.mood_emoji) &&
              !isStatusExpired && (

              <div className="absolute right-6 top-6 z-10 max-w-xs rounded-2xl border border-violet-500/20 bg-black/60 px-5 py-3 backdrop-blur-xl">

                <div className="flex items-center gap-3">

                  <span className="text-2xl">
                    {profile.mood_emoji || "🌙"}
                  </span>

                  {profile.status_message && (
                    <span className="break-words text-sm text-zinc-200">
                      {profile.status_message}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-xs text-zinc-500">
                  今日状态将在夜里安静下来
                </p>
              </div>
            )}
          </div>

          {/* ===== 房间资料 ===== */}
          <div className="relative px-8 pb-8">

            {/* ===== 头像 ===== */}
            <div className="-mt-16 h-32 w-32 overflow-hidden rounded-full border-4 border-black bg-zinc-900 shadow-2xl">

              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-5xl">
                  👤
                </div>
              )}
            </div>

            <div className="mt-6 space-y-6">

              {/* ===== 居民门牌 ===== */}
              <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-5 py-3 backdrop-blur-xl">

                <div className="h-3 w-3 rounded-full bg-green-400 animate-pulse" />

                <p className="text-sm uppercase tracking-[0.25em] text-zinc-400">
                  {residentTitle}
                </p>
              </div>

              {/* ===== 用户名称 ===== */}
              <div>

                <h1 className="text-5xl font-black tracking-tight">
                  {profile.username}
                </h1>

                <p className="mt-2 text-zinc-500">
                  {profile.show_joined_days
                    ? `已在小时代居住 ${joinedDays} 天。`
                    : "正在这个世界留下故事。"}
                </p>
              </div>

              {/* ===== 用户简介 ===== */}
              <p className="max-w-2xl text-lg leading-8 text-zinc-300">
                {profile.bio ||
                  "这个房间暂时还很安静。"}
              </p>

              {/* ===== 成长数据 ===== */}
              {(profile.show_level ||
                profile.show_exp ||
                profile.show_trust_score) && (

                <div className="flex flex-wrap gap-3">

                  {profile.show_level && (
                    <span className="rounded-full border border-zinc-700 bg-black/40 px-4 py-2 text-sm text-zinc-300">
                      Lv.{profile.level || 1}
                    </span>
                  )}

                  {profile.show_exp && (
                    <span className="rounded-full border border-zinc-700 bg-black/40 px-4 py-2 text-sm text-zinc-300">
                      经验 {profile.exp || 0}
                    </span>
                  )}

                  {profile.show_trust_score && (
                    <span className="rounded-full border border-zinc-700 bg-black/40 px-4 py-2 text-sm text-zinc-300">
                      信任 {profile.trust_score || 0}
                    </span>
                  )}
                </div>
              )}

              {/* ===== 成长进度 ===== */}
              {profile.show_exp && (

                <div className="max-w-xl space-y-2">

                  <div className="flex items-center justify-between text-sm text-zinc-500">

                    <span>成长进度</span>

                    <span>
                      {profile.exp || 0} / 100 EXP
                    </span>
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

              {/* ===== 居民徽章 ===== */}
              {userBadges &&
                userBadges.length > 0 && (

                <div className="flex flex-wrap gap-3">

                  {userBadges.map((item: any) => {

                    const badge = item.badges;

                    if (!badge) return null;

                    return (
                      <div
                        key={badge.id}
                        className={`rounded-full border px-4 py-2 text-sm backdrop-blur-xl ${
                          badge.color === "gold"
                            ? "border-yellow-500 bg-yellow-500/20 text-yellow-100"

                            : badge.color === "emerald"
                            ? "border-emerald-500 bg-emerald-500/20 text-emerald-100"

                            : badge.color === "rose"
                            ? "border-rose-500 bg-rose-500/20 text-rose-100"

                            : badge.color === "sky"
                            ? "border-sky-500 bg-sky-500/20 text-sky-100"

                            : "border-violet-500 bg-violet-500/20 text-violet-100"
                        }`}
                      >
                        {badge.name}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ===== 公开故事 ===== */}
        <section className="space-y-6">

          <h2 className="text-2xl font-bold">
            公开故事
          </h2>

          {/* ===== 空状态 ===== */}
          {posts?.length === 0 && (
            <p className="text-zinc-500">
              这个房间暂时还没有公开故事。
            </p>
          )}

          {/* ===== 故事列表 ===== */}
          <div className="space-y-6">

            {posts?.map((post) => {

              const imageUrls =
                getImages(
                  post.content || ""
                );

              const excerpt =
                getExcerpt(
                  post.content || ""
                );

              return (
                <Link
                  key={post.id}
                  href={`/posts/${post.slug}`}
                  className="block rounded-2xl border border-zinc-800 p-6 transition hover:border-zinc-500 hover:bg-zinc-950"
                >

                  {/* ===== 标题 ===== */}
                  <h3 className="text-2xl font-bold">
                    <TranslatedText
                      text={post.title}
                    />
                  </h3>

                  {/* ===== 发布时间 ===== */}
                  <p className="mt-2 text-sm text-zinc-500">
                    发布于{" "}
                    {new Date(
                      post.published_at ||
                      post.created_at
                    ).toLocaleString()}
                  </p>

                  {/* ===== 图片 ===== */}
                  {imageUrls.length > 0 && (

                    <div className="mt-5 grid grid-cols-3 gap-3">

                      {imageUrls.map((url) => (
                        <img
                          key={url}
                          src={url}
                          alt=""
                          className="aspect-square w-full rounded-2xl border border-zinc-800 object-cover"
                        />
                      ))}
                    </div>
                  )}

                  {/* ===== 摘要 ===== */}
                  {excerpt && (
                    <p className="mt-4 leading-7 text-zinc-400">
                      <TranslatedText
                        text={`${excerpt}...`}
                      />
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}