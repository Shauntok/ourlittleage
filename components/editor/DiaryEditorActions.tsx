type Props = {
  contentLength: number;
  minLength: number;
  publishing: boolean;
  draftSaving?: boolean;
  publishDiary: () => void;
  saveDraft?: () => void;
  goBack: () => void;
};

export default function DiaryEditorActions({
  contentLength,
  minLength,
  publishing,
  draftSaving = false,
  publishDiary,
  saveDraft,
  goBack,
}: Props) {
  return (
    <div className="flex flex-col gap-4 pt-2 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <p className="text-sm text-white/35">
          {contentLength} 字 · 建议不少于 {minLength} 字
        </p>

        <p className="text-xs text-white/25">
          Ctrl + S 可以暂时保存为草稿。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:flex md:flex-wrap md:justify-end">
        <button
          type="button"
          onClick={publishDiary}
          disabled={publishing || draftSaving}
          className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {publishing ? "留下中..." : "留下今天"}
        </button>

        <button
          type="button"
          onClick={saveDraft || goBack}
          disabled={publishing || draftSaving}
          className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm text-white/60 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {draftSaving ? "正在收好..." : "暂时先这样"}
        </button>
      </div>
    </div>
  );
}