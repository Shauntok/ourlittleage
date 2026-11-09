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

      <div className="grid grid-cols-3 gap-2 md:flex md:flex-wrap md:justify-end">
        <button type="button" onClick={goBack} disabled={publishing || draftSaving} className="min-h-11 rounded-full border border-white/10 bg-white/[0.04] px-2 text-xs text-white/70 md:hidden">放弃</button>
        <button
          type="button"
          onClick={publishDiary}
          disabled={publishing || draftSaving}
          className="order-3 min-h-11 rounded-full bg-white px-2 py-3 text-xs font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40 md:order-none md:px-7 md:text-sm"
        >
          {publishing ? "发布中..." : <><span className="md:hidden">发布今天</span><span className="hidden md:inline">留下今天</span></>}
        </button>

        <button
          type="button"
          onClick={saveDraft || goBack}
          disabled={publishing || draftSaving}
          className="order-2 min-h-11 rounded-full border border-white/10 bg-white/[0.04] px-2 py-3 text-xs text-white/60 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 md:order-none md:px-6 md:text-sm"
        >
          {draftSaving ? "正在收好..." : <><span className="md:hidden">保存草稿</span><span className="hidden md:inline">先收进草稿箱</span></>}
        </button>

        <p className="col-span-3 mt-3 text-center text-xs text-zinc-500 md:hidden">
          草稿只有自己能看见。
        </p>
      </div>
    </div>
  );
}
