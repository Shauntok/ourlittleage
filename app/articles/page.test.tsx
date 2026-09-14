import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  is: vi.fn(),
  order: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            is: (...args: unknown[]) => {
              mocks.is(...args);
              return { order: mocks.order };
            },
          }),
        }),
      }),
    }),
  },
}));

describe("ArticlesPage draft lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "resident-a" } } });
    mocks.order.mockResolvedValue({
      data: [
        {
          id: 2,
          slug: "unfinished-story",
          type: "article",
          status: "draft",
          title: "还没写完的故事",
          content: "慢慢写",
          tags: null,
          visibility: "private",
          created_at: "2026-09-13T12:00:00.000Z",
          published_at: null,
        },
      ],
      error: null,
    });
  });

  it("excludes deleted rows in the query and opens drafts in the editor", async () => {
    const { container } = render(<ArticlesPage />);

    await waitFor(() => expect(mocks.is).toHaveBeenCalledWith("deleted_at", null));
    expect(container.querySelector('a[href="/articles/edit/2"]')).not.toBeNull();
  });
});

import ArticlesPage from "./page";
