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


export default async function PostPage({ params }: Props) {
  const { slug } = await params;

  const { data: post } = await supabase
    .from("posts")
    .select(`
      *,
      profiles (
        username,
        avatar
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
    
  return (
  <main className="min-h-screen bg-black text-white px-6 py-20">
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8">
      {/* ===== 左边：文章内容 ===== */}

      <article className="max-w-3xl pt-20">
        {/* ===== 发布时间 / 编辑时间 ===== */}
        <p className="text-zinc-500 mb-4">
          发布于 {new Date(post.created_at).toLocaleString()}

          {post.profiles?.username && (
            <div className="flex items-center gap-3 mb-8">
              {/* ===== 用户头像 ===== */}
              <div className="h-11 w-11 rounded-full overflow-hidden border border-zinc-700 bg-zinc-900">
                {post.profiles.avatar ? (
                  <img
                    src={post.profiles.avatar}
                    alt={post.profiles.username}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-sm text-zinc-500">
                    👤
                  </div>
                )}
              </div>

              {/* ===== 用户名字 ===== */}
              <div>
                <Link
                  href={`/u/${encodeURIComponent(
                    post.profiles.username
                  )}`}
                  className="text-white font-medium hover:text-zinc-400 transition"
                >
                  {post.profiles.username}
                </Link>

                <p className="text-sm text-zinc-500">
                  作者
                </p>
              </div>
            </div>
          )}

          {post.edited_at && (
            <>
              {" · "}
              已编辑 {new Date(post.edited_at).toLocaleString()}
            </>
          )}
        </p>

          <div className="flex gap-3 flex-wrap mb-6">
            <span
              className={`px-4 py-2 rounded-full text-sm border ${
                post.status === "published"
                  ? "border-green-500 text-green-400"
                  : "border-yellow-500 text-yellow-400"
              }`}
            >
              {post.status === "published"
                ? "✅ 已发布"
                : "📝 草稿"}
            </span>

            <span className="px-4 py-2 rounded-full text-sm border border-blue-500 text-blue-400">
              🌍 {post.visibility || "public"}
            </span>
          </div>

        {/* ===== 文章标题 ===== */}
        <h1 className="text-6xl font-bold mb-10 leading-tight">
          <TranslatedText text={post.title} />
        </h1>

        {/* ===== 文章辅助操作 ===== */}
        <div className="flex items-center gap-3 mb-8">
          <PostReportButton
            postId={post.id}
          />
        </div>

        {/* ===== Tags ===== */}
          {post.tags && (
            <div className="flex flex-wrap gap-2 mb-10">
              {(Array.isArray(post.tags)
                ? post.tags
                : String(post.tags).split(/[,，]/)
              )
                .map((tag: string) => tag.trim())
                .filter(Boolean)
                .map((tag: string) => (
                  <Link
                    key={tag}
                    href={`/tags/${encodeURIComponent(tag)}`}
                    className="text-sm px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition"
                  >
                    <TranslatedText text={tag} />
                  </Link>
                ))}
            </div>
          )}

        {/* ===== 文章正文 ===== */}
        <article className="prose prose-invert max-w-none">
          <TranslatedMarkdown content={post.content} />
        </article>
      </article>
      
      <PostComments postId={post.id} />

      {/* ===== 右边：后台操作按钮 ===== */}
      <PostAdminActions id={post.id} />
    </div>
  </main>
);
}