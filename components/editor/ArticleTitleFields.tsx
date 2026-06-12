type Props = {
  title: string;
  setTitle: (value: string) => void;
  slug: string;
  setSlug: (value: string) => void;
  titleCount: number;
  generateSlug: (value: string) => string;
};

export default function ArticleTitleFields({
  title,
  setTitle,
  slug,
  setSlug,
  titleCount,
  generateSlug,
}: Props) {
  return (
    <>
      <div>
        <input
          type="text"
          placeholder="文章标题"
          value={title}
          onChange={(e) => {
            const value = e.target.value;
            setTitle(value);
            setSlug(generateSlug(value));
          }}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 outline-none transition focus:border-white/40"
        />

        <div className="mt-2 flex items-center justify-between gap-3 text-xs">
          <p className="text-white/25">标题建议短一点，比较像一扇门。</p>

          <p
            className={`shrink-0 ${
              titleCount > 25 ? "text-red-200/70" : "text-white/30"
            }`}
          >
            已写 {titleCount} 字 · 最多 25 字
          </p>
        </div>
      </div>

      <input
        type="text"
        placeholder="slug，例如 my-night-story"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 outline-none transition focus:border-white/40"
      />
    </>
  );
}