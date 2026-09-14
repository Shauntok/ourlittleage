import Link from "next/link";
import { redirect } from "next/navigation";

import TrashList from "@/components/trash/TrashList";
import {
  listOwnedTrashPosts,
  type TrashPost,
} from "@/lib/server/postTrash";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect("/");

  const now = new Date();
  let items: TrashPost[];

  try {
    items = await listOwnedTrashPosts(supabase, user.id, now);
  } catch {
    return (
      <main className="min-h-screen bg-black px-5 py-20 text-white md:px-8 md:py-28">
        <div className="mx-auto max-w-5xl">
          <Link href="/home" className="text-sm text-white/40 transition hover:text-white/70">
            ← 回到首页
          </Link>
          <section className="mt-12 border-y border-white/10 py-16 text-center">
            <h1 className="text-3xl font-light">垃圾桶暂时无法打开。</h1>
            <p className="mt-4 text-sm leading-7 text-white/35">晚一点再来看看，你的内容仍然好好留着。</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-5 pb-24 pt-16 text-white md:px-8 md:py-24">
      <div className="mx-auto max-w-5xl">
        <Link href="/home" className="text-sm text-white/40 transition hover:text-white/70">
          ← 回到首页
        </Link>

        <header className="pb-10 pt-12 md:pb-14 md:pt-16">
          <p className="text-xs tracking-[0.35em] text-white/25">TRASH</p>
          <h1 className="mt-4 text-5xl font-light md:text-6xl">垃圾桶</h1>
          <p className="mt-5 max-w-xl text-sm leading-8 text-white/40">
            被删除的日记与文章会在这里停留 15 天。想起还舍不得时，可以把它们轻轻放回原处。
          </p>
        </header>

        <TrashList items={items} serverNow={now.toISOString()} />
      </div>
    </main>
  );
}
