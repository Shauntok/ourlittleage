type Props = {
  contentCount: number;
  loading: boolean;
  publishArticle: () => void;
  saveDraft: () => void;
  discardArticle: () => void;
};

export default function ArticleEditorActions({
  contentCount,
  loading,
  publishArticle,
  saveDraft,
  discardArticle,
}: Props) {
  return (
    <div className="flex flex-col gap-4 pt-2 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1 text-xs">
        <p
          className={
            contentCount < 500
              ? "text-yellow-100/55"
              : "text-emerald-100/55"
          }
        >
          已写 {contentCount} 字
          {contentCount < 500
            ? ` · 距离发布建议还差 ${500 - contentCount} 字`
            : " · 已达到发布长度"}
        </p>

        <p className="text-white/25">慢慢写，故事不用急着完成。</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:flex md:flex-wrap md:justify-end">
        <button
          type="button"
          onClick={publishArticle}
          disabled={loading}
          className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "处理中..." : "发布文章"}
        </button>

        <button
          type="button"
          onClick={saveDraft}
          disabled={loading}
          className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm text-white/60 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          保存草稿
        </button>

        <button
          type="button"
          onClick={discardArticle}
          className="rounded-full border border-red-500/20 bg-red-500/[0.06] px-6 py-3 text-sm text-red-200/70 transition hover:bg-red-500/[0.12] hover:text-red-100"
        >
          放弃
        </button>
      </div>
    </div>
  );
}