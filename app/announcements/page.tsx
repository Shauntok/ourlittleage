import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Announcement = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  published_at: string | null;
};

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString("zh-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AnnouncementsPage() {
  const { data: announcements, error } = await supabase
    .from("announcements")
    .select("id,title,content,created_at,published_at")
    .eq("is_active", true)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });

  if (error) {
    console.error(error);
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 md:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <section>
          <Link
            href="/home"
            className="text-sm text-zinc-500 transition hover:text-zinc-300"
          >
            ← 回到首页
          </Link>

          <h1 className="mt-4 text-3xl font-semibold">世界公告</h1>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            这里是小时代的公开布告栏。重要更新、维护通知、世界消息都会留在这里。
          </p>
        </section>

        {!announcements || announcements.length === 0 ? (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
            <p className="text-sm text-zinc-400">暂时还没有公告。</p>
          </section>
        ) : (
          <section className="space-y-4">
            {(announcements as Announcement[]).map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-lg"
              >
                <p className="text-xs text-zinc-500">
                  {formatDate(item.published_at)}
                </p>

                <h2 className="mt-2 break-words text-xl font-semibold text-zinc-100">
                  {item.title}
                </h2>

                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-zinc-400">
                  {item.content}
                </p>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}