import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPostExcerpt, getPostHref, normalizeSearchTerm, searchPublicPosts } from "./public-posts";

const from = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase", () => ({ supabase: { from } }));

type Row = {
  id: number;
  title: string;
  slug: string | null;
  content: string;
  tags: string | null;
  type: string;
  status: string;
  visibility: string;
  deleted_at: string | null;
  published_at: string;
  created_at: string;
  author_id: string;
};

function row(id: number, changes: Partial<Row> = {}): Row {
  return {
    id,
    title: `故事 ${id}`,
    slug: `story-${id}`,
    content: "没有关键词",
    tags: null,
    type: "article",
    status: "published",
    visibility: "public",
    deleted_at: null,
    published_at: `2026-10-${String(id).padStart(2, "0")}T00:00:00Z`,
    created_at: `2026-10-${String(id).padStart(2, "0")}T00:00:00Z`,
    author_id: "resident-1",
    ...changes,
  };
}

function mockSearch(rows: Row[]) {
  from.mockImplementation((table: string) => {
    const filters: ((item: Row) => boolean)[] = [];
    let start = 0;
    let end = rows.length;
    const builder = {
      select: () => builder,
      eq: (field: keyof Row, value: string) => { filters.push((item) => item[field] === value); return builder; },
      is: (field: keyof Row, value: null) => { filters.push((item) => item[field] === value); return builder; },
      in: (field: keyof Row, values: string[]) => { filters.push((item) => values.includes(String(item[field]))); return builder; },
      ilike: (field: keyof Row, pattern: string) => { filters.push((item) => String(item[field] || "").toLowerCase().includes(pattern.slice(1, -1).toLowerCase())); return builder; },
      not: (field: keyof Row, _operator: string, pattern: string) => { filters.push((item) => !String(item[field] || "").toLowerCase().includes(pattern.slice(1, -1).toLowerCase())); return builder; },
      or: (value: string) => { const term = value.split(",")[0].split("%")?.[1] || ""; filters.push((item) => `${item.content} ${item.tags || ""}`.toLowerCase().includes(term.toLowerCase())); return builder; },
      order: () => builder,
      range: (first: number, last: number) => { start = first; end = last; return builder; },
      abortSignal: async () => {
        if (table === "profiles") return { data: [{ id: "resident-1", username: "小满", avatar_url: null }], error: null };
        const filtered = rows.filter((item) => filters.every((filter) => filter(item))).sort((a, b) => b.published_at.localeCompare(a.published_at));
        return { data: filtered.slice(start, end + 1), count: filtered.length, error: null };
      },
    };
    return builder;
  });
}

beforeEach(() => from.mockReset());

describe("public post search", () => {
  it("keeps private, unlisted, draft and deleted content out of global results", async () => {
    mockSearch([
      row(1, { title: "花园日记", type: "diary" }),
      row(2, { title: "普通故事", content: "走过花园" }),
      row(3, { title: "花园草稿", status: "draft" }),
      row(4, { title: "花园私密", visibility: "private" }),
      row(5, { title: "花园未列出", visibility: "unlisted" }),
      row(6, { title: "花园回收", deleted_at: "2026-10-20" }),
    ]);

    const result = await searchPublicPosts({ term: "花园", kind: "all", page: 1 });
    expect(result.total).toBe(2);
    expect(result.posts.map((post) => post.id)).toEqual([1, 2]);
    expect(result.posts[0].author?.username).toBe("小满");
  });

  it("fills the second page with body hits after title hits", async () => {
    mockSearch([
      ...Array.from({ length: 10 }, (_, index) => row(index + 1, { title: `花园 ${index + 1}` })),
      row(11, { content: "花园里的风" }),
      row(12, { tags: "花园,记忆" }),
    ]);

    const result = await searchPublicPosts({ term: "花园", kind: "all", page: 2 });
    expect(result.total).toBe(12);
    expect(result.posts.map((post) => post.id)).toEqual([1, 12, 11]);
  });

  it("uses the correct route for each post type", () => {
    expect(getPostHref({ id: 42, type: "diary", slug: "ignored" })).toBe("/diary/42");
    expect(getPostHref({ id: 42, type: "article", slug: "spring-day" })).toBe("/articles/spring-day");
    expect(getPostHref({ id: 42, type: "article", slug: null })).toBeNull();
  });

  it("normalizes search input and removes markdown image syntax from snippets", () => {
    expect(normalizeSearchTerm("  花园,(秋天)  ")).toBe("花园 秋天");
    expect(getPostExcerpt("![封面](https://example.com/a.png) 走进[庭院](/space)" )).toBe("走进庭院");
  });
});
