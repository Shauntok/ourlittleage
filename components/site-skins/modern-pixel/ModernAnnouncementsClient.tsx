"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Megaphone, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import styles from "./announcements.module.css";

type Announcement = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  published_at: string | null;
};

const PAGE_SIZE = 4;
const FIELDS = "id,title,content,created_at,published_at";

function formatDate(item: Announcement) {
  return new Date(item.published_at || item.created_at).toLocaleDateString("zh-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function monthBounds(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || month < 1 || month > 12) return null;
  return [
    new Date(Date.UTC(year, month - 1, 1, -8)).toISOString(),
    new Date(Date.UTC(year, month, 1, -8)).toISOString(),
  ] as const;
}

function NoticePaper({ item, featured = false, onOpen }: {
  item: Announcement;
  featured?: boolean;
  onOpen: () => void;
}) {
  return (
    <button type="button" className={`${styles.paper} ${featured ? styles.featuredPaper : ""}`} onClick={onOpen}>
      <span className={styles.paperMeta}>
        {featured ? (
          <span className={styles.paperKind}><Megaphone size={24} aria-hidden="true" />最新公告</span>
        ) : (
          <FileText size={18} aria-hidden="true" />
        )}
        <span className={styles.paperDate}>{formatDate(item)}</span>
      </span>
      <span className={styles.paperTitle}>{item.title}</span>
      <span className={styles.paperExcerpt}>{item.content}</span>
      <span className={styles.paperOpen}>展开阅读 <ChevronRight size={14} aria-hidden="true" /></span>
    </button>
  );
}

export default function ModernAnnouncementsClient() {
  const [latest, setLatest] = useState<Announcement[]>([]);
  const [total, setTotal] = useState(0);
  const [latestLoading, setLatestLoading] = useState(true);
  const [archive, setArchive] = useState<Announcement[]>([]);
  const [archiveTotal, setArchiveTotal] = useState(0);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [latestError, setLatestError] = useState("");
  const [archiveError, setArchiveError] = useState("");
  const [view, setView] = useState<"recent" | "archive" | "detail">("recent");
  const [origin, setOrigin] = useState<"recent" | "archive">("recent");
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [month, setMonth] = useState("");
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadLatest() {
      setLatestLoading(true);
      const { data, count, error: queryError } = await supabase
        .from("announcements")
        .select(FIELDS, { count: "exact" })
        .eq("is_active", true)
        .order("published_at", { ascending: false })
        .order("id", { ascending: false })
        .range(0, 2);
      if (!active) return;
      setLatestError(queryError ? "公告暂时无法读取，请重试。" : "");
      setLatest((data || []) as Announcement[]);
      setTotal(count || 0);
      setLatestLoading(false);
    }
    void loadLatest();
    return () => { active = false; };
  }, [retry]);

  useEffect(() => {
    if (view !== "archive" || latestLoading) return;
    let active = true;
    async function loadArchive() {
      setArchiveLoading(true);
      let query = supabase
        .from("announcements")
        .select(FIELDS, { count: "exact" })
        .eq("is_active", true);

      if (latest.length) {
        query = query.not("id", "in", `(${latest.map((item) => item.id).join(",")})`);
      }
      const bounds = monthBounds(month);
      if (bounds) query = query.gte("published_at", bounds[0]).lt("published_at", bounds[1]);
      const { data, count, error: queryError } = await query
        .order("published_at", { ascending: false })
        .order("id", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (!active) return;
      setArchiveError(queryError ? "往期公告暂时无法读取，请重试。" : "");
      setArchive(queryError ? [] : (data || []) as Announcement[]);
      setArchiveTotal(queryError ? 0 : count || 0);
      setArchiveLoading(false);
    }
    void loadArchive();
    return () => { active = false; };
  }, [view, latest, latestLoading, month, page, retry]);

  function openNotice(item: Announcement, from: "recent" | "archive") {
    setOrigin(from);
    setSelected(item);
    setView("detail");
  }

  function showArchive() {
    setPage(0);
    setMonth("");
    setView("archive");
  }

  return (
    <main data-announcements-skin="modern_pixel" className={styles.page}>
      <div className={styles.shell}>
        <section className={`${styles.board} ${view === "detail" ? styles.boardDetail : ""}`} aria-label="街区公告栏">
          <div className={styles.boardHeader}>
            <h1>街区公告</h1>
            <span className={styles.boardCount}>{total} 则公告</span>
          </div>

          <div className={styles.boardInner}>
            {view === "recent" && (
              <>
                {latestLoading ? <p className={styles.state}>正在读取公告...</p> : latestError ? <div className={styles.state}>{latestError} <button type="button" onClick={() => setRetry((value) => value + 1)}>重试</button></div> : latest.length ? (
                  <div className={styles.recentGrid}>
                    <NoticePaper item={latest[0]} featured onOpen={() => openNotice(latest[0], "recent")} />
                    <div className={styles.recentSide}>
                      {latest.slice(1).map((item) => <NoticePaper key={item.id} item={item} onOpen={() => openNotice(item, "recent")} />)}
                      {Array.from({ length: Math.max(0, 3 - latest.length) }, (_, index) => (
                        <div key={`empty-paper-${index}`} className={`${styles.paper} ${styles.emptyPaper}`} aria-hidden="true" />
                      ))}
                      <button type="button" className={styles.archiveTab} onClick={showArchive}>往期公告 <ChevronRight size={16} /></button>
                    </div>
                  </div>
                ) : <div className={styles.emptyBoard}><p>暂时还没有公告。</p><button type="button" className={styles.archiveTab} onClick={showArchive}>往期公告 <ChevronRight size={16} /></button></div>}
              </>
            )}

            {view === "archive" && (
              <>
                <div className={styles.sectionLine}>
                  <div><span className={styles.sectionEyebrow}>PAST NOTES</span><h2>往期公告</h2></div>
                  <button type="button" className={styles.textAction} onClick={() => setView("recent")}>← 返回最新</button>
                </div>
                <div className={styles.archiveTools}>
                  <label htmlFor="announcement-month">按月份查看</label>
                  <input id="announcement-month" type="month" value={month} onChange={(event) => { setMonth(event.target.value); setPage(0); }} />
                  {month && <button type="button" className={styles.clearButton} onClick={() => { setMonth(""); setPage(0); }}><X size={14} /> 清除</button>}
                  <span className={styles.archiveCount}>共 {archiveTotal} 则</span>
                </div>
                {archiveLoading ? <p className={styles.state}>正在翻找旧公告...</p> : archiveError ? <div className={styles.state}>{archiveError} <button type="button" onClick={() => setRetry((value) => value + 1)}>重试</button></div> : archive.length ? (
                  <div className={styles.archiveGrid}>
                    {archive.map((item) => <NoticePaper key={item.id} item={item} onOpen={() => openNotice(item, "archive")} />)}
                  </div>
                ) : <p className={styles.state}>这个月份没有往期公告。</p>}
                <div className={styles.pagination}>
                  <button type="button" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0 || archiveLoading}><ChevronLeft size={16} /> 较新</button>
                  <span>第 {page + 1} / {Math.max(1, Math.ceil(archiveTotal / PAGE_SIZE))} 页</span>
                  <button type="button" onClick={() => setPage((value) => value + 1)} disabled={archiveLoading || (page + 1) * PAGE_SIZE >= archiveTotal}>较早 <ChevronRight size={16} /></button>
                </div>
              </>
            )}

            {view === "detail" && selected && (
              <>
                <div className={styles.sectionLine}>
                  <div><span className={styles.sectionEyebrow}>NOTICE</span><h2>公告详情</h2></div>
                  <button type="button" className={styles.textAction} onClick={() => setView(origin)}>← 返回{origin === "archive" ? "往期公告" : "最新公告"}</button>
                </div>
                <article className={styles.detailPaper}>
                  <p className={styles.detailDate}>{formatDate(selected)}</p>
                  <h2>{selected.title}</h2>
                  <div className={styles.detailBody}>{selected.content}</div>
                  <div className={styles.detailFooter}>小时代 · 街区公告</div>
                </article>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
