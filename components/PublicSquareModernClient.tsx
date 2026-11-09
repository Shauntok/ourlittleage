"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFirstPostImage, getPostPreviewLines } from "@/lib/post-preview";
import styles from "./site-skins/modern-pixel/public-square.module.css";
import { articleTagHref, uniqueArticleTags } from "@/lib/posts/tags";

type PublicPost = {
  id: number;
  content: string;
  published_at: string;
  authorProfile?: { username: string | null; avatar_url: string | null } | null;
  likeCount?: number;
  commentCount?: number;
  title?: string;
  slug?: string;
  tags?: string | null;
};

type Props = {
  kind: "diary" | "article";
  posts: PublicPost[];
  initialLoadFailed?: boolean;
};

function Corners() {
  return (
    <>
      <span className={`${styles.corner} ${styles.topLeft}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.topRight}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.bottomLeft}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.bottomRight}`} aria-hidden="true" />
    </>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export default function PublicSquareModernClient({ kind, posts, initialLoadFailed = false }: Props) {
  const router = useRouter();
  const [sortMode, setSortMode] = useState<"newest" | "hot">("newest");
  const [visibleCount, setVisibleCount] = useState(20);
  const isDiary = kind === "diary";
  const sortedPosts = [...posts].sort((a, b) => {
    if (sortMode === "hot") {
      const scoreA = (a.likeCount || 0) * 3 + (a.commentCount || 0) * 2;
      const scoreB = (b.likeCount || 0) * 3 + (b.commentCount || 0) * 2;
      if (scoreA !== scoreB) return scoreB - scoreA;
    }
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
  });
  const visiblePosts = sortedPosts.slice(0, visibleCount);

  return (
    <main className={styles.page} data-nav-scene="reading-square" data-reading-skin="modern_pixel">
      <div className={styles.shell}>
        <header className={styles.hero}>
          <Corners />
          <p>{isDiary ? "DIARY SQUARE / 日记广场" : "ARTICLE SQUARE / 文章广场"}</p>
          <h1>{isDiary ? "日记广场" : "文章广场"}</h1>
          <span>{isDiary ? "把今天留在这里，或许有人刚好读到。" : "让较长的故事，在纸页里慢慢展开。"}</span>
        </header>

        <Link className={styles.back} href="/space">← 返回广场</Link>

        <div className={styles.toolbar}>
          <div className={styles.controls} aria-label="排列方式">
            <button type="button" aria-pressed={sortMode === "newest"} onClick={() => { setSortMode("newest"); setVisibleCount(20); }}>最新</button>
            <button type="button" aria-pressed={sortMode === "hot"} onClick={() => { setSortMode("hot"); setVisibleCount(20); }}>热门</button>
            <button type="button" onClick={() => router.refresh()}>刷新</button>
          </div>
          <p>公开作品 · {sortMode === "newest" ? "最近发布" : "大家喜欢"}</p>
        </div>

        {initialLoadFailed ? (
          <div className={styles.notice} role="alert">
            <Corners />
            <h2>日记暂时加载失败</h2>
            <p>暂时无法读取日记，请稍后重试。</p>
            <button type="button" onClick={() => router.refresh()}>重新加载</button>
          </div>
        ) : posts.length === 0 ? (
          <div className={styles.notice}>
            <Corners />
            <h2>{isDiary ? "今晚还没有人留下日记。" : "这里暂时还没有文章。"}</h2>
            <p>{isDiary ? "也许你会成为第一个留下今天的人。" : "等有人写下新的故事，再来看看。"}</p>
            {isDiary && <Link href="/diary/new">写下今天 →</Link>}
          </div>
        ) : (
          <>
            <div className={styles.list}>
              {visiblePosts.map((post, index) => {
                const lines = getPostPreviewLines(post.content);
                const diaryText = lines.join(" ");
                const diaryHeading = diaryText.slice(0, 29).trim();
                const title = isDiary
                  ? (diaryHeading ? diaryHeading + (diaryText.length > diaryHeading.length ? "…" : "") : `${new Date(post.published_at).toLocaleDateString("zh-CN")} 的日记`)
                  : (post.title || "未命名的故事");
                const excerpt = isDiary ? diaryText.slice(diaryHeading.length).trim() : diaryText;
                const image = getFirstPostImage(post.content);
                const href = isDiary ? `/diary/${post.id}` : `/articles/${encodeURIComponent(post.slug || "")}`;
                const username = post.authorProfile?.username;
                return (
                  <article key={post.id} className={styles.card}>
                    <Corners />
                    <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
                    <div className={styles.cardBody}>
                      <div className={styles.meta}>
                        {username ? <Link href={`/u/${encodeURIComponent(username)}`}>{username}</Link> : <span>已离开的居民</span>}
                        <span aria-hidden="true">·</span>
                        <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
                      </div>
                      <Link href={href} className={styles.entry} aria-label={`${isDiary ? "翻开日记" : "阅读文章"}：${title}`}>
                        <div className={styles.entryText}>
                          <h2>{title}</h2>
                          {excerpt && <p>{excerpt}</p>}
                          <span className={styles.counts}>♡ {post.likeCount || 0}　▤ {post.commentCount || 0}</span>
                        </div>
                        {image ? (
                          <span className={styles.thumbnail}>
                            {/* User images are already public; source URLs are supplied in post Markdown. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={image} alt="" loading="lazy" decoding="async" />
                          </span>
                        ) : <span className={styles.read}>{isDiary ? "翻开" : "阅读"} →</span>}
                      </Link>
                      {!isDiary && uniqueArticleTags(post.tags).length > 0 && (
                        <div className={styles.tagList} aria-label="文章标签">
                          {uniqueArticleTags(post.tags).slice(0, 5).map((tag) => <Link key={tag} href={articleTagHref(tag)}>#{tag}</Link>)}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            {visibleCount < sortedPosts.length && (
              <div className={styles.more}><button type="button" onClick={() => setVisibleCount((count) => count + 20)}>再翻一些{isDiary ? "日记" : "文章"} ↓</button></div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
