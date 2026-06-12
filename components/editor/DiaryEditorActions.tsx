type Props = {
  contentLength: number;
  minLength: number;
  publishing: boolean;
  publishDiary: () => void;
  goBack: () => void;
};

export default function DiaryEditorActions({
  contentLength,
  minLength,
  publishing,
  publishDiary,
  goBack,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-sm text-white/35">
          {contentLength} 字 · 建议不少于 {minLength} 字
        </p>

        <p className="mt-2 text-xs text-white/25">
          慢慢写，生活不是内容工厂。
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={goBack}
          className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm text-white/60 transition hover:text-white"
        >
          暂时先这样
        </button>

        <button
          onClick={publishDiary}
          disabled={publishing}
          className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {publishing ? "留下中..." : "留下今天"}
        </button>
      </div>
    </div>
  );
}