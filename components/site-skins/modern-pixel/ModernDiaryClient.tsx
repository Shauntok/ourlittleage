"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, PenLine } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getOwnedPostDestination } from "@/lib/posts/ownedPostRoutes";
import styles from "./diary.module.css";

type Diary = {
  id: number;
  slug: string | null;
  status: string;
  visibility: string;
  content: string;
  created_at: string;
  published_at: string | null;
  edit_count: number | null;
};

type Filter = "all" | "published" | "draft";

const weekdays = ["一", "二", "三", "四", "五", "六", "日"];

function diaryDate(diary: Diary) {
  return diary.published_at || diary.created_at;
}

function dateKey(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function visibilityLabel(visibility: string) {
  switch (visibility) {
    case "private": return "私密";
    case "hidden": return "隐藏";
    case "unlisted": return "链接可见";
    case "neighbors": return "仅邻居可见";
    default: return "公开";
  }
}

function PixelCorners() {
  return (
    <>
      <span className={`${styles.corner} ${styles.topLeft}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.topRight}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.bottomLeft}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.bottomRight}`} aria-hidden="true" />
    </>
  );
}

export default function ModernDiaryClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [mobileArchiveOpen, setMobileArchiveOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function fetchDiaries() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        router.push("/home");
        return;
      }

      const { data, error } = await supabase
        .from("posts")
        .select("id, slug, status, visibility, content, created_at, published_at, edit_count")
        .eq("author_id", user.id)
        .or("type.eq.diary,type.is.null")
        .is("deleted_at", null);

      if (!active) return;
      if (error) {
        setMessage(error.message);
      } else {
        const sorted = ((data || []) as Diary[]).sort((a, b) =>
          new Date(diaryDate(b)).getTime() - new Date(diaryDate(a)).getTime()
        );
        setDiaries(sorted);
        if (sorted.length > 0) {
          const latestDate = new Date(diaryDate(sorted[0]));
          setCalendarMonth(new Date(latestDate.getFullYear(), latestDate.getMonth(), 1));
        }
      }
      setLoading(false);
    }

    fetchDiaries();
    return () => { active = false; };
  }, [router]);

  const filteredDiaries = diaries.filter((diary) => {
    if (filter !== "all" && diary.status !== filter) return false;
    return !selectedDate || dateKey(diaryDate(diary)) === selectedDate;
  });

  const counts = {
    all: diaries.length,
    published: diaries.filter((diary) => diary.status === "published").length,
    draft: diaries.filter((diary) => diary.status === "draft").length,
  };

  const recordedDates = new Set(diaries.map((diary) => dateKey(diaryDate(diary))));
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarCells = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <main data-moon-scene data-nav-scene="diary" className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.scene} role="img" aria-label="阳光下的小镇街景" />

        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>MY DIARY / 个人日记</p>
            <h1>我的日记</h1>
            <p className={styles.subtitle}>把平常的一天，好好留在这里。</p>
          </div>
          <Link href="/diary/new" className={styles.writeButton}>
            <PenLine size={16} aria-hidden="true" />写日记
          </Link>
        </header>

        <div className={styles.sectionLine} />
        <div className={styles.workspace}>
          <aside className={styles.sidebar} aria-label="日期筛选">
            <p className={styles.sectionIndex}>01 / 日历窗</p>
            <p className={styles.sectionHint}>从日期进入，也能顺着最新记录往下读。</p>

            <section className={styles.calendarPanel} aria-label="按日期回看日记">
              <PixelCorners />
              <div className={styles.calendarHeading}>
                <h2>按日期回看</h2>
                {selectedDate && (
                  <button type="button" className={styles.clearButton} onClick={() => setSelectedDate("")}>
                    清除筛选
                  </button>
                )}
              </div>
              <button type="button" className={styles.mobileArchiveToggle} aria-expanded={mobileArchiveOpen} aria-controls="diary-calendar-content" onClick={() => setMobileArchiveOpen((open) => !open)}>
                {selectedDate ? `已选 ${selectedDate}` : "选择日期"}<span aria-hidden="true">{mobileArchiveOpen ? "收起 ↑" : "展开 ↓"}</span>
              </button>
              <div id="diary-calendar-content" className={`${styles.calendarContent} ${mobileArchiveOpen ? styles.mobileArchiveOpen : ""}`}>
              <div className={styles.monthBar}>
                <button type="button" className={styles.monthButton} aria-label="上个月" onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}>
                  <ChevronLeft size={17} aria-hidden="true" />
                </button>
                <strong>{year} 年 {month + 1} 月</strong>
                <button type="button" className={styles.monthButton} aria-label="下个月" onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}>
                  <ChevronRight size={17} aria-hidden="true" />
                </button>
              </div>
              <div className={styles.calendarGrid}>
                {weekdays.map((day) => <span key={day} className={styles.weekday}>{day}</span>)}
                {calendarCells.map((day, index) => {
                  if (day === null) return <span key={`empty-${index}`} />;
                  const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const hasDiary = recordedDates.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!hasDiary}
                      aria-label={`${year}年${month + 1}月${day}日${hasDiary ? "，有日记" : "，无日记"}`}
                      aria-pressed={selectedDate === key}
                      className={`${styles.day} ${hasDiary ? styles.recordedDay : ""} ${selectedDate === key ? styles.selectedDay : ""}`}
                      onClick={() => setSelectedDate(selectedDate === key ? "" : key)}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <p className={styles.calendarLegend}><span aria-hidden="true" /> 有记录的日子</p>
              </div>
            </section>
          </aside>

          <section className={styles.entries} aria-label="我的日记记录">
            <div className={styles.filters} aria-label="日记状态筛选">
              {([
                ["all", "全部"],
                ["published", "已发布"],
                ["draft", "草稿"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                  className={`${styles.filterButton} ${filter === key ? styles.activeFilter : ""}`}
                >
                  {label} <span>{counts[key]}</span>
                </button>
              ))}
            </div>
            <div className={styles.listHeading}>
              <h2>{selectedDate ? "那一天的记录" : "最近留下"}</h2>
              <span>{filteredDiaries.length} 则记录</span>
            </div>

            {message && <p role="alert" className={styles.message}>{message}</p>}
            {loading ? (
              <p role="status" className={styles.empty}>正在翻找那些日子...</p>
            ) : filteredDiaries.length === 0 ? (
              <div className={styles.empty}>
                <p>{selectedDate ? "这一天还没有日记。" : "这个分类里暂时还没有日记。"}</p>
                <Link href="/diary/new">写下今天 →</Link>
              </div>
            ) : (
              <div className={styles.entryList}>
                {filteredDiaries.map((diary, index) => {
                  const date = new Date(diaryDate(diary));
                  const formatted = new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", weekday: "long" }).format(date);
                  return (
                    <Link
                      key={diary.id}
                      href={getOwnedPostDestination({ id: diary.id, slug: diary.slug || "", type: "diary", status: diary.status })}
                      className={`${styles.entry} ${styles[`entryAccent${index % 3}`]}`}
                    >
                      <span className={styles.dateTile} aria-hidden="true">{date.getDate()}</span>
                      <span className={styles.entryBody}>
                        <span className={styles.entryDate}>{formatted}</span>
                        <span className={styles.entryMeta}>{diary.status === "draft" ? "草稿" : "已发布"} · {visibilityLabel(diary.visibility)}</span>
                        <span className={styles.excerpt}>{diary.content || "这一天还没有写下内容。"}</span>
                      </span>
                      <span className={styles.openEntry}>{diary.status === "draft" ? "续写" : "翻开"} →</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
