type Props = {
  bio: string | null;
};

export default function UserBioCard({ bio }: Props) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
      <p className="text-sm text-zinc-500">居民简介</p>

      <p className="safe-pre mt-3 text-zinc-300">
        {bio || "这个居民还没有留下简介。"}
      </p>
    </div>
  );
}