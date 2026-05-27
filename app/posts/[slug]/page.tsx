import { supabase } from "@/lib/supabase";
import TranslatedMarkdown from "@/components/TranslatedMarkdown";
import TranslatedText from "@/components/TranslatedText";
import { notFound } from "next/navigation";
import PostAdminActions from "@/components/PostAdminActions";
import Link from "next/link";
import PostReportButton from "@/components/PostReportButton";
import PostComments from "@/components/PostComments";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

function getVisibilityLabel(visibility: string) {
  switch (visibility) {
    case "public":
      return "🌍 公开";
    case "hidden":
      return "🙈 隐藏";
    case "unlisted":
      return "🔗 链接可见";
    case "private":
      return "🔒 私密";
    default:
      return visibility || "public";
  }
}

function getReadTime(content: string) {
  const text = content || "";
  const minutes = Math.max(
    1,
    Math.ceil(text.length / 500)
  );

  return `${minutes} 分钟阅读`;
}

export default async function PostPage({
  params,
}: Props) {
  const { slug } = await params;

  const { data: post } = await supabase
    .from("posts")
    .select(`
      *,
      profiles (
        username,
        avatar_url
      )
    `)
    .eq("slug", slug)
    .single();

  if (!post) {
    notFound();
  }

  if (post.visibility === "private") {
    notFound();
  }

  const authorName =
    post.profiles?.username || "匿名居民";

  const authorAvatar =
    post.profiles?.avatar_url || "";

  const dateText = new Date(
    post.published_at || post.created_at
  ).toLocaleString("zh-CN");

  const tags = post.tags
    ? Array.isArray(post.tags)
      ? post.tags
      : String(post.tags).split(/[,，]/)
    : [];

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-6 py-20 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />

      <div className="pointer-events-none fixed left-1/2 top-1/3 -z-10 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-violet-500/[0.05] blur-3xl" />

      <div className="mx-auto max-w-6xl">
        <Link
          href="/articles"
          className="text-sm text-white/35 transition hover:text-white/70"
        >
          ← 回到文章
        </Link>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_260px]">
          <article className="min-w-0">
            <header className="rounded-[2.5rem] border border-white/10 bg-white/[0.035] p-8 backdrop-blur-2xl md:p-10">
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs text-white/45">
                  {post.status === "published"
                    ? "✅ 已发布"
                    : "📝 草稿"}
                </span>

                <span className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs text-white/45">
                  {getVisibilityLabel(post.visibility)}
                </span>

                <span className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs text-white/45">
                  {getReadTime(post.content)}
                </span>
              </div>

              <h1 className="mt-8 text-5xl font-light leading-tight tracking-tight md:text-7xl">
                <TranslatedText text={post.title || "无标题"} />
              </h1>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href={`/u/${encodeURIComponent(authorName)}`}
                  className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.035] px-4 py-3 transition hover:border-white/20 hover:bg-white/[0.055]"
                >
                  <div className="h-11 w-11 overflow-hidden rounded-full border border-white/10 bg-white/[0.05]">
                    {authorAvatar ? (
                      <img
                        src={authorAvatar}
                        alt={authorName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-white/35">
                        👤
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-white/85">
                      {authorName}
                    </p>

                    <p className="text-xs text-white/30">
                      作者 · {dateText}
                    </p>
                  </div>
                </Link>

                <PostReportButton postId={post.id} />
              </div>

              {post.edited_at && (
                <p className="mt-5 text-xs text-white/25">
                  已编辑{" "}
                  {new Date(post.edited_at).toLocaleString(
                    "zh-CN"
                  )}
                </p>
              )}

              {tags.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-2">
                  {tags
                    .map((tag: string) => tag.trim())
                    .filter(Boolean)
                    .map((tag: string) => (
                      <Link
                        key={tag}
                        href={`/tags/${encodeURIComponent(tag)}`}
                        className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/40 transition hover:border-white/20 hover:text-white"
                      >
                        #<TranslatedText text={tag} />
                      </Link>
                    ))}
                </div>
              )}
            </header>

            <section className="mt-8 rounded-[2.5rem] border border-white/10 bg-white/[0.025] p-8 backdrop-blur-2xl md:p-10">
              <article className="prose prose-invert max-w-none prose-p:leading-[2.2] prose-headings:font-light prose-img:rounded-3xl prose-img:border prose-img:border-white/10">
                <TranslatedMarkdown content={post.content} />
              </article>
            </section>

            <PostComments postId={post.id} />

            <section className="mt-8">
              <PostComments postId={post.id} />
            </section>
          </article>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-2xl">
              <p className="text-xs tracking-[0.3em] text-white/30">
                AUTHOR
              </p>

              <div className="mt-5 flex items-center gap-4">
                <div className="h-14 w-14 overflow-hidden rounded-full border border-white/10 bg-white/[0.05]">
                  {authorAvatar ? (
                    <img
                      src={authorAvatar}
                      alt={authorName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl">
                      👤
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-white/85">
                    {authorName}
                  </p>

                  <p className="text-xs text-white/30">
                    小时代居民
                  </p>
                </div>
              </div>

              <Link
                href={`/u/${encodeURIComponent(authorName)}`}
                className="mt-5 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-white/60 transition hover:border-white/20 hover:text-white"
              >
                去他的房间
              </Link>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 text-sm leading-7 text-white/40 backdrop-blur-2xl">
              <p className="text-xs tracking-[0.3em] text-white/30">
                ARTICLE INFO
              </p>

              <div className="mt-5 space-y-3">
                <p>{getReadTime(post.content)}</p>
                <p>{getVisibilityLabel(post.visibility)}</p>
                <p>发布于 {dateText}</p>
              </div>
            </div>

            <PostAdminActions id={post.id} />
          </aside>
        </div>
      </div>
    </main>
  );
}