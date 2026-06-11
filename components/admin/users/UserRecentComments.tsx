type Props = {
  comments: any[];
};

export default function UserRecentComments({ comments }: Props) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
      <h2 className="text-2xl font-bold">最近评论</h2>

      <div className="mt-5 space-y-3">
        {comments.length === 0 && (
          <p className="text-sm text-zinc-600">
            这个居民还没有留下评论。
          </p>
        )}

        {comments.map((comment) => (
          <div
            key={comment.id}
            className="min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-black/30 p-4"
          >
            <p className="safe-pre text-sm leading-7 text-zinc-300">
              {comment.content}
            </p>

            <p className="mt-2 text-xs text-zinc-600">
              {new Date(comment.created_at).toLocaleString("zh-CN")} ·{" "}
              {comment.is_deleted
                ? "已删除"
                : comment.is_hidden
                ? "已隐藏"
                : "正常"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}