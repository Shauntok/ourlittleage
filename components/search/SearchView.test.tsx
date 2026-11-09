import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ModernSearchClient from "@/components/site-skins/modern-pixel/ModernSearchClient";
import ClassicSearchClient from "@/components/room-skins/classic/ClassicSearchClient";

const usePublicSearch = vi.hoisted(() => vi.fn());
vi.mock("./usePublicSearch", () => ({ usePublicSearch }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

function searchState(changes: Record<string, unknown> = {}) {
  return {
    query: "花园",
    term: "花园",
    kind: "all",
    page: 1,
    data: {
      total: 2,
      posts: [
        { id: 11, type: "diary", title: "花园日记", slug: null, content: "今天走过庭院", tags: null, published_at: "2026-10-21", created_at: "2026-10-21", author_id: null, author: null },
        { id: 12, type: "article", title: "花园故事", slug: "garden-story", content: "花园里的一封信", tags: "花园", published_at: "2026-10-20", created_at: "2026-10-20", author_id: null, author: null },
      ],
    },
    loading: false,
    error: false,
    suggestionsOpen: true,
    changeQuery: vi.fn(),
    changeKind: vi.fn(),
    changePage: vi.fn(),
    changeTag: vi.fn(),
    tag: "",
    setSuggestionsOpen: vi.fn(),
    retry: vi.fn(),
    ...changes,
  };
}

beforeEach(() => usePublicSearch.mockReset());

describe("search skins", () => {
  it("renders public results and suggestions in the modern pixel skin", () => {
    const state = searchState();
    usePublicSearch.mockReturnValue(state);
    render(<ModernSearchClient />);

    expect(screen.getByRole("heading", { name: "寻找街区里的故事" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /花园日记 今天走过庭院/ })).toHaveAttribute("href", "/diary/11");
    expect(screen.getByRole("link", { name: /花园故事 花园里的一封信/ })).toHaveAttribute("href", "/articles/garden-story");
    expect(screen.getByText("找到 2 则故事")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /标签花园/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "#花园" }));
    expect(state.changeTag).toHaveBeenCalledWith("花园");
    fireEvent.click(screen.getByRole("button", { name: "文章" }));
    expect(state.changeKind).toHaveBeenCalledWith("article");
  });

  it("shows the selected article tag with one-click clearing", () => {
    const state = searchState({ query: "", term: "", tag: "花园", kind: "article", suggestionsOpen: false,
      data: { total: 1, posts: [searchState().data.posts[1]] } });
    usePublicSearch.mockReturnValue(state);
    render(<ModernSearchClient />);
    expect(screen.getByRole("button", { name: "#花园" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: /花园故事 花园里的一封信/ })).toHaveAttribute("href", "/articles/garden-story");
    fireEvent.click(screen.getByRole("button", { name: "清除标签" }));
    expect(state.changeTag).toHaveBeenCalledWith("");
  });

  it("renders the separate glass design with the same content boundary", () => {
    usePublicSearch.mockReturnValue(searchState({ suggestionsOpen: false }));
    render(<ClassicSearchClient />);

    expect(screen.getByRole("heading", { name: "在这里找一段故事" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /花园日记 今天走过庭院/ })).toHaveAttribute("href", "/diary/11");
    expect(screen.queryByText("标签", { selector: "button span" })).not.toBeInTheDocument();
  });

  it.each([ModernSearchClient, ClassicSearchClient])("does not open suggestions just by focusing the search field", (Client) => {
    const state = searchState({ suggestionsOpen: false });
    usePublicSearch.mockReturnValue(state);
    render(<Client />);

    fireEvent.focus(screen.getByRole("searchbox", { name: "搜索公开的日记与文章" }));
    expect(state.setSuggestionsOpen).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /标签花园/ })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "搜索公开的日记与文章" }), { target: { value: "花" } });
    expect(state.changeQuery).toHaveBeenCalledWith("花");
  });

  it("keeps an empty search free of result cards when focused", () => {
    usePublicSearch.mockReturnValue(searchState({ query: "", term: "", data: { posts: [], total: 0 } }));
    render(<ModernSearchClient />);

    fireEvent.focus(screen.getByRole("searchbox", { name: "搜索公开的日记与文章" }));
    expect(screen.getByText("从一个词开始，看看街区留下了什么。")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /花园日记/ })).not.toBeInTheDocument();
  });
});
