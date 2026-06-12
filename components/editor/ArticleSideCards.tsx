const DAILY_ARTICLE_LIMIT = 2;

type Props = {
  remainingCount: number | null;
};

export default function ArticleSideCards({ remainingCount }: Props) {
  const usedCount =
    remainingCount === null
      ? 0
      : DAILY_ARTICLE_LIMIT - remainingCount;

  const progress =
    remainingCount === null
      ? 0
      : (usedCount / DAILY_ARTICLE_LIMIT) * 100;

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 text-sm leading-7 text-white/40 backdrop-blur-2xl">
      <p className="text-xs tracking-[0.3em] text-white/30">
        今日创作
      </p>

      <div className="mt-5 space-y-4">
        <p>
          今天还能发布{" "}
          <span className="text-white/70">
            {remainingCount ?? "..."}
          </span>{" "}
          篇文章。
        </p>

        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              remainingCount === 0 ? "bg-cyan-300" : "bg-white/70"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-white/25">
          {remainingCount === 0
            ? "今天的创作额度已经完成。让故事沉淀一下吧。"
            : "认真写完一篇，已经很了不起了。"}
        </p>
      </div>
    </div>
  );
}