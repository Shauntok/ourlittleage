import Link from "next/link";

type Props = {
  posts: any[];
  getPostHref: (post: any) => string;
  getPostTitle: (post: any) => string;
};

export default function UserRecentPosts({
  posts,
  getPostHref,
  getPostTitle,
}: Props) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
      <h2 className="text-2xl font-bold">最近内容</h2>

      <div className="mt-5 space-y-3">
        {posts.length === 0 && (
          <p className="text-sm text-zinc-600">
            这个居民还没有发布内容。
          </p>
        )}

        {posts.map((post) => (
          <Link
            key={post.id}
            href={getPostHref(post)}
            target="_blank"
            className="block min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-black/30 p-4 transition hover:border-zinc-500"
          >
            <p className="safe-text font-semibold text-zinc-100">
              {getPostTitle(post)}
            </p>

            <p className="mt-1 text-xs text-zinc-600">
              {post.type} · {post.status} · {post.visibility}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}