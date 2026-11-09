"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Sun } from "lucide-react";
import styles from "./site-skins/modern-pixel/space.module.css";

export type SpacePost = {
  id: number;
  title: string | null;
  slug: string | null;
  content: string;
  type: "article" | "diary";
  published_at: string;
  created_at: string;
  author_id: string;
  authorProfile?: {
    username: string | null;
    avatar_url: string | null;
  } | null;
  likeCount?: number;
  commentCount?: number;
};

type Props = {
  activeFeed: string;
  latestDiaries: SpacePost[];
  latestArticles: SpacePost[];
  hotDiaries: SpacePost[];
  hotArticles: SpacePost[];
};

const feeds = [
  { key: "latest-diaries", label: "最新日记" },
  { key: "hot-diaries", label: "热门日记" },
  { key: "latest-articles", label: "最新文章" },
  { key: "hot-articles", label: "热门文章" },
];

function getExcerpt(content: string, length = 100) {
  return content
    .replace(/!\[[^\]]*\]\(.*?\)/g, "")
    .replace(/[#>*`-]/g, "")
    .trim()
    .slice(0, length);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function getPostTitle(post: SpacePost) {
  if (post.title) return post.title;

  const date = new Date(
    post.published_at || post.created_at
  ).toLocaleDateString("zh-CN");

  return `${date} 的日记`;
}

function getPostHref(post: SpacePost) {
  if (post.type === "diary") return `/diary/${post.id}`;
  if (post.type === "article" && post.slug) return `/articles/${post.slug}`;
  return "/space";
}

function PixelCorners() {
  return (
    <>
      <span className={`${styles.pixelCorner} ${styles.topLeft}`} aria-hidden="true" />
      <span className={`${styles.pixelCorner} ${styles.topRight}`} aria-hidden="true" />
      <span className={`${styles.pixelCorner} ${styles.bottomLeft}`} aria-hidden="true" />
      <span className={`${styles.pixelCorner} ${styles.bottomRight}`} aria-hidden="true" />
    </>
  );
}

function PostCard({ post, compact = false }: { post: SpacePost; compact?: boolean }) {
  const author = post.authorProfile;

  return (
    <Link href={getPostHref(post)} className={`${styles.postCard} ${compact ? styles.compactCard : ""}`}>
      <PixelCorners />
      <div className={styles.postHeader}>
        <div className={styles.authorInfo}>
          <div className={styles.avatar}>
            {author?.avatar_url ? (
              <Image
                src={author.avatar_url}
                alt={author.username || "居民"}
                width={40}
                height={40}
                unoptimized
                className={styles.avatarImage}
              />
            ) : (
              <Sun size={16} aria-hidden="true" />
            )}
          </div>
          <div className={styles.authorText}>
            <span className={styles.authorName}>
              {author?.username || "已离开的居民"}
            </span>
            <p className={styles.postDate}>
              {formatDate(post.published_at || post.created_at)}
            </p>
          </div>
        </div>
        <span className={styles.postType}>
          {post.type === "diary" ? "日记" : "文章"}
        </span>
      </div>

      <h3 className={styles.postTitle}>{getPostTitle(post)}</h3>
      <p className={styles.postExcerpt}>
        {getExcerpt(post.content)}
        {post.content.length > 100 ? "..." : ""}
      </p>
      <div className={styles.postCounts}>
        <span>喜欢 {post.likeCount || 0}</span>
        <span>评论 {post.commentCount || 0}</span>
      </div>
    </Link>
  );
}

function SectionBlock({
  title,
  subtitle,
  href,
  posts,
  compact = false,
}: {
  title: string;
  subtitle: string;
  href: string;
  posts: SpacePost[];
  compact?: boolean;
}) {
  return (
    <section className={`${styles.section} ${compact ? styles.compactSection : ""}`}>
      <div className={styles.sectionHeading}>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <Link href={href} className={styles.moreLink}>
          更多 <span aria-hidden="true">→</span>
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className={styles.emptyState}>这里暂时还没有内容。</div>
      ) : (
        <div className={styles.postGrid}>
          {posts.map((post) => (
            <PostCard key={`${post.type}-${post.id}`} post={post} compact={compact} />
          ))}
        </div>
      )}
    </section>
  );
}

type LatestSlide = "diaries" | "articles";

function LatestContentCarousel({
  latestDiaries,
  latestArticles,
}: {
  latestDiaries: SpacePost[];
  latestArticles: SpacePost[];
}) {
  const [activeSlide, setActiveSlide] = useState<LatestSlide>("diaries");
  const [outgoingSlide, setOutgoingSlide] = useState<LatestSlide | null>(null);
  const [mouseInside, setMouseInside] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    const syncVisibility = () => setPageVisible(!document.hidden);
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => document.removeEventListener("visibilitychange", syncVisibility);
  }, []);

  useEffect(() => {
    if (mouseInside || focusInside || !pageVisible) return;

    const timer = window.setTimeout(() => {
      setOutgoingSlide(activeSlide);
      setActiveSlide(activeSlide === "diaries" ? "articles" : "diaries");
    }, 10_000);

    return () => window.clearTimeout(timer);
  }, [activeSlide, mouseInside, focusInside, pageVisible]);

  useEffect(() => {
    if (!outgoingSlide) return;
    const timer = window.setTimeout(() => setOutgoingSlide(null), 420);
    return () => window.clearTimeout(timer);
  }, [outgoingSlide]);

  function showSlide(nextSlide: LatestSlide) {
    if (nextSlide === activeSlide) return;
    setOutgoingSlide(activeSlide);
    setActiveSlide(nextSlide);
  }

  function slideContent(slide: LatestSlide) {
    return slide === "diaries" ? (
      <SectionBlock
        title="最新日记"
        subtitle="刚刚有人把今天留在这里。"
        href="/space/diaries"
        posts={latestDiaries}
        compact
      />
    ) : (
      <SectionBlock
        title="最新文章"
        subtitle="新写下的故事、长文和作品。"
        href="/space/articles"
        posts={latestArticles}
        compact
      />
    );
  }

  return (
    <section
      className={styles.featurePosts}
      role="region"
      aria-label="最新内容轮播"
      onMouseEnter={() => setMouseInside(true)}
      onMouseLeave={() => setMouseInside(false)}
      onFocusCapture={() => setFocusInside(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocusInside(false);
        }
      }}
    >
      <div className={styles.carouselViewport}>
        {outgoingSlide && (
          <div className={`${styles.carouselPanel} ${styles.slideExiting}`} aria-hidden="true" inert>
            {slideContent(outgoingSlide)}
          </div>
        )}
        <div
          key={activeSlide}
          className={`${styles.carouselPanel} ${outgoingSlide ? styles.slideEntering : ""}`}
        >
          {slideContent(activeSlide)}
        </div>
      </div>
      <div className={styles.carouselIndicators} role="group" aria-label="最新内容切换">
        {(["diaries", "articles"] as const).map((slide) => (
          <button
            key={slide}
            type="button"
            className={`${styles.carouselDot} ${activeSlide === slide ? styles.carouselDotActive : ""}`}
            aria-label={slide === "diaries" ? "显示最新日记" : "显示最新文章"}
            aria-pressed={activeSlide === slide}
            title={slide === "diaries" ? "最新日记" : "最新文章"}
            onClick={() => showSlide(slide)}
          />
        ))}
      </div>
    </section>
  );
}

export default function SpaceClient({
  activeFeed,
  latestDiaries,
  latestArticles,
  hotDiaries,
  hotArticles,
}: Props) {
  return (
    <main data-moon-scene data-nav-scene="space" className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div className={styles.heroScene} role="img" aria-label="广场的喷泉、树荫和街区公告栏" />
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>PUBLIC SPACE / 居民广场</p>
            <h1 id="space-title">广场</h1>
            <p className={styles.heroDescription}>有人留下今天，有人留下故事。<br />走进你想停留的地方。</p>
          </div>
        </header>

        <div className={styles.featureSplit}>
          <LatestContentCarousel latestDiaries={latestDiaries} latestArticles={latestArticles} />
          <nav className={styles.destinations} aria-label="广场内容入口">
            <Link
              href="/space/diaries"
              className={styles.destination}
            >
              <PixelCorners />
              <span className={styles.destinationContent}>
                <span className={styles.destinationIndex}>01 / DAILY NOTES</span>
                <span className={styles.destinationTitle}>日记广场</span>
                <span className={styles.destinationDescription}>
                  看看其他居民公开留下的今天。
                </span>
                <span className={styles.destinationAction}>进入 →</span>
              </span>
            </Link>

            <Link
              href="/space/articles"
              className={styles.destination}
            >
              <PixelCorners />
              <span className={styles.destinationContent}>
                <span className={styles.destinationIndex}>02 / LONG STORIES</span>
                <span className={styles.destinationTitle}>文章广场</span>
                <span className={styles.destinationDescription}>
                  阅读更完整的故事、长文、作品和想法。
                </span>
                <span className={styles.destinationAction}>进入 →</span>
              </span>
            </Link>
          </nav>
        </div>

        <div className={styles.mobileFeeds} aria-label="内容筛选">
          {feeds.map((item) => (
            <Link
              key={item.key}
              href={`/space?feed=${item.key}`}
              aria-current={activeFeed === item.key ? "page" : undefined}
              className={`${styles.feedTab} ${activeFeed === item.key ? styles.feedTabActive : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className={styles.mobileSection}>
          {activeFeed === "latest-diaries" && (
            <SectionBlock
              title="最新日记"
              subtitle="刚刚有人把今天留在这里。"
              href="/space/diaries"
              posts={latestDiaries}
            />
          )}
          {activeFeed === "hot-diaries" && (
            <SectionBlock
              title="热门日记"
              subtitle="被更多居民回应和喜欢的生活碎片。"
              href="/space/diaries"
              posts={hotDiaries}
            />
          )}
          {activeFeed === "latest-articles" && (
            <SectionBlock
              title="最新文章"
              subtitle="新写下的故事、长文和作品。"
              href="/space/articles"
              posts={latestArticles}
            />
          )}
          {activeFeed === "hot-articles" && (
            <SectionBlock
              title="热门文章"
              subtitle="最近更容易被看见的故事。"
              href="/space/articles"
              posts={hotArticles}
            />
          )}
        </div>

        <div className={styles.desktopSections}>
          <SectionBlock
            title="热门日记"
            subtitle="被更多居民回应和喜欢的生活碎片。"
            href="/space/diaries"
            posts={hotDiaries}
          />
          <SectionBlock
            title="热门文章"
            subtitle="最近更容易被看见的故事。"
            href="/space/articles"
            posts={hotArticles}
          />
        </div>
      </div>
    </main>
  );
}
