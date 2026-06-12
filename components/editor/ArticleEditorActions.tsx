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
    <div className="flex flex-col gap-6 pt-2 md:flex-row md:items-center md:justify-between">
      <div className="space-y-2 text-xs">
        <p
          className={`${
            contentCount < 500
              ? "text-yellow-100/55"
              : "text-emerald-100/55"
          }`}
        >
          已写 {contentCount} 字
          {contentCount < 500
            ? ` · 距离发布建议还差 ${500 - contentCount} 字`
            : " · 已达到发布长度"}
        </p>

        <p className="text-white/25">慢慢写，故事不用急着完成。</p>
      </div>

      <div className="flex flex-wrap gap-4 md:justify-end">
        <button
          onClick={publishArticle}
          disabled={loading}
          className="rounded-full bg-white px-8 py-4 text-sm font-bold text-black transition hover:bg-white/90 disabled:opacity-40"
        >
          {loading ? "处理中..." : "发布文章"}
        </button>

        <button
          onClick={saveDraft}
          disabled={loading}
          className="rounded-full border border-white/10 bg-white/[0.04] px-8 py-4 text-sm text-white/70 transition hover:border-white/25 hover:text-white disabled:opacity-40"
        >
          保存草稿
        </button>

        <button
          onClick={discardArticle}
          className="rounded-full border border-red-500/20 bg-red-500/[0.06] px-8 py-4 text-sm text-red-200/80 transition hover:bg-red-500/[0.12]"
        >
          放弃
        </button>
      </div>
    </div>
  );
}