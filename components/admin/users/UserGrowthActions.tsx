type Props = {
  currentRole: string | null;
  addLight: (amount: number) => void;
  adjustTrust: (amount: number) => void;
  changeLevel: (amount: number) => void;
};

export default function UserGrowthActions({
  currentRole,
  addLight,
  adjustTrust,
  changeLevel,
}: Props) {
  if (
    currentRole !== "owner" &&
    currentRole !== "admin"
  ) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
      <h2 className="text-2xl font-bold">
        成长数值调整
      </h2>

      <p className="mt-2 text-sm text-zinc-500">
        Alpha 当前最高 Lv5。后续 Beta 可以扩展到更高等级。
      </p>

      <div className="mt-5 flex flex-wrap gap-3">

        <button
          onClick={() => addLight(0.03)}
          className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-300 transition hover:bg-green-500/20"
        >
          +0.03 光
        </button>

        <button
          onClick={() => addLight(0.05)}
          className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-300 transition hover:bg-green-500/20"
        >
          +0.05 光
        </button>

        <button
          onClick={() => addLight(0.10)}
          className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-300 transition hover:bg-green-500/20"
        >
          +0.10 光
        </button>

        <button
          onClick={() => changeLevel(1)}
          className="rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300 transition hover:bg-blue-500/20"
        >
          等级 +1
        </button>

        <button
          onClick={() => changeLevel(-1)}
          className="rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300 transition hover:bg-blue-500/20"
        >
          等级 -1
        </button>

        <button
          onClick={() => adjustTrust(0.02)}
          className="rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-300 transition hover:bg-purple-500/20"
        >
          +0.02 信任
        </button>

        <button
          onClick={() => adjustTrust(-0.02)}
          className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/20"
        >
          -0.02 信任
        </button>

      </div>
    </section>
  );
}