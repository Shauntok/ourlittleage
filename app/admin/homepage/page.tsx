import Link from "next/link";
import { supabase } from "@/lib/supabase";

// ===== 后台首页 =====
export default async function AdminHomePage() {
  // ===== 读取全部文章，用来做后台统计 =====
  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .order("edited_at", { ascending: false });

  const allPosts = posts || [];

  // ===== 统计数据 =====
  const draftCount = allPosts.filter(
    (post) => post.status === "draft"
  ).length;

  const publishedCount = allPosts.filter(
    (post) => post.status === "published"
  ).length;

  const privateCount = allPosts.filter(
    (post) => post.visibility === "private"
  ).length;

  const hiddenCount = allPosts.filter(
    (post) => post.visibility === "hidden"
  ).length;

  // ===== 最近编辑文章 =====
  const recentPosts = allPosts.slice(0, 5);

  return (
    <div className="space-y-10">
      {/* ===== 页面标题 ===== */}
      <div>
        <h1 className="text-4xl font-bold mb-3">
          后台首页
        </h1>

        <p className="text-zinc-400">
          管理文章、草稿、可见性和最近编辑内容。
        </p>
      </div>

      {/* ===== 统计卡片 ===== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="草稿" value={draftCount} />
        <StatCard title="已发布" value={publishedCount} />
        <StatCard title="Private" value={privateCount} />
        <StatCard title="Hidden" value={hiddenCount} />
      </div>

      {/* ===== 快速入口 ===== */}
      <div className="flex flex-wrap gap-4">
        <Link
          href="/admin/write"
          className="admin-btn admin-btn-primary"
        >
          新建文章
        </Link>

        <Link
          href="/admin/search"
          className="admin-btn admin-btn-secondary"
        >
          搜索文章
        </Link>

        <Link
          href="/admin/drafts"
          className="admin-btn admin-btn-secondary"
        >
          查看草稿
        </Link>
      </div>

      {/* ===== 最近编辑 ===== */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">
          最近编辑
        </h2>

        {recentPosts.length === 0 && (
          <div className="admin-empty">
            <div className="admin-empty-icon">📭</div>

            <h2 className="admin-empty-title">
              还没有文章
            </h2>

            <p className="admin-empty-text">
              新建文章后，会在这里看到最近编辑内容。
            </p>
          </div>
        )}

        <div className="space-y-4">
          {recentPosts.map((post) => (
            <Link
              key={post.id}
              href={`/admin/edit/${post.id}`}
              className="block group border border-zinc-800 rounded-2xl p-5 transition duration-300 hover:-translate-y-1 hover:border-zinc-500 hover:bg-zinc-950 hover:shadow-2xl hover:shadow-black/50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold group-hover:text-zinc-300 transition">
                    {post.title}
                  </h3>

                  <p className="text-sm text-zinc-500 mt-1">
                    {post.slug}
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap justify-end">
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
              </div>

              <p className="text-sm text-zinc-500 mt-4">
                最后编辑：
                {post.edited_at
                  ? new Date(post.edited_at).toLocaleString()
                  : new Date(post.created_at).toLocaleString()}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

// ===== 统计卡片组件 =====
function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="border border-zinc-800 rounded-3xl bg-zinc-950/70 p-6">
      <p className="text-zinc-500 text-sm mb-3">
        {title}
      </p>

      <p className="text-4xl font-bold">
        {value}
      </p>
    </div>
  );
}