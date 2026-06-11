type Props = {
  createdAt: string | null;
};

export default function UserJoinedCard({ createdAt }: Props) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
      <p className="text-sm text-zinc-500">注册时间</p>

      <p className="mt-3 text-zinc-300">
        {createdAt ? new Date(createdAt).toLocaleString("zh-CN") : "未知"}
      </p>
    </div>
  );
}