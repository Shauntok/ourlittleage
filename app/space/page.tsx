import Link from "next/link";
import { supabase } from "@/lib/supabase";

type SpacePost = {
  id: number;
  title: string | null;
  slug: string | null;
  content: string;
  type: "article" | "diary";
  published_at: string;
  created_at: string;
  author_id: string;
  authorProfile?: {
    username: string | null;
    avatar_url: string | null;
  } | null;
  likeCount?: number;
  commentCount?: number;
};

function getExcerpt(content: string, length = 120) {
  return content
    .replace(/!\[[^\]]*\]\(.*?\)/g, "")
    .replace(/[#>*`-]/g, "")
    .trim()
    .slice(0, length);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function getPostTitle(post: SpacePost) {
  if (post.title) return post.title;

  const date = new Date(
    post.published_at || post.created_at
  ).toLocaleDateString("zh-CN");

  return `${date} 的日记`;
}

function getPostHref(post: SpacePost) {
  if (post.type === "diary") return `/diary/${post.id}`;
  if (post.type === "article" && post.slug) return `/articles/${post.slug}`;

  return "/space";
}

async function fetchSpacePosts(type: "article" | "diary") {
  const { data, error } = await supabase
    .from("posts")
    .select("id, title, slug, content, type, published_at, created_at, author_id")
    .eq("type", type)
    .eq("status", "published")
    .eq("visibility", "public")
    .order("published_at", {
      ascending: false,
    })
    .limit(20);

  if (error || !data) return [];

  const authorIds = Array.from(
    new Set(data.map((post) => post.author_id).filter(Boolean))
  );

  const { data: profiles } =
    authorIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", authorIds)
      : { data: [] as any[] };

  const profileMap = new Map(
    (profiles || []).map((profile: any) => [
      profile.id,
      {
        username: profile.username,
        avatar_url: profile.avatar_url,
      },
    ])
  );

  const postIds = data.map((post) => post.id);

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

  return data.map((post: any) => ({
    ...post,
    authorProfile: profileMap.get(post.author_id) || null,
    likeCount: likeCountMap.get(post.id) || 0,
    commentCount: commentCountMap.get(post.id) || 0,
  })) as SpacePost[];
}

function getHotPosts(posts: SpacePost[]) {
  return [...posts]
    .sort((a, b) => {
      const scoreA = (a.likeCount || 0) * 3 + (a.commentCount || 0) * 2;
      const scoreB = (b.likeCount || 0) * 3 + (b.commentCount || 0) * 2;

      return scoreB - scoreA;
    })
    .slice(0, 3);
}

function PostCard({ post }: { post: SpacePost }) {
  const author = post.authorProfile;
  const authorHref = author?.username
    ? `/u/${encodeURIComponent(author.username)}`
    : null;

  return (
    <Link
      href={getPostHref(post)}
      className="group block min-w-0 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.055]"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
            {author?.avatar_url ? (
              <img
                src={author.avatar_url}
                alt={author.username || "居民"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm">
                🌙
              </div>
            )}
          </div>

          <div className="min-w-0">
            {authorHref ? (
              <span className="safe-text block truncate text-sm text-white/60">
                {author?.username || "已离开的居民"}
              </span>
            ) : (
              <span className="safe-text block truncate text-sm text-white/35">
                已离开的居民
              </span>
            )}

            <p className="mt-1 text-xs text-white/25">
              {formatDate(post.published_at || post.created_at)}
            </p>
          </div>
        </div>

        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/40">
          {post.type === "diary" ? "日记" : "文章"}
        </span>
      </div>

      <h3 className="safe-text text-xl font-light leading-tight text-white/85 transition group-hover:text-white">
        {getPostTitle(post)}
      </h3>

      <p className="safe-pre mt-4 text-sm leading-7 text-white/42">
        {getExcerpt(post.content)}
        {post.content.length > 120 ? "..." : ""}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <span className="rounded-full border border-pink-500/20 bg-pink-500/[0.06] px-3 py-1 text-xs text-pink-100/55">
          喜欢 {post.likeCount || 0}
        </span>

        <span className="rounded-full border border-blue-500/20 bg-blue-500/[0.06] px-3 py-1 text-xs text-blue-100/55">
          评论 {post.commentCount || 0}
        </span>
      </div>
    </Link>
  );
}

function SectionBlock({
  title,
  subtitle,
  href,
  posts,
}: {
  title: string;
  subtitle: string;
  href: string;
  posts: SpacePost[];
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-3xl font-light">{title}</h2>

          <p className="mt-3 text-sm leading-7 text-white/35">
            {subtitle}
          </p>
        </div>

        <Link
          href={href}
          className="text-sm text-white/35 transition hover:text-white/70"
        >
          查看更多 →
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-8 text-sm text-white/30">
          这里暂时还没有内容。
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={`${post.type}-${post.id}`} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function SpacePage() {
  const [articles, diaries] = await Promise.all([
    fetchSpacePosts("article"),
    fetchSpacePosts("diary"),
  ]);

  const latestDiaries = diaries.slice(0, 3);
  const latestArticles = articles.slice(0, 3);

  const hotDiaries = getHotPosts(diaries);
  const hotArticles = getHotPosts(articles);

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-6 py-24 text-white">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />
      <div className="fixed left-1/2 top-1/3 -z-10 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="mx-auto max-w-6xl space-y-16">
        <header>
          <p className="text-xs tracking-[0.45em] text-white/25">
            PUBLIC SPACE
          </p>

          <h1 className="mt-6 text-6xl font-light tracking-tight">
            深夜广场
          </h1>

          <p className="mt-6 max-w-xl text-sm leading-8 text-white/35">
            有些人留下今天，有些人留下故事。你可以慢慢经过，
            也可以在某个角落停下来。
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <Link
              href="/space/diaries"
              className="group rounded-[2rem] border border-white/10 bg-white/[0.035] p-7 backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.055]"
            >
              <p className="text-3xl">🌙</p>

              <h2 className="mt-5 text-2xl font-light">
                日记广场
              </h2>

              <p className="mt-4 text-sm leading-7 text-white/35">
                看看其他居民公开留下的今天。
              </p>

              <p className="mt-6 text-sm text-white/25 transition group-hover:text-white/55">
                进入日记广场 →
              </p>
            </Link>

            <Link
              href="/space/articles"
              className="group rounded-[2rem] border border-white/10 bg-white/[0.035] p-7 backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.055]"
            >
              <p className="text-3xl">📖</p>

              <h2 className="mt-5 text-2xl font-light">
                文章广场
              </h2>

              <p className="mt-4 text-sm leading-7 text-white/35">
                阅读更完整的故事、长文、作品和想法。
              </p>

              <p className="mt-6 text-sm text-white/25 transition group-hover:text-white/55">
                进入文章广场 →
              </p>
            </Link>
          </div>
        </header>

        <SectionBlock
          title="最新日记"
          subtitle="刚刚有人把今天留在这里。"
          href="/space/diaries"
          posts={latestDiaries}
        />

        <SectionBlock
          title="热门日记"
          subtitle="被更多居民回应和喜欢的深夜碎片。"
          href="/space/diaries"
          posts={hotDiaries}
        />

        <SectionBlock
          title="最新文章"
          subtitle="新写下的故事、长文和作品。"
          href="/space/articles"
          posts={latestArticles}
        />

        <SectionBlock
          title="热门文章"
          subtitle="最近更容易被看见的故事。"
          href="/space/articles"
          posts={hotArticles}
        />
      </div>
    </main>
  );
}