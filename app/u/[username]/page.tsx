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

    const residentTitle = getResidentTitle(
    profile.level || 1
    );

    const joinedDays = getJoinedDays(
    profile.joined_at || profile.created_at
    );


    // ===== 读取用户徽章 =====
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

    // ===== 读取这个用户的公开故事 =====
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
    <main className="min-h-screen bg-black text-white px-6 py-20">
      <div className="max-w-4xl mx-auto space-y-12">

        {/* ===== 用户主页头部 / 房间门面 ===== */}
        <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/60">

          {/* ===== Banner 背景图 ===== */}
          <div className="absolute inset-0 opacity-40">
            {profile.banner_url ? (
              <img
                src={profile.banner_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-zinc-900 via-black to-zinc-950" />
            )}
          </div>

          {/* ===== 黑色遮罩：让头像和文字更清楚 ===== */}
          <div className="absolute inset-0 bg-black/55" />

          {/* ===== 内容层 ===== */}
          <div className="relative z-10 p-8 pt-20">

            {/* ===== 用户头像 ===== */}
            <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-black bg-zinc-900">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-5xl">
                  👤
                </div>
              )}
            </div>

            {/* ===== 居民信息区 ===== */}
            <div className="mt-6 space-y-5">

              {/* ===== 小时代居民门牌 ===== */}
              <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl">
                <div className="h-3 w-3 rounded-full bg-green-400 animate-pulse" />

                <p className="text-sm tracking-[0.25em] uppercase text-zinc-400">
                    {residentTitle}
                </p>
              </div>

              {/* ===== 居民成长数据 ===== */}
                {(profile.show_level ||
                profile.show_exp ||
                profile.show_trust_score) && (
                <div className="flex flex-wrap gap-3">
                    {profile.show_level && (
                    <span className="px-4 py-2 rounded-full border border-zinc-700 bg-black/40 text-sm text-zinc-300">
                        Lv.{profile.level || 1}
                    </span>
                    )}

                    {profile.show_exp && (
                    <span className="px-4 py-2 rounded-full border border-zinc-700 bg-black/40 text-sm text-zinc-300">
                        经验 {profile.exp || 0}
                    </span>
                    )}

                    {profile.show_trust_score && (
                    <span className="px-4 py-2 rounded-full border border-zinc-700 bg-black/40 text-sm text-zinc-300">
                        信任 {profile.trust_score || 0}
                    </span>
                    )}
                </div>
                )}

                {/* ===== 经验进度条 ===== */}
                {profile.show_exp && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-zinc-500">
                    <span>成长进度</span>

                    <span>
                        {profile.exp || 0} / 100 EXP
                    </span>
                    </div>

                    <div className="h-3 rounded-full bg-white/5 overflow-hidden border border-white/10">
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

                        return (
                        <div
                            key={badge.id}
                            className={`px-4 py-2 rounded-full border text-sm text-white backdrop-blur-xl ${
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

              {/* ===== 用户名称 ===== */}
              <div>
                <h1 className="text-5xl font-black tracking-tight">
                  {profile.username}
                </h1>

                <p className="text-zinc-500 mt-2">
                {profile.show_joined_days
                    ? `已在小时代居住 ${joinedDays} 天。`
                    : "正在这个世界留下故事。"}
                </p>
              </div>

              {/* ===== 用户简介 ===== */}
              <p className="text-zinc-300 text-lg leading-8 max-w-2xl">
                {profile.bio ||
                  "这个房间暂时还很安静。"}
              </p>
            </div>
          </div>
        </section>

        {/* ===== 公开故事区 ===== */}
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
              const imageUrls = getImages(
                post.content || ""
              );

              const excerpt = getExcerpt(
                post.content || ""
              );

              return (
                <Link
                  key={post.id}
                  href={`/posts/${post.slug}`}
                  className="block border border-zinc-800 rounded-2xl p-6 hover:border-zinc-500 hover:bg-zinc-950 transition"
                >
                  {/* ===== 故事标题 ===== */}
                  <h3 className="text-2xl font-bold">
                    <TranslatedText text={post.title} />
                  </h3>

                  {/* ===== 发布时间 ===== */}
                  <p className="text-sm text-zinc-500 mt-2">
                    发布于{" "}
                    {new Date(
                      post.published_at ||
                        post.created_at
                    ).toLocaleString()}
                  </p>

                  {/* ===== 图片预览 ===== */}
                  {imageUrls.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mt-5">
                      {imageUrls.map((url) => (
                        <img
                          key={url}
                          src={url}
                          alt=""
                          className="aspect-square w-full object-cover rounded-2xl border border-zinc-800"
                        />
                      ))}
                    </div>
                  )}

                  {/* ===== 故事摘要 ===== */}
                  {excerpt && (
                    <p className="text-zinc-400 mt-4 leading-7">
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