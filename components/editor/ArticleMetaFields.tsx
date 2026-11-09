type Props = {
  tags: string;
  setTags: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
};

export default function ArticleMetaFields({
  tags,
  setTags,
  notes,
  setNotes,
}: Props) {
  return (
    <>
      <input
        type="text"
        placeholder="标签，用逗号隔开"
        aria-label="文章标签，用逗号隔开"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 outline-none transition focus:border-white/40"
      />
      <p className="mt-2 text-xs text-white/50">最多 5 个标签，每个不超过 20 字；公开文章可通过标签查找。</p>

      <textarea
        placeholder="想法 / 大纲（只有自己看得到）"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={7}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 leading-7 text-yellow-100 outline-none transition focus:border-white/40"
      />
    </>
  );
}
