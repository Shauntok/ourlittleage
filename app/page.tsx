// ===== Next Link =====
import Link from "next/link";

// ===== Supabase =====
import { supabase } from "@/lib/supabase";

import TranslatedText from "@/components/TranslatedText";

// ===== 提取文章内最多 3 张图片 =====
function getImages(content: string) {
  return Array.from(
    content.matchAll(/!\[[^\]]*\]\((.*?)\)/g)
  )
    .map((match) => match[1])
    .slice(0, 3);
}

// ===== 提取文章摘要 =====
function getExcerpt(content: string) {
  return content
    .replace(
      /!\[[^\]]*\]\(.*?\)/g,
      ""
    )
    .trim()
    .slice(0, 120);
}

// ===== 首页 =====
export default async function HomePage() {

  // ===== 获取已发布文章 =====
  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "published")
    .eq("visibility", "public")
    .order("created_at", {
      ascending: false,
    });

  return (
    <main className="min-h-screen bg-black text-white px-6 py-20">

      {/* ===== 页面宽度 ===== */}
      <div className="max-w-2xl mx-auto">

        {/* ===== 网站标题 ===== */}
        <h1 className="text-4xl font-bold mb-4">
          <span>卓卓啰嗦吹水站</span>
        </h1>

        {/* ===== 网站简介 ===== */}
        <p className="text-zinc-400 mb-16">
          <TranslatedText text="一个半夜想到什么就写什么的地方。" />
        </p>

        {/* ===== 文章列表 ===== */}
        <div className="space-y-12">

          {posts?.map((post) => {

            // ===== 获取第一张图片 =====
            const imageUrls = getImages(post.content);

            // ===== 获取文章摘要 =====
            const excerpt =
              getExcerpt(post.content);

            return (

              <article key={post.id}>

                {/* ===== 点击整块进入文章 ===== */}
                <Link
                  href={`/posts/${post.slug}`}
                  className="block group"
                >

                  {/* ===== 最多显示 3 张图片预览 ===== */}
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

                  {/* ===== 文章标题 ===== */}
                  <h2 className="text-2xl font-semibold group-hover:text-zinc-400 transition">
                    <TranslatedText text={post.title} />
                  </h2>

                  {/* ===== 日期 ===== */}
                  <p className="text-sm text-zinc-500 mt-2 mb-3">
                  发布于 {new Date(post.created_at).toLocaleString()}

                  {post.edited_at && (
                    <>
                      {" · "}
                      已编辑 {new Date(post.edited_at).toLocaleString()}
                    </>
                  )}
                </p>

                  {/* ===== 文章摘要 ===== */}
                  {excerpt && (
                    <p className="text-zinc-400 mt-3 leading-7">
                      <TranslatedText text={`${excerpt}...`} />
                    </p>
                  )}

                  {/* ===== Tags ===== */}
                  {post.tags && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {String(post.tags)
                        .split(/[,，]/)
                        .map((tag) => tag.trim())
                        .filter(Boolean)
                        .map((tag) => (
                          <Link
                            key={tag}
                            href={`/tags/${encodeURIComponent(tag)}`}
                            className="text-xs px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-white transition"
                          >
                            {tag}
                          </Link>
                        ))}
                    </div>
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
