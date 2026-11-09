"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Search, UserRound, X } from "lucide-react";
import { getMatchingTag, getPostExcerpt, getPostHref, SEARCH_PAGE_SIZE, type PublicSearchPost, type SearchKind } from "@/lib/search/public-posts";
import { usePublicSearch } from "./usePublicSearch";
import { uniqueArticleTags } from "@/lib/posts/tags";

const kinds: { value: SearchKind; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "diary", label: "日记" },
  { value: "article", label: "文章" },
];

type Styles = Record<string, string>;

function AuthorAvatar({ post, styles }: { post: PublicSearchPost; styles: Styles }) {
  return post.author?.avatar_url ? (
    <Image
      src={post.author.avatar_url}
      alt=""
      width={44}
      height={44}
      unoptimized
      className={styles.avatar}
    />
  ) : (
    <span className={styles.avatarFallback} aria-hidden="true"><UserRound size={19} /></span>
  );
}

function Result({ post, styles, featured }: { post: PublicSearchPost; styles: Styles; featured: boolean }) {
  const href = getPostHref(post);
  const excerpt = getPostExcerpt(post.content);
  const date = post.published_at || post.created_at;
  const firstTag = post.type === "article" ? uniqueArticleTags(post.tags)[0] : null;
  const body = (
    <>
      <div className={styles.resultMeta}>
        <span className={styles.type}>{post.type === "diary" ? "日记" : "文章"}</span>
        <span>{new Date(date).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}</span>
      </div>
      <h2>{post.title || (post.type === "diary" ? "一篇日记" : "一篇文章")}</h2>
      {excerpt && <p className={styles.excerpt}>{excerpt}</p>}
      <div className={styles.resultFooter}>
        <span className={styles.author}><AuthorAvatar post={post} styles={styles} />{post.author?.username || "居民"}</span>
        {firstTag && <span className={styles.tag}>{firstTag}</span>}
      </div>
    </>
  );

  const className = `${styles.result} ${featured ? styles.featured : ""}`;
  return href ? <Link className={className} href={href}>{body}</Link> : <article className={className}>{body}</article>;
}

export default function SearchView({ styles, variant }: { styles: Styles; variant: "modern" | "classic" }) {
  const search = usePublicSearch();
  const { data, term, query, tag, loading, error, page, kind, suggestionsOpen } = search;
  const showSuggestions = Boolean(term && suggestionsOpen && !loading && !error && data.posts.length);
  const suggestedPosts = data.posts.slice(0, 2).filter((post) => getPostHref(post));
  const suggestedTag = data.posts.filter((post) => post.type === "article").map((post) => getMatchingTag(post.tags, term)).find(Boolean);
  const relatedTags = Array.from(new Set(data.posts
    .filter((post) => post.type === "article")
    .flatMap((post) => uniqueArticleTags(post.tags))
    .filter((item) => item.toLocaleLowerCase().includes(term.toLocaleLowerCase())))).slice(0, 5);
  const pageCount = Math.ceil(data.total / SEARCH_PAGE_SIZE);

  return (
    <main data-moon-scene={variant === "modern" ? "" : undefined} data-nav-scene={variant === "modern" ? "search" : undefined} className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>{variant === "modern" ? "街区索引 / SEARCH" : "SEARCH / 街区索引"}</p>
          <h1>{variant === "modern" ? "寻找街区里的故事" : "在这里找一段故事"}</h1>
          <p className={styles.subtitle}>搜索公开的日记与文章</p>
        </header>

        <div className={styles.searchArea}>
          <form className={styles.searchBox} role="search" onSubmit={(event) => { event.preventDefault(); search.setSuggestionsOpen(false); }}>
            <Search size={21} aria-hidden="true" />
            <input
              type="search"
              aria-label="搜索公开的日记与文章"
              value={query}
              onChange={(event) => search.changeQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Escape") search.setSuggestionsOpen(false); }}
              placeholder="输入一个词，寻找街区里的故事"
              autoComplete="off"
            />
            {query && <button type="button" className={styles.clear} aria-label="清除搜索" onClick={() => search.changeQuery("")}><X size={18} /></button>}
          </form>

          {showSuggestions && (
            <div id="public-search-suggestions" className={styles.suggestions}>
              {suggestedPosts.map((post) => (
                <Link key={post.id} href={getPostHref(post)!} className={styles.suggestion}>
                  <span className={styles.suggestionType}>{post.type === "diary" ? "日记" : "文章"}</span>
                  <span>{post.title}</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              ))}
              {suggestedTag && <button type="button" className={styles.suggestion} onClick={() => search.changeTag(suggestedTag)}><span className={styles.suggestionType}>标签</span><span>{suggestedTag}</span><ArrowRight size={15} aria-hidden="true" /></button>}
            </div>
          )}

          {(tag || (term && relatedTags.length > 0)) && (
            <div className={styles.tagSection} aria-label="文章标签筛选">
              <span className={styles.tagLabel}>文章标签</span>
              <div className={styles.tagChips}>
                {tag ? <button type="button" className={`${styles.tagChip} ${styles.tagChipActive}`} aria-pressed="true" onClick={() => search.changeTag("")}>#{tag} <X size={13} aria-hidden="true" /></button> : relatedTags.map((item) => (
                  <button key={item} type="button" className={styles.tagChip} aria-pressed="false" onClick={() => search.changeTag(item)}>#{item}</button>
                ))}
              </div>
              {tag && <button type="button" className={styles.tagClear} onClick={() => search.changeTag("")}>清除标签</button>}
            </div>
          )}
        </div>

        <section className={styles.results} aria-label="搜索结果">
          <div className={styles.resultToolbar}>
            <div className={styles.tabs} role="group" aria-label="内容类型">
              {kinds.map((item) => (
                <button key={item.value} type="button" className={`${styles.tab} ${kind === item.value ? styles.activeTab : ""}`} aria-pressed={kind === item.value} onClick={() => search.changeKind(item.value)}>{item.label}</button>
              ))}
            </div>
            {(term || tag) && !loading && !error && <span className={styles.count} role="status">找到 {data.total} 则故事</span>}
          </div>

          {loading ? (
            <p className={styles.state} role="status">正在寻找...</p>
          ) : error ? (
            <div className={styles.state}><p>暂时无法读取搜索结果。</p><button type="button" onClick={search.retry}>重新试试</button></div>
          ) : !term && !tag ? (
            <div className={styles.state}>从一个词开始，看看街区留下了什么。</div>
          ) : data.posts.length === 0 ? (
            <div className={styles.state}>暂时没有找到相关的故事。</div>
          ) : (
            <>
              <div className={styles.resultList}>
                {data.posts.map((post, index) => <Result key={post.id} post={post} styles={styles} featured={variant === "modern" && index === 0} />)}
              </div>
              {pageCount > 1 && (
                <nav className={styles.pagination} aria-label="搜索结果分页">
                  <button type="button" disabled={page === 1} onClick={() => search.changePage(page - 1)} aria-label="上一页"><ArrowLeft size={17} /></button>
                  <span>{page} / {pageCount}</span>
                  <button type="button" disabled={page === pageCount} onClick={() => search.changePage(page + 1)} aria-label="下一页"><ArrowRight size={17} /></button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
