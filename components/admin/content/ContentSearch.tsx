type Props = {
  search: string;
  setSearch: (value: string) => void;
};

export default function ContentSearch({
  search,
  setSearch,
}: Props) {
  return (
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="搜索标题、内容、slug、作者、ID..."
      className="
        w-full
        rounded-2xl
        border border-zinc-800
        bg-zinc-950
        p-4
        outline-none
        transition
        focus:border-white
      "
    />
  );
}