import Link from "next/link";

export const metadata = {
  title: "关于网站 · 小时代",
};

export default function AboutSitePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-5 pb-24 pt-20 text-white md:px-6 md:py-24">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />

      <div className="pointer-events-none fixed left-1/2 top-1/3 -z-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl md:h-[560px] md:w-[560px]" />

      <section className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-2xl md:rounded-[2.5rem] md:p-10">
        <p className="text-xs tracking-[0.4em] text-white/25">
          ABOUT OUR LITTLE AGE
        </p>

        <h1 className="mt-6 text-4xl font-light tracking-tight md:text-5xl">
          关于小时代
        </h1>

        <p className="mt-6 text-base leading-8 text-white/60">
          你好，欢迎来到小时代。
        </p>

        <div className="safe-pre mt-8 space-y-6 text-sm leading-8 text-white/55 md:text-base">
          <p>
            小时代不是博客。
          </p>

          <p>
            不是论坛。
          </p>

          <p>
            也不是一个让人不停刷新、追逐流量和热度的社交媒体。
          </p>

          <p>
            它更像是一座深夜里的数字小镇。
          </p>

          <p>
            每个人都拥有属于自己的房间，可以慢慢留下那些不必急着说出口的话。
          </p>

          <p>
            你可以写下日记、故事、作品、回忆、心情，或者只是记录今天发生的一件小事。
          </p>

          <p>
            在这里，没有人需要一直保持有趣，也不需要时时刻刻表现得很好。
          </p>

          <p>
            你可以安静，可以沉默，可以偶尔消失，也可以在某个睡不着的夜晚回来看看。
          </p>

          <p>
            我希望这里的内容不是被消费，而是被珍惜。
          </p>

          <p>
            希望居民们不是来刷内容，而是愿意住下来。
          </p>

          <p>
            每一篇日记、每一篇文章、每一句留言，都会慢慢成为这个世界的一部分。
          </p>

          <p>
            或许很多年以后，当你再次回到这里时，还能找到曾经留下的生活痕迹。
          </p>

          <p>
            这就是小时代存在的意义。
          </p>

          <p>
            谢谢你愿意来到这里，也谢谢你留下属于自己的光。
          </p>
        </div>

        <div className="mt-12 rounded-[1.5rem] border border-violet-500/15 bg-violet-500/[0.06] p-5 md:p-6">
          <p className="text-xs tracking-[0.3em] text-violet-100/40">
            OUR LITTLE AGE
          </p>

          <p className="mt-4 text-sm leading-8 text-violet-100/70">
            用户不是来消费内容。
            <br />
            而是来住下。
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/home"
            className="rounded-full bg-white px-6 py-3 text-center text-sm font-semibold text-black transition hover:bg-white/90"
          >
            回到首页
          </Link>

          <Link
            href="/space"
            className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-center text-sm text-white/60 transition hover:border-white/25 hover:text-white"
          >
            去深夜广场看看
          </Link>
        </div>
      </section>
    </main>
  );
}