"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, PenLine, Search, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getOwnedPostDestination } from "@/lib/posts/ownedPostRoutes";
import styles from "./articles.module.css";

type Article = {
  id: number;
  title: string | null;
  slug: string | null;
  content: string;
  status: string;
  visibility: string;
  published_at: string | null;
  created_at: string;
  tags: string | null;
};

type Filter = "all" | "published" | "draft";
type Suggestion =
  | { kind: "title" | "content"; label: string; article: Article }
  | { kind: "tag"; label: string; tag: string };

function articleDate(article: Article) {
  return article.published_at || article.created_at;
}

function dateKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getTags(article: Article) {
  return (article.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean);
}

function getExcerpt(content: string, maxLength = 135) {
  return (content || "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`]/g, "")
    .trim()
    .slice(0, maxLength);
}

function getFirstImage(content: string) {
  return (content || "").match(/!\[[^\]]*\]\((.*?)\)/)?.[1] || "";
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

function getSuggestions(articles: Article[], query: string): Suggestion[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return [];

  const titleMatches = articles
    .filter((article) => (article.title || "").toLocaleLowerCase().includes(needle))
    .slice(0, 2)
    .map((article) => ({ kind: "title" as const, label: article.title || "无标题文章", article }));

  const matchingTags = Array.from(new Set(articles.flatMap(getTags)))
    .filter((tag) => tag.toLocaleLowerCase().includes(needle))
    .slice(0, 2)
    .map((tag) => ({ kind: "tag" as const, label: `#${tag}`, tag }));

  const contentMatches = articles
    .filter((article) => getExcerpt(article.content, 10000).toLocaleLowerCase().includes(needle))
    .slice(0, 2)
    .map((article) => {
      const excerpt = getExcerpt(article.content, 10000);
      const matchAt = excerpt.toLocaleLowerCase().indexOf(needle);
      const start = Math.max(0, matchAt - 12);
      return { kind: "content" as const, label: `${start ? "…" : ""}${excerpt.slice(start, start + 32)}…`, article };
    });

  return [...titleMatches, ...matchingTags, ...contentMatches].slice(0, 5);
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

function ArticleCard({ article, featured }: { article: Article; featured: boolean }) {
  const image = getFirstImage(article.content);
  const tags = getTags(article).slice(0, 3);
  const href = getOwnedPostDestination({
    id: article.id,
    slug: article.slug || "",
    type: "article",
    status: article.status,
  });

  return (
    <Link href={href} className={`${styles.articleCard} ${featured ? styles.featuredCard : styles.shortCard} ${image ? styles.hasImage : ""}`}>
      <div className={styles.cardText}>
        <p className={`${styles.cardStatus} ${article.status === "draft" ? styles.draftStatus : ""}`}>{article.status === "draft" ? "草稿" : "已发布"} · {visibilityLabel(article.visibility)}</p>
        <h3>{article.title || "无标题文章"}</h3>
        <p className={styles.excerpt}>{getExcerpt(article.content) || "这篇文章还没有写下内容。"}</p>
        {tags.length > 0 && (
          <div className={styles.tagList}>
            {tags.map((tag) => <span key={tag} className={styles.tag}>#{tag}</span>)}
          </div>
        )}
        <div className={styles.cardFooter}>
          <span>{article.status === "draft" ? "最后编辑" : "发布于"} · {new Date(articleDate(article)).toLocaleDateString("zh-CN")}</span>
          <strong>{article.status === "draft" ? "续写" : "翻开"} →</strong>
        </div>
      </div>
      {image && (
        // Images are resident-authored Markdown URLs, not a fixed set of configured hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.cardImage} src={image} alt="" />
      )}
    </Link>
  );
}

export default function ModernArticlesClient() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [mobileArchiveOpen, setMobileArchiveOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function fetchArticles() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        router.push("/");
        return;
      }

      const { data, error } = await supabase
        .from("posts")
        .select("id, title, slug, content, status, visibility, published_at, created_at, tags")
        .eq("author_id", user.id)
        .eq("type", "article")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (!active) return;
      if (error) setMessage(error.message);
      else setArticles((data || []) as Article[]);
      setLoading(false);
    }

    void fetchArticles();
    return () => { active = false; };
  }, [router]);

  const counts = {
    all: articles.length,
    published: articles.filter((article) => article.status === "published").length,
    draft: articles.filter((article) => article.status === "draft").length,
  };

  const months = new Map<string, number>();
  articles.forEach((article) => {
    const month = dateKey(articleDate(article)).slice(0, 7);
    months.set(month, (months.get(month) || 0) + 1);
  });
  const archiveMonths = Array.from(months.entries()).sort(([a], [b]) => b.localeCompare(a));
  const keyword = search.trim().toLocaleLowerCase();
  const suggestions = getSuggestions(articles, search);
  const filteredArticles = articles.filter((article) => {
    if (filter !== "all" && article.status !== filter) return false;
    const key = dateKey(articleDate(article));
    if (selectedMonth && !key.startsWith(selectedMonth)) return false;
    if (selectedDate && key !== selectedDate) return false;
    if (!keyword) return true;
    return (
      (article.title || "").toLocaleLowerCase().includes(keyword) ||
      (article.content || "").toLocaleLowerCase().includes(keyword) ||
      (article.tags || "").toLocaleLowerCase().includes(keyword)
    );
  });
  const pageCount = Math.ceil(filteredArticles.length / 5);
  const visibleArticles = filteredArticles.slice((page - 1) * 5, page * 5);

  function chooseFilter(next: Filter) {
    setFilter(next);
    setPage(1);
    setSearchOpen(false);
  }

  function chooseMonth(month: string) {
    setSelectedMonth(month);
    setSelectedDate("");
    setPage(1);
    setSearchOpen(false);
  }

  return (
    <main data-moon-scene data-nav-scene="articles" className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.scene} role="img" aria-label="阳光下的小镇街景" />
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>MY ARTICLES / 个人文章</p>
            <h1>我的文章</h1>
            <p className={styles.subtitle}>把想法和故事，写成值得慢慢读的篇章。</p>
          </div>
          <Link href="/articles/new" className={styles.writeButton}>
            <PenLine size={16} aria-hidden="true" />写文章
          </Link>
        </header>
        <div className={styles.sectionLine} />

        <div className={styles.workspace}>
          <aside className={styles.sidebar} aria-label="查找文章">
            <p className={styles.sectionIndex}>01 / 文章索引</p>
            <p className={styles.sectionHint}>从标题、标签或月份，找到想重读的篇章。</p>
            <div className={styles.searchField}>
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                aria-label="搜索标题、内容或标签"
                placeholder="搜索标题、内容或标签"
                value={search}
                onFocus={() => { if (search.trim()) setSearchOpen(true); }}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setSearchOpen(Boolean(event.target.value.trim()));
                  setPage(1);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setSearchOpen(false);
                  if (event.key === "Enter") {
                    setSearchOpen(false);
                    document.getElementById("article-results")?.scrollIntoView({ block: "start" });
                  }
                }}
              />
              {search && (
                <button type="button" aria-label="清除搜索" onClick={() => { setSearch(""); setSearchOpen(false); setPage(1); }}>
                  <X size={15} aria-hidden="true" />
                </button>
              )}
            </div>

            {keyword && searchOpen && (
              <section className={styles.suggestions} aria-label="即时搜索结果">
                <div className={styles.suggestionHeading}><strong>相关结果</strong><span>{suggestions.length} 条建议</span></div>
                {suggestions.length === 0 ? (
                  <p className={styles.noSuggestions}>没有找到相关标题、标签或内容。</p>
                ) : (
                  <div className={styles.suggestionList}>
                    {suggestions.map((item, index) => {
                      const content = <><span className={`${styles.suggestionType} ${styles[`suggestionType${item.kind}`]}`}>{item.kind === "title" ? "标题" : item.kind === "tag" ? "标签" : "内容"}</span><span className={styles.suggestionLabel}>{item.label}</span></>;
                      return item.kind === "tag" ? (
                        <button key={`tag-${item.tag}`} type="button" className={styles.suggestionItem} onClick={() => { setSearch(item.tag); setSearchOpen(false); setPage(1); }}>{content}</button>
                      ) : (
                        <Link key={`${item.kind}-${item.article.id}-${index}`} className={styles.suggestionItem} href={getOwnedPostDestination({ id: item.article.id, slug: item.article.slug || "", type: "article", status: item.article.status })}>{content}</Link>
                      );
                    })}
                  </div>
                )}
                <button type="button" className={styles.allResults} onClick={() => { setSearchOpen(false); document.getElementById("article-results")?.scrollIntoView({ block: "start" }); }}>
                  查看全部搜索结果 →
                </button>
              </section>
            )}

            <section className={styles.archivePanel} aria-label="按月份回看文章">
              <PixelCorners />
              <h2>按月份回看</h2>
              <button type="button" className={styles.mobileArchiveToggle} aria-expanded={mobileArchiveOpen} aria-controls="article-archive-content" onClick={() => setMobileArchiveOpen((open) => !open)}>
                {selectedDate || selectedMonth || "选择月份或日期"}<span aria-hidden="true">{mobileArchiveOpen ? "收起 ↑" : "展开 ↓"}</span>
              </button>
              <div id="article-archive-content" className={`${styles.archiveContent} ${mobileArchiveOpen ? styles.mobileArchiveOpen : ""}`}>
              <button type="button" aria-pressed={!selectedMonth && !selectedDate} className={`${styles.archiveAll} ${!selectedMonth && !selectedDate ? styles.archiveActive : ""}`} onClick={() => chooseMonth("")}>
                <span>全部时间</span><span>{articles.length} 篇</span>
              </button>
              <div className={styles.archiveMonths}>
                {archiveMonths.map(([month, count], index) => {
                  const year = month.slice(0, 4);
                  const previousYear = archiveMonths[index - 1]?.[0].slice(0, 4);
                  return (
                    <div key={month}>
                      {year !== previousYear && <p className={styles.archiveYear}>{year} 年</p>}
                      <button type="button" aria-pressed={selectedMonth === month} className={`${styles.archiveMonth} ${selectedMonth === month ? styles.archiveActive : ""}`} onClick={() => chooseMonth(month)}>
                        <span>{Number(month.slice(5))} 月</span><span>{count} 篇</span>
                      </button>
                    </div>
                  );
                })}
              </div>
              <label className={styles.datePicker}>
                <CalendarDays size={15} aria-hidden="true" />
                <span>选择具体日期</span>
                <input type="date" aria-label="选择具体日期" value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value); setSelectedMonth(""); setPage(1); }} />
              </label>
              {selectedDate && <button type="button" className={styles.clearDate} onClick={() => setSelectedDate("")}>清除日期</button>}
              </div>
            </section>
          </aside>

          <section className={styles.entries} aria-label="我的文章列表">
            <div className={styles.filters} aria-label="文章状态筛选">
              {(["all", "published", "draft"] as const).map((key) => (
                <button key={key} type="button" aria-pressed={filter === key} className={`${styles.filterButton} ${filter === key ? styles.activeFilter : ""}`} onClick={() => chooseFilter(key)}>
                  {key === "all" ? "全部" : key === "published" ? "已发布" : "草稿"} <span>{counts[key]}</span>
                </button>
              ))}
            </div>
            <div className={styles.listHeading} id="article-results">
              <h2>{keyword ? "搜索结果" : "文章目录"}</h2>
              <span>{filteredArticles.length} 篇文章</span>
            </div>

            {message && <p role="alert" className={styles.message}>{message}</p>}
            {loading ? (
              <p role="status" className={styles.empty}>正在打开你的文章...</p>
            ) : filteredArticles.length === 0 ? (
              <div className={styles.empty}>
                <p>{keyword || selectedMonth || selectedDate || filter !== "all" ? "没有找到符合条件的文章。" : "这里还没有文章。"}</p>
                <Link href="/articles/new">写第一篇文章 →</Link>
              </div>
            ) : (
              <>
                <div className={styles.articleGrid}>
                  {visibleArticles.map((article, index) => <ArticleCard key={article.id} article={article} featured={index === 0} />)}
                </div>
                {pageCount > 1 && (
                  <nav className={styles.pagination} aria-label="文章分页">
                    <button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>← 上一页</button>
                    <span>第 {page} / {pageCount} 页</span>
                    <button type="button" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>下一页 →</button>
                  </nav>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
