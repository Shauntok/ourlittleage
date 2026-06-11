type Props = {
  search: string;
  setSearch: (value: string) => void;
};

export default function CommentSearch({ search, setSearch }: Props) {
  return (
    <input
      value={search}
      onChange={(event) => setSearch(event.target.value)}
      placeholder="搜索评论内容、作者、原文标题或评论 ID..."
      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4 outline-none transition focus:border-white"
    />
  );
}