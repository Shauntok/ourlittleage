import Link from "next/link";
import { supabase } from "@/lib/supabase";
import TranslatedText from "@/components/TranslatedText";

// ===== 把 tags 统一变成 array =====
function normalizeTags(tags: any) {
  if (Array.isArray(tags)) {
    return tags;
  }

  if (typeof tags === "string") {
    try {
      const parsed = JSON.parse(tags);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {}

    return tags
      .split(/[,，]/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

// ===== 清掉 Markdown 图片，只留下文字摘要 =====
function getExcerpt(content: string) {
  return content
    .replace(/!\[[^\]]*\]\(.*?\)/g, "")
    .trim()
    .slice(0, 120);
}

type Props = {
  params: Promise<{
    tag: string;
  }>;
};

export default async function TagPage({ params }: Props) {
  const { tag } = await params;

  const decodedTag = decodeURIComponent(tag);

  // ===== 先拿全部已发布文章，再用 JS 过滤 tag =====
  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "published")
    .eq("visibility", "public")
    .order("created_at", { ascending: false });

  const filteredPosts =
    posts?.filter((post) =>
      normalizeTags(post.tags).includes(decodedTag)
    ) || [];

  return (
    <main className="min-h-screen bg-black text-white px-6 py-20">
      <div className="max-w-2xl mx-auto">
        {/* ===== 页面标题 ===== */}
        <h1 className="text-4xl font-bold mb-4">
          标签：
          <TranslatedText text={decodedTag} />
        </h1>

        <Link
          href="/home"
          className="inline-block text-zinc-400 hover:text-white mb-12"
        >
          ← 回首页
        </Link>

        {/* ===== 没有文章 ===== */}
        {filteredPosts.length === 0 && (
          <p className="text-zinc-400">
            这个标签还没有文章。
          </p>
        )}

        {/* ===== 文章列表 ===== */}
        <div className="space-y-10">
          {filteredPosts.map((post) => {
            const excerpt = getExcerpt(post.content || "");

            return (
              <article key={post.id}>
                <Link
                  href={`/articles/${post.id}`}
                  className="block group"
                >
                  <h2 className="text-2xl font-semibold group-hover:text-zinc-400 transition">
                    <TranslatedText text={post.title} />
                  </h2>

                  <p className="text-sm text-zinc-500 mt-2">
                    发布于 {new Date(post.created_at).toLocaleString()}
                  </p>

                  {excerpt && (
                    <p className="text-zinc-400 mt-3 leading-7">
                      <TranslatedText text={`${excerpt}...`} />
                    </p>
                  )}
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}