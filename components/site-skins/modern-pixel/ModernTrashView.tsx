"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { restorePost } from "@/app/actions/trash";
import type { TrashSkinProps } from "@/components/trash/TrashSkinClient";
import { getTrashTiming } from "@/lib/posts/trash";
import type { TrashPost } from "@/lib/server/postTrash";
import styles from "./trash.module.css";

function excerpt(item: TrashPost) {
  if (item.title?.trim()) return item.title.trim();
  const content = (item.content || "")
    .replace(/!\[[^\]]*\]\(.*?\)/g, "")
    .replace(/[#>*_`-]/g, "")
    .trim();
  return content.slice(0, 42) || (item.type === "diary" ? "未命名日记" : "未命名文章");
}

function preview(item: TrashPost) {
  const content = (item.content || "")
    .replace(/!\[[^\]]*\]\(.*?\)/g, "")
    .replace(/[#>*_`-]/g, "")
    .trim();
  return content.slice(0, 78) || "这份内容还没有留下文字。";
}

function deletedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "日期未知"
    : new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date);
}

export default function ModernTrashView({ items, serverNow, loadError }: TrashSkinProps) {
  const router = useRouter();
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const now = new Date(serverNow);

  async function restore(item: TrashPost) {
    setRestoringId(item.id);
    setMessage("");
    try {
      const result = await restorePost(item.id);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      router.refresh();
    } catch {
      setMessage("这份内容暂时无法恢复，请稍后再试。");
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <main data-trash-skin="modern_pixel" className={styles.page}>
      <div className={styles.shell}>
        <Link href="/home" className={styles.backLink}>← 回到首页</Link>
        <header className={styles.intro}>
          <div className={styles.trashIcon} aria-hidden="true"><Trash2 size={55} strokeWidth={1.8} /></div>
          <div className={styles.introCopy}>
            <h1>垃圾桶</h1>
            <p>被删除的内容会在 <strong>15 天</strong> 后自动永久删除，在此期间你可以随时恢复。</p>
          </div>
          <p className="sr-only">有些故事只是暂时放下，也许之后还会再见。</p>
        </header>

        {message && <p role="alert" className={styles.alert}>{message}</p>}
        {loadError ? (
          <section className={styles.error}>
            <h2>垃圾桶暂时无法打开。</h2>
            <p>晚一点再来看看，你的内容仍然好好留着。</p>
          </section>
        ) : (
          <div className={styles.drawers}>
            {(["diary", "article"] as const).map((type) => {
              const drawerItems = items.filter((item) => item.type === type);
              const label = type === "diary" ? "日记" : "文章";
              return (
                <section key={type} className={styles.drawer} aria-label={`已删除的${label}`}>
                  <div className={styles.drawerHeader}>
                    <h2>{label}</h2>
                    <span className={styles.count}>共 {drawerItems.length} 篇</span>
                  </div>
                  <div className={styles.papers}>
                    {drawerItems.length === 0 ? (
                      <div className={styles.emptyPaper}>
                        <span className={styles.emptyFlower} aria-hidden="true">✿</span>
                        <p>这里还没有被放下的{label}。</p>
                      </div>
                    ) : drawerItems.map((item) => {
                      const timing = getTrashTiming(item.deleted_at, now);
                      return (
                        <article key={item.id} className={styles.paper}>
                          <div className={`${styles.thumb} ${type === "diary" ? styles.diaryThumb : styles.articleThumb}`} aria-hidden="true" />
                          <div className={styles.paperBody}>
                            <span className={styles.flower} aria-hidden="true">✿</span>
                            <h3>{excerpt(item)}</h3>
                            <p className={styles.preview}>{preview(item)}</p>
                            <div className={styles.paperFooter}>
                              <span className={styles.deletedAt}><CalendarDays size={16} aria-hidden="true" /> 已删除 {deletedDate(item.deleted_at)}</span>
                              <span className={styles.remaining}>
                                {timing.remainingDays > 0 ? `还剩 ${timing.remainingDays} 天` : "即将永久删除"}
                              </span>
                              <button
                                type="button"
                                className={styles.restore}
                                onClick={() => restore(item)}
                                disabled={restoringId === item.id}
                                aria-label={`恢复这篇${label}：${excerpt(item)}`}
                              >
                                <RotateCcw size={18} aria-hidden="true" />
                                <span>{restoringId === item.id ? "恢复中" : "恢复"}</span>
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
      <div className={styles.cat} role="img" aria-label="窗边打盹、偶尔醒来挠鼻子和摆尾巴的猫咪" />
    </main>
  );
}
