import Link from "next/link";

export default function SpacePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-6 py-24 text-white">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />
      <div className="fixed left-1/2 top-1/3 -z-10 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="mx-auto max-w-5xl">
        <header className="mb-16">
          <p className="text-xs tracking-[0.45em] text-white/25">
            PUBLIC SPACE
          </p>

          <h1 className="mt-6 text-6xl font-light tracking-tight">
            深夜广场
          </h1>

          <p className="mt-6 max-w-xl text-sm leading-8 text-white/35">
            有些人留下今天，有些人留下故事。你可以慢慢经过，
            也可以在某个角落停下来。
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/space/diaries"
            className="
              group rounded-[2.5rem] border border-white/10
              bg-white/[0.035] p-10 backdrop-blur-2xl
              transition-all duration-700
              hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.055]
            "
          >
            <p className="text-4xl">🌙</p>

            <h2 className="mt-8 text-3xl font-light">
              日记广场
            </h2>

            <p className="mt-5 text-sm leading-8 text-white/40">
              看看其他居民公开留下的今天。这里更轻，更像深夜的碎片。
            </p>

            <p className="mt-10 text-sm text-white/25 transition group-hover:text-white/55">
              进入日记广场 →
            </p>
          </Link>

          <Link
            href="/space/articles"
            className="
              group rounded-[2.5rem] border border-white/10
              bg-white/[0.035] p-10 backdrop-blur-2xl
              transition-all duration-700
              hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.055]
            "
          >
            <p className="text-4xl">📖</p>

            <h2 className="mt-8 text-3xl font-light">
              文章广场
            </h2>

            <p className="mt-5 text-sm leading-8 text-white/40">
              阅读更完整的故事、长文、作品和想法。这里适合慢慢读。
            </p>

            <p className="mt-10 text-sm text-white/25 transition group-hover:text-white/55">
              进入文章广场 →
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}