import { beforeEach, describe, expect, it, vi } from "vitest";

const from = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase", () => ({ supabase: { from } }));

import { searchPublicPosts } from "./public-posts";

beforeEach(() => from.mockReset());

describe("public article tag search", () => {
  it("never requests posts for an empty query and no tag", async () => {
    expect(await searchPublicPosts({ term: "", kind: "all", page: 1 })).toEqual({ posts: [], total: 0 });
    expect(from).not.toHaveBeenCalled();
  });

  it("limits selected-tag results to published, public, non-deleted articles", async () => {
    const query = {
      select: vi.fn(), eq: vi.fn(), is: vi.fn(), filter: vi.fn(),
      order: vi.fn(), range: vi.fn(), abortSignal: vi.fn(),
    };
    for (const key of ["select", "eq", "is", "filter", "order", "range"] as const) {
      query[key].mockReturnValue(query);
    }
    query.abortSignal.mockResolvedValue({ data: [], count: 0, error: null });
    from.mockReturnValue(query);

    expect(await searchPublicPosts({ term: "", kind: "all", page: 1, tag: "生活" })).toEqual({ posts: [], total: 0 });
    expect(from).toHaveBeenCalledWith("posts");
    expect(query.eq).toHaveBeenCalledWith("status", "published");
    expect(query.eq).toHaveBeenCalledWith("visibility", "public");
    expect(query.eq).toHaveBeenCalledWith("type", "article");
    expect(query.is).toHaveBeenCalledWith("deleted_at", null);
    expect(query.filter).toHaveBeenCalledWith("tags", "imatch", "(^|[,，])[[:space:]]*生活[[:space:]]*([,，]|$)");
    expect(query.range).toHaveBeenCalledWith(0, 8);
  });
});
