"use client";

import { useState } from "react";
import type { PublicChangelogEntry } from "@/lib/changelog/public";
import PixelCornerMarks from "./PixelCornerMarks";
import styles from "./changelog.module.css";

const DRAWERS_PER_PAGE = 4;
const PREVIEW_ITEMS_PER_SECTION = 3;
const drawerClasses = [styles.drawerOne, styles.drawerTwo, styles.drawerThree, styles.drawerFour];

export default function ModernChangelogSettings({ entries }: { entries: readonly PublicChangelogEntry[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [drawerPage, setDrawerPage] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const pageCount = Math.ceil(entries.length / DRAWERS_PER_PAGE);
  const visibleDrawers = entries.slice(drawerPage * DRAWERS_PER_PAGE, (drawerPage + 1) * DRAWERS_PER_PAGE);
  const selected = entries[selectedIndex];

  function showDrawerPage(nextPage: number) {
    setDrawerPage(nextPage);
    setSelectedIndex(nextPage * DRAWERS_PER_PAGE);
    setExpanded(false);
  }

  if (!selected) return null;

  const sections = [
    { title: "新功能", tone: "feature", items: selected.features },
    { title: "修复", tone: "fix", items: selected.fixes },
    { title: "优化", tone: "improvement", items: selected.improvements },
  ] as const;
  const hasMore = sections.some(({ items }) => items.length > PREVIEW_ITEMS_PER_SECTION);

  return <div className={styles.page} data-changelog-skin="modern_pixel">
    <PixelCornerMarks />
    <div className={styles.scene}>
      <div className={styles.archiveLayout}>
        <div className={styles.archiveColumn}>
          <nav className={styles.cabinet} aria-label="版本档案">
            <h2 className={styles.cabinetTitle}>版本档案柜</h2>
            {visibleDrawers.map((entry, slot) => {
              const index = drawerPage * DRAWERS_PER_PAGE + slot;
              return <button
                key={entry.version}
                type="button"
                className={`${styles.drawer} ${drawerClasses[slot]} ${selectedIndex === index ? styles.drawerSelected : ""}`}
                aria-pressed={selectedIndex === index}
                aria-label={`查看 ${entry.version}，${entry.date}`}
                onClick={() => { setSelectedIndex(index); setExpanded(false); }}
              >
                <strong>{entry.version}</strong>
                <span>{entry.date}</span>
              </button>;
            })}
          </nav>
          {pageCount > 1 && <div className={styles.pageTurner} aria-label="版本档案翻页">
            <button type="button" onClick={() => showDrawerPage(drawerPage - 1)} disabled={drawerPage === 0}>← 较新</button>
            <span>{drawerPage + 1} / {pageCount}</span>
            <button type="button" onClick={() => showDrawerPage(drawerPage + 1)} disabled={drawerPage + 1 >= pageCount}>往期 →</button>
          </div>}
        </div>

        <article className={styles.paper} aria-live="polite" aria-label={`${selected.version} 更新内容`}>
          <span className={styles.paperCorners} aria-hidden="true"><i /><i /><i /><i /></span>
          <div className={styles.paperInner}>
            <p className={styles.eyebrow}>OUR LITTLE AGE · VERSION NOTES</p>
            <h1>更新日志</h1>
            <p className={styles.intro}>记录每一次小小的改进，和正在变得更好的小时代。</p>
            <div className={styles.rule} aria-hidden="true"><span>✦</span></div>
            <div className={styles.releaseHeading}>
              <h2>{selected.version}</h2>
              {selectedIndex === 0 && <span className={styles.latest}>最新记录</span>}
              <time dateTime={selected.date.replaceAll(".", "-")}>{selected.date}</time>
            </div>
            {sections.filter(({ items }) => items.length > 0).map(({ title, tone, items }) =>
              <section key={title} className={styles.logSection} data-tone={tone}>
                <h3><span className={styles.sectionMark} aria-hidden="true">✦</span>{title}<span className={styles.sectionRule} aria-hidden="true" /></h3>
                <ul>
                  {(expanded ? items : items.slice(0, PREVIEW_ITEMS_PER_SECTION)).map((item) => <li key={item}>{item}</li>)}
                </ul>
                {!expanded && items.length > PREVIEW_ITEMS_PER_SECTION &&
                  <p className={styles.remaining}>另有 {items.length - PREVIEW_ITEMS_PER_SECTION} 项，展开后查看</p>}
              </section>
            )}
            {hasMore && <button className={styles.expandButton} type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
              {expanded ? "收起部分内容" : "展开全部内容"}<span aria-hidden="true">{expanded ? "⌃" : "⌄"}</span>
            </button>}
          </div>
        </article>
      </div>
    </div>
  </div>;
}
