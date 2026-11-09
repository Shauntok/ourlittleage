import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ModernArticlesClient from "./ModernArticlesClient";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  is: vi.fn(),
  order: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
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

const articles = Array.from({ length: 7 }, (_, index) => ({
  id: index + 1,
  title: index === 0 ? "旅行中的一页" : `文章 ${index + 1}`,
  slug: `story-${index + 1}`,
  status: index === 1 ? "draft" : "published",
  visibility: index === 1 ? "private" : "public",
  content: index === 2 ? "这段旅程让我记得很久" : `正文 ${index + 1}`,
  tags: index === 3 ? "旅行,生活" : null,
  created_at: index === 6 ? "2026-09-12T12:00:00.000Z" : `2026-10-${String(18 - index).padStart(2, "0")}T12:00:00.000Z`,
  published_at: index === 1 ? null : index === 6 ? "2026-09-12T12:00:00.000Z" : `2026-10-${String(18 - index).padStart(2, "0")}T12:00:00.000Z`,
}));

describe("ModernArticlesClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "resident-a" } } });
    mocks.order.mockResolvedValue({ data: articles, error: null });
  });

  it("keeps deleted posts out and routes the draft to its editor", async () => {
    const { container } = render(<ModernArticlesClient />);
    await waitFor(() => expect(mocks.is).toHaveBeenCalledWith("deleted_at", null));
    expect(container.querySelector('a[href="/articles/edit/2"]')).not.toBeNull();
    expect(container.querySelector('a[href="/articles/story-1"]')).not.toBeNull();
  });

  it("shows five cards per page and restarts the layout on the next page", async () => {
    render(<ModernArticlesClient />);
    const list = await screen.findByRole("region", { name: "我的文章列表" });
    await waitFor(() => expect(within(list).getAllByRole("link")).toHaveLength(5));
    expect(within(list).getByRole("navigation", { name: "文章分页" })).not.toBeNull();

    fireEvent.click(within(list).getByRole("button", { name: "下一页 →" }));
    expect(within(list).getAllByRole("link")).toHaveLength(2);
    expect(within(list).getByText("第 2 / 2 页")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /草稿 1/ }));
    expect(within(list).getAllByRole("link")).toHaveLength(1);
    expect(within(list).queryByRole("navigation", { name: "文章分页" })).toBeNull();
  });

  it("opens mixed suggestions after one character and keeps the archive below them", async () => {
    render(<ModernArticlesClient />);
    await screen.findByText("旅行中的一页");
    fireEvent.change(screen.getByRole("searchbox", { name: "搜索标题、内容或标签" }), { target: { value: "旅" } });

    const suggestions = screen.getByRole("region", { name: "即时搜索结果" });
    const archive = screen.getByRole("region", { name: "按月份回看文章" });
    expect(within(suggestions).getByText("标题")).not.toBeNull();
    expect(within(suggestions).getByText("标签")).not.toBeNull();
    expect(within(suggestions).getByText("内容")).not.toBeNull();
    expect(Boolean(suggestions.compareDocumentPosition(archive) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "清除搜索" }));
    expect(screen.queryByRole("region", { name: "即时搜索结果" })).toBeNull();
  });

  it("filters the archive by month without losing the all-time view", async () => {
    render(<ModernArticlesClient />);
    await screen.findByText("旅行中的一页");
    fireEvent.click(screen.getByRole("button", { name: /9 月\s*1 篇/ }));
    const list = screen.getByRole("region", { name: "我的文章列表" });
    expect(within(list).getAllByRole("link")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /全部时间\s*7 篇/ }));
    expect(within(list).getAllByRole("link")).toHaveLength(5);
  });
});
