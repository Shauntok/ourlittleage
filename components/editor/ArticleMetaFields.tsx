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
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 outline-none transition focus:border-white/40"
      />

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