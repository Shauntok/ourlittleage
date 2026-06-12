const DAILY_DIARY_LIMIT = 3;

type Props = {
  remainingCount: number | null;
};

export default function DiarySideCards({ remainingCount }: Props) {
  return (
    <>
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 text-sm leading-7 text-white/40 backdrop-blur-2xl">
        <p className="text-xs tracking-[0.3em] text-white/30">今日份额</p>

        <div className="mt-5 space-y-4">
          <p>
            今天还能留下{" "}
            <span className="text-white/70">{remainingCount ?? "..."}</span>{" "}
            篇日记。
          </p>

          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                remainingCount === 0
                ? "bg-cyan-300"
                : "bg-white/70"
              }`}
              style={{
                width: `${
                  remainingCount === null
                    ? 0
                    : ((DAILY_DIARY_LIMIT - remainingCount) /
                        DAILY_DIARY_LIMIT) *
                      100
                }%`,
              }}
            />
          </div>

          <p className="text-white/25">
            {remainingCount === 0
              ? "今天的篇幅已经写满了。明天再继续吧。"
              : "每天慢慢留下，不需要一次说完。"}
          </p>
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 text-sm leading-8 text-white/40 backdrop-blur-2xl">
        <p className="text-xs tracking-[0.3em] text-white/30">写作提示</p>

        <div className="mt-5 space-y-2">
          <p>· 不必完美</p>
          <p>· 真实就好</p>
          <p>· 你只需要面对自己</p>
          <p>· 今天的自己，也值得被记住</p>
        </div>
      </div>
    </>
  );
}