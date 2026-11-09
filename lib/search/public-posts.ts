import { supabase } from "@/lib/supabase";
import { articleTagPattern, uniqueArticleTags } from "@/lib/posts/tags";

export type SearchKind = "all" | "diary" | "article";

export type PublicSearchPost = {
  id: number;
  title: string;
  slug: string | null;
  content: string | null;
  tags: string | null;
  type: "diary" | "article";
  published_at: string | null;
  created_at: string;
  author_id: string | null;
  author: { username: string | null; avatar_url: string | null } | null;
};

export type PublicSearchPage = {
  posts: PublicSearchPost[];
  total: number;
};

export const SEARCH_PAGE_SIZE = 9;

const POST_FIELDS =
  "id,title,slug,content,tags,type,published_at,created_at,author_id";

export function normalizeSearchTerm(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function getPostHref(post: Pick<PublicSearchPost, "id" | "slug" | "type">) {
  if (post.type === "diary") return `/diary/${post.id}`;
  return post.slug ? `/articles/${encodeURIComponent(post.slug)}` : null;
}

export function getPostExcerpt(content: string | null) {
  return (content || "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/[#*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);
}

export function getMatchingTag(tags: string | null, term: string) {
  const needle = term.toLocaleLowerCase();
  if (!needle) return null;
  return uniqueArticleTags(tags).find((tag) => tag.toLocaleLowerCase().includes(needle)) || null;
}

async function withAuthors(rawPosts: Omit<PublicSearchPost, "author">[], signal: AbortSignal): Promise<PublicSearchPost[]> {
  const authorIds = Array.from(new Set(rawPosts.map((post) => post.author_id).filter((id): id is string => Boolean(id))));
  if (!authorIds.length) return rawPosts.map((post) => ({ ...post, author: null }));
  const { data, error } = await supabase.from("profiles")
    .select("id,username,avatar_url")
    .in("id", authorIds)
    .abortSignal(signal);
  if (error) throw error;
  const authors = new Map((data || []).map((profile) => [profile.id, profile]));
  return rawPosts.map((post) => ({ ...post, author: post.author_id ? authors.get(post.author_id) || null : null }));
}

function publicPosts(kind: SearchKind, countOnly = false, tag = "") {
  let query = supabase
    .from("posts")
    .select(POST_FIELDS, { count: "exact", head: countOnly })
    .eq("status", "published")
    .eq("visibility", "public")
    .is("deleted_at", null);

  query = kind === "all" && !tag
    ? query.in("type", ["diary", "article"])
    : query.eq("type", tag ? "article" : kind);

  if (tag) query = query.filter("tags", "imatch", articleTagPattern(tag));

  return query;
}

export async function searchPublicPosts({
  term,
  kind,
  page,
  tag = "",
  signal,
}: {
  term: string;
  kind: SearchKind;
  page: number;
  tag?: string;
  signal?: AbortSignal;
}): Promise<PublicSearchPage> {
  const normalized = normalizeSearchTerm(term);
  const selectedTag = Array.from(tag.trim()).slice(0, 20).join("");
  if (!normalized && !selectedTag) return { posts: [], total: 0 };

  const requestSignal = signal || new AbortController().signal;
  const safePage = Math.max(1, Math.floor(page) || 1);
  const offset = (safePage - 1) * SEARCH_PAGE_SIZE;

  if (!normalized) {
    const { data, count, error } = await publicPosts("article", false, selectedTag)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + SEARCH_PAGE_SIZE - 1)
      .abortSignal(requestSignal);
    if (error) throw error;
    const rawPosts = (data || []) as Omit<PublicSearchPost, "author">[];
    return { total: count || 0, posts: await withAuthors(rawPosts, requestSignal) };
  }

  const pattern = `%${normalized}%`;
  const secondaryFilter = `content.ilike.${pattern},tags.ilike.${pattern}`;

  // Title hits form the first tier. Body/tag hits form the second tier, so
  // pagination stays stable without downloading the whole public catalogue.
  const [titleCountResult, secondaryCountResult] = await Promise.all([
    publicPosts(kind, true, selectedTag).ilike("title", pattern).abortSignal(requestSignal),
    publicPosts(kind, true, selectedTag)
      .or(secondaryFilter)
      .not("title", "ilike", pattern)
      .abortSignal(requestSignal),
  ]);

  if (titleCountResult.error) throw titleCountResult.error;
  if (secondaryCountResult.error) throw secondaryCountResult.error;

  const titleCount = titleCountResult.count || 0;
  const secondaryCount = secondaryCountResult.count || 0;
  const titleStart = Math.min(offset, titleCount);
  const titleEnd = Math.min(offset + SEARCH_PAGE_SIZE, titleCount) - 1;
  const titleSlots = Math.max(0, titleEnd - titleStart + 1);
  const secondaryStart = Math.max(0, offset - titleCount);
  const secondarySlots = SEARCH_PAGE_SIZE - titleSlots;

  const [titleResult, secondaryResult] = await Promise.all([
    titleSlots
      ? publicPosts(kind, false, selectedTag)
          .ilike("title", pattern)
          .order("published_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .range(titleStart, titleEnd)
          .abortSignal(requestSignal)
      : Promise.resolve({ data: [], error: null }),
    secondarySlots && secondaryStart < secondaryCount
      ? publicPosts(kind, false, selectedTag)
          .or(secondaryFilter)
          .not("title", "ilike", pattern)
          .order("published_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .range(secondaryStart, secondaryStart + secondarySlots - 1)
          .abortSignal(requestSignal)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (titleResult.error) throw titleResult.error;
  if (secondaryResult.error) throw secondaryResult.error;

  const rawPosts = [
    ...(titleResult.data || []),
    ...(secondaryResult.data || []),
  ] as Omit<PublicSearchPost, "author">[];
  return {
    total: titleCount + secondaryCount,
    posts: await withAuthors(rawPosts, requestSignal),
  };
}
