"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type AnnouncementStyles = Record<string, string>;

const classicStyles: AnnouncementStyles = {
  page: "min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 md:px-8",
  toast: "fixed left-1/2 top-6 z-[999] -translate-x-1/2 rounded-2xl border border-white/10 bg-zinc-900/95 px-5 py-3 text-sm text-white shadow-2xl backdrop-blur-xl",
  shell: "mx-auto max-w-3xl space-y-6",
  header: "",
  back: "text-sm text-zinc-500 transition hover:text-zinc-300",
  title: "mt-4 text-3xl font-semibold",
  intro: "mt-2 text-sm leading-6 text-zinc-400",
  state: "rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6",
  stateText: "text-sm text-zinc-400",
  list: "space-y-4",
  item: "rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-lg",
  date: "text-xs text-zinc-500",
  itemTitle: "mt-2 break-words text-xl font-semibold text-zinc-100",
  itemBody: "mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-zinc-400",
};

type Announcement = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  published_at: string | null;
};

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

export default function AnnouncementsView({ styles }: { styles?: AnnouncementStyles }) {
  const className = styles || classicStyles;
  const modern = Boolean(styles);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    let toastTimer: number | undefined;

    async function fetchAnnouncements() {
      const { data, error } = await supabase
        .from("announcements")
        .select("id,title,content,created_at,published_at")
        .eq("is_active", true)
        .order("published_at", { ascending: false });

      if (!active) return;
      if (error) {
        console.error("fetch announcements error:", error);
        setMessage(`读取公告失败：${error.message}`);
        toastTimer = window.setTimeout(() => setMessage(""), 4200);
        setLoading(false);
        return;
      }

      setAnnouncements((data || []) as Announcement[]);
      setLoading(false);
    }

    void fetchAnnouncements();
    return () => {
      active = false;
      window.clearTimeout(toastTimer);
    };
  }, []);

  return (
    <main data-announcements-skin={modern ? "modern_pixel" : "classic"} className={className.page}>
      {message && (
        <div className={className.toast}>
          {message}
        </div>
      )}

      <div className={className.shell}>
        <section className={className.header}>
          <Link
            href="/home"
            className={className.back}
          >
            ← 回到首页
          </Link>

          <h1 className={className.title}>{modern ? "街区公告" : "世界公告"}</h1>

          <p className={className.intro}>
            {modern ? "街区里的更新与维护消息，都会贴在这里。" : "这里是小时代的公开布告栏。重要更新、维护通知、世界消息都会留在这里。"}
          </p>
        </section>

        {loading ? (
          <section className={className.state}>
            <p className={className.stateText}>正在读取公告...</p>
          </section>
        ) : announcements.length === 0 ? (
          <section className={className.state}>
            <p className={className.stateText}>暂时还没有公告。</p>
          </section>
        ) : (
          <section className={className.list} aria-label="公告列表">
            {announcements.map((item) => (
              <article
                key={item.id}
                className={className.item}
              >
                <p className={className.date}>
                  {formatDate(item.published_at || item.created_at)}
                </p>

                <h2 className={className.itemTitle}>
                  {item.title}
                </h2>

                <p className={className.itemBody}>
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
