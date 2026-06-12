import Link from "next/link";

export type SpacePost = {
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

type Props = {
  activeFeed: string;
  latestDiaries: SpacePost[];
  latestArticles: SpacePost[];
  hotDiaries: SpacePost[];
  hotArticles: SpacePost[];
};

function getExcerpt(content: string, length = 100) {
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

function PostCard({ post }: { post: SpacePost }) {
  const author = post.authorProfile;

  return (
    <Link
      href={getPostHref(post)}
      className="group block min-w-0 overflow-hidden rounded-[1.7rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.055] md:rounded-[2rem] md:p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
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
            <span className="safe-text block truncate text-sm text-white/60">
              {author?.username || "已离开的居民"}
            </span>

            <p className="mt-1 truncate text-xs text-white/25">
              {formatDate(post.published_at || post.created_at)}
            </p>
          </div>
        </div>

        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/40">
          {post.type === "diary" ? "日记" : "文章"}
        </span>
      </div>

      <h3 className="safe-text line-clamp-2 break-all text-lg font-light leading-snug text-white/85 transition group-hover:text-white md:text-xl">
        {getPostTitle(post)}
      </h3>

      <p className="safe-pre mt-3 line-clamp-3 text-sm leading-7 text-white/42 md:line-clamp-4">
        {getExcerpt(post.content)}
        {post.content.length > 100 ? "..." : ""}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
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
    <section className="space-y-4 md:space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-light md:text-3xl">{title}</h2>

          <p className="mt-2 text-sm leading-7 text-white/35 md:mt-3">
            {subtitle}
          </p>
        </div>

        <Link
          href={href}
          className="shrink-0 text-sm text-white/35 transition hover:text-white/70"
        >
          更多 →
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.025] p-6 text-sm text-white/30 md:rounded-[2rem] md:p-8">
          这里暂时还没有内容。
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 md:gap-5">
          {posts.map((post) => (
            <PostCard key={`${post.type}-${post.id}`} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function SpaceClient({
  activeFeed,
  latestDiaries,
  latestArticles,
  hotDiaries,
  hotArticles,
}: Props) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-5 pb-24 pt-16 text-white md:px-6 md:py-24">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />
      <div className="fixed left-1/2 top-1/3 -z-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl md:h-[620px] md:w-[620px]" />

      <div className="mx-auto max-w-6xl space-y-8 md:space-y-16">
        <header>
          <p className="text-xs tracking-[0.4em] text-white/25 md:tracking-[0.45em]">
            PUBLIC SPACE
          </p>

          <h1 className="mt-2 text-5xl font-light tracking-tight md:mt-6 md:text-6xl">
            深夜广场
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-7 text-white/35 md:mt-6 md:leading-8">
            有些人留下今天，有些人留下故事。你可以慢慢经过，也可以在某个角落停下来。
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 md:mt-10 md:gap-4">
            <Link
              href="/space/diaries"
              className="group rounded-[1.4rem] border border-white/10 bg-white/[0.035] p-4 backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.055] md:rounded-[2rem] md:p-7"
            >
              <p className="text-2xl md:text-3xl">🌙</p>

              <h2 className="mt-3 text-lg font-light md:mt-5 md:text-2xl">
                日记广场
              </h2>

              <p className="mt-2 line-clamp-2 text-xs leading-6 text-white/35 md:mt-4 md:text-sm md:leading-7">
                看看其他居民公开留下的今天。
              </p>

              <p className="mt-4 text-xs text-white/25 transition group-hover:text-white/55 md:mt-6 md:text-sm">
                进入 →
              </p>
            </Link>

            <Link
              href="/space/articles"
              className="group rounded-[1.4rem] border border-white/10 bg-white/[0.035] p-4 backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.055] md:rounded-[2rem] md:p-7"
            >
              <p className="text-2xl md:text-3xl">📖</p>

              <h2 className="mt-3 text-lg font-light md:mt-5 md:text-2xl">
                文章广场
              </h2>

              <p className="mt-2 line-clamp-2 text-xs leading-6 text-white/35 md:mt-4 md:text-sm md:leading-7">
                阅读更完整的故事、长文、作品和想法。
              </p>

              <p className="mt-4 text-xs text-white/25 transition group-hover:text-white/55 md:mt-6 md:text-sm">
                进入 →
              </p>
            </Link>
          </div>
        </header>

        <div className="md:hidden">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "latest-diaries", label: "最新日记" },
              { key: "hot-diaries", label: "热门日记" },
              { key: "latest-articles", label: "最新文章" },
              { key: "hot-articles", label: "热门文章" },
            ].map((item) => (
              <Link
                key={item.key}
                href={`/space?feed=${item.key}`}
                className={`rounded-full border px-3.5 py-2 text-xs transition ${
                  activeFeed === item.key
                    ? "border-white bg-white text-black"
                    : "border-white/10 bg-white/[0.04] text-white/45 hover:border-white/20"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="md:hidden">
          {activeFeed === "latest-diaries" && (
            <SectionBlock
              title="最新日记"
              subtitle="刚刚有人把今天留在这里。"
              href="/space/diaries"
              posts={latestDiaries}
            />
          )}

          {activeFeed === "hot-diaries" && (
            <SectionBlock
              title="热门日记"
              subtitle="被更多居民回应和喜欢的生活碎片。"
              href="/space/diaries"
              posts={hotDiaries}
            />
          )}

          {activeFeed === "latest-articles" && (
            <SectionBlock
              title="最新文章"
              subtitle="新写下的故事、长文和作品。"
              href="/space/articles"
              posts={latestArticles}
            />
          )}

          {activeFeed === "hot-articles" && (
            <SectionBlock
              title="热门文章"
              subtitle="最近更容易被看见的故事。"
              href="/space/articles"
              posts={hotArticles}
            />
          )}
        </div>

        <div className="hidden space-y-16 md:block">
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
      </div>
    </main>
  );
}