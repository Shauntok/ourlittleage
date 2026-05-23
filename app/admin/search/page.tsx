"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import TranslatedText from "@/components/TranslatedText";

// ===== 清掉 Markdown 图片，只留下文字摘要 =====
function getExcerpt(content: string) {
  return content
    .replace(/!\[[^\]]*\]\(.*?\)/g, "")
    .trim()
    .slice(0, 120);
}

// ===== tags 统一成可搜索文字 =====
function normalizeTags(tags: any) {
  if (Array.isArray(tags)) {
    return tags.join(" ");
  }

  if (typeof tags === "string") {
    return tags;
  }

  return "";
}

// ===== 判断文章是否符合日期过滤 =====
function matchDateFilter(dateValue: string, filter: string) {
  if (filter === "all") return true;
  if (!dateValue) return false;

  const postDate = new Date(dateValue);
  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());

  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  if (filter === "today") {
    return postDate >= startOfToday;
  }

  if (filter === "week") {
    return postDate >= startOfWeek;
  }

  if (filter === "month") {
    return postDate >= startOfMonth;
  }

  return true;
}

// ===== 单个 filter 按钮样式 =====
function filterButtonClass(isActive: boolean) {
  return `px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
    isActive
      ? "bg-zinc-200 text-black border-white shadow-lg shadow-white/10"
      : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-white"
  }`;
}

// ===== 搜索页 =====
export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ===== Filters =====
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // ===== 读取文章：Admin 搜索应该拿全部文章，不只 published =====
  useEffect(() => {
    async function fetchPosts() {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (data) {
        setPosts(data);
      }

      setLoading(false);
    }

    fetchPosts();
  }, []);

  // ===== 前端敏感搜索 + 多条件过滤 =====
  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return posts.filter((post) => {
      // ===== 状态过滤：全部 / 已发布 / 草稿 =====
      if (
        statusFilter !== "all" &&
        post.status !== statusFilter
      ) {
        return false;
      }

      // ===== 可见性过滤：public / hidden / unlisted / private =====
      if (
        visibilityFilter !== "all" &&
        (post.visibility || "public") !== visibilityFilter
      ) {
        return false;
      }

      // ===== 日期过滤：优先用 published_at，没有就用 created_at =====
      const dateToCheck =
        post.published_at || post.created_at;

      if (!matchDateFilter(dateToCheck, dateFilter)) {
        return false;
      }

      // ===== 关键词过滤 =====
      if (!keyword) {
        return true;
      }

      const searchableText = [
        post.title,
        post.slug,
        post.content,
        normalizeTags(post.tags),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [
    query,
    posts,
    statusFilter,
    visibilityFilter,
    dateFilter,
  ]);

  return (
    <main className="min-h-screen bg-black text-white px-6 py-20">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        {/* ===== 左边：Admin Filter Panel ===== */}
        <aside className="lg:sticky lg:top-8 self-start space-y-6 border border-zinc-800 rounded-3xl bg-zinc-950/70 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">
              Filters
            </p>

            <p className="text-sm text-zinc-400">
              快速筛选后台文章。
            </p>
          </div>

          {/* ===== 状态过滤 ===== */}
          <section className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              状态
            </p>

            <div className="flex flex-wrap gap-2">
              {[
                { label: "全部", value: "all" },
                { label: "已发布", value: "published" },
                { label: "草稿", value: "draft" },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setStatusFilter(item.value)}
                  className={filterButtonClass(
                    statusFilter === item.value
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          {/* ===== 日期过滤 ===== */}
          <section className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              日期
            </p>

            <div className="flex flex-wrap gap-2">
              {[
                { label: "全部时间", value: "all" },
                { label: "今天", value: "today" },
                { label: "本周", value: "week" },
                { label: "本月", value: "month" },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setDateFilter(item.value)}
                  className={filterButtonClass(
                    dateFilter === item.value
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          {/* ===== 可见性过滤 ===== */}
          <section className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              可见性
            </p>

            <div className="flex flex-wrap gap-2">
              {[
                { label: "全部", value: "all" },
                { label: "Public", value: "public" },
                { label: "Hidden", value: "hidden" },
                { label: "Unlisted", value: "unlisted" },
                { label: "Private", value: "private" },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() =>
                    setVisibilityFilter(item.value)
                  }
                  className={filterButtonClass(
                    visibilityFilter === item.value
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>
        </aside>

        {/* ===== 右边：搜索主内容 ===== */}
        <section className="space-y-8">
          {/* ===== 标题 ===== */}
          <div>
            <h1 className="text-4xl font-bold mb-3">
              搜索文章
            </h1>

            <p className="text-zinc-400">
              搜索标题、内容、slug 或标签。
            </p>
          </div>

          {/* ===== 搜索框 ===== */}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入关键词，例如：爱情、技术、Tailwind..."
            className="w-full p-5 bg-zinc-950 border border-zinc-800 rounded-3xl outline-none focus:border-white transition text-lg"
          />

          {/* ===== 读取状态 ===== */}
          {loading && (
            <p className="text-zinc-400">
              搜索资料加载中...
            </p>
          )}

          {/* ===== 结果数量 ===== */}
          {!loading && (
            <div className="flex items-center justify-between text-sm text-zinc-500 border-t border-zinc-900 pt-4">
              <p>
                当前显示{" "}
                <span className="text-white font-semibold">
                  {results.length}
                </span>{" "}
                篇文章
              </p>

              <p>
                总文章{" "}
                <span className="text-white font-semibold">
                  {posts.length}
                </span>{" "}
                篇
              </p>
            </div>
          )}

          {/* ===== 没有结果 ===== */}
          {!loading && results.length === 0 && (
            <div className="admin-empty">
              <div className="admin-empty-icon">🔍</div>

              <h2 className="admin-empty-title">
                找不到相关内容
              </h2>

              <p className="admin-empty-text">
                试试输入文章标题、标签或内容关键词。
              </p>
            </div>
          )}

          {/* ===== 搜索结果 ===== */}
          <div className="space-y-8">
            {results.map((post) => {
              const excerpt = getExcerpt(post.content || "");

              return (
                <article
                  key={post.id}
                  className="group border border-zinc-800 rounded-2xl p-6 space-y-3 transition duration-300 hover:-translate-y-1 hover:border-zinc-500 hover:bg-zinc-950 hover:shadow-2xl hover:shadow-black/50"
                >
                  <Link
                    href={`/posts/${post.slug}`}
                    className="block group"
                  >
                    <h2 className="text-2xl font-bold group-hover:text-zinc-400 transition">
                      <TranslatedText text={post.title} />
                    </h2>

                    <p className="text-sm text-zinc-500">
                      发布于{" "}
                      {new Date(
                        post.published_at ||
                          post.created_at
                      ).toLocaleString()}
                    </p>

                    <div className="flex gap-2 flex-wrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs border ${
                          post.status === "published"
                            ? "border-green-500 text-green-400"
                            : "border-yellow-500 text-yellow-400"
                        }`}
                      >
                        {post.status === "published"
                          ? "✅ 已发布"
                          : "📝 草稿"}
                      </span>

                      <span className="px-3 py-1 rounded-full text-xs border border-blue-500 text-blue-400">
                        🌍 {post.visibility || "public"}
                      </span>
                    </div>

                    {excerpt && (
                      <p className="text-zinc-400 leading-7">
                        <TranslatedText text={`${excerpt}...`} />
                      </p>
                    )}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}