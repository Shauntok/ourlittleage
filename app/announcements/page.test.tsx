import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AnnouncementsView from "@/components/AnnouncementsView";
import ModernAnnouncementsClient from "@/components/site-skins/modern-pixel/ModernAnnouncementsClient";

const notices = Array.from({ length: 8 }, (_, index) => ({
  id: `notice-${index + 1}`,
  title: `公告 ${index + 1}`,
  content: `第 ${index + 1} 则完整内容\n第二行`,
  created_at: `2026-10-${String(21 - index).padStart(2, "0")}T00:00:00Z`,
  published_at: `2026-10-${String(21 - index).padStart(2, "0")}T00:00:00Z`,
}));

const mocks = vi.hoisted(() => ({ queries: [] as Array<{ start: number; end: number; excluded: boolean; month: boolean }> }));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => {
      const state = { excluded: false, month: false };
      const query = {
        select: () => query,
        eq: () => query,
        not: () => { state.excluded = true; return query; },
        gte: () => { state.month = true; return query; },
        lt: () => query,
        order: () => query,
        range: async (start: number, end: number) => {
          mocks.queries.push({ start, end, ...state });
          const rows = state.excluded ? notices.slice(3) : notices;
          return { data: rows.slice(start, end + 1), count: rows.length, error: null };
        },
        then: (resolve: (result: unknown) => void) => resolve({ data: notices, error: null }),
      };
      return query;
    },
  },
}));

describe("announcements skins", () => {
  beforeEach(() => { mocks.queries.length = 0; });

  it("shows a featured paper and opens the paged archive within the board", async () => {
    const { container } = render(<ModernAnnouncementsClient />);

    expect(await screen.findByText("公告 1")).toBeInTheDocument();
    expect(container.querySelector('[data-announcements-skin="modern_pixel"]')).not.toBeNull();
    expect(screen.getByText("公告 2")).toBeInTheDocument();
    expect(screen.getByText("公告 3")).toBeInTheDocument();
    expect(mocks.queries[0]).toEqual({ start: 0, end: 2, excluded: false, month: false });

    fireEvent.click(screen.getByRole("button", { name: "往期公告" }));
    expect(await screen.findByText("公告 4")).toBeInTheDocument();
    expect(screen.getByText("公告 7")).toBeInTheDocument();
    expect(screen.queryByText("公告 8")).toBeNull();
    expect(mocks.queries[1]).toEqual({ start: 0, end: 3, excluded: true, month: false });

    fireEvent.click(screen.getByRole("button", { name: /较早/ }));
    expect(await screen.findByText("公告 8")).toBeInTheDocument();
    expect(mocks.queries[2]).toEqual({ start: 4, end: 7, excluded: true, month: false });

    fireEvent.click(screen.getByRole("button", { name: /公告 8/ }));
    expect(screen.getByText(/第 8 则完整内容/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "← 返回往期公告" }));
    expect(screen.getByText("第 2 / 2 页")).toBeInTheDocument();
  });

  it("filters archived notices by month and keeps the existing classic page", async () => {
    const { unmount } = render(<ModernAnnouncementsClient />);
    await screen.findByText("公告 1");
    fireEvent.click(screen.getByRole("button", { name: "往期公告" }));
    await screen.findByText("公告 4");
    fireEvent.change(screen.getByLabelText("按月份查看"), { target: { value: "2026-10" } });
    await waitFor(() => expect(mocks.queries.at(-1)?.month).toBe(true));
    unmount();

    const { container } = render(<AnnouncementsView />);
    expect(await screen.findByRole("heading", { name: "公告 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "世界公告" })).toBeInTheDocument();
    expect(container.querySelector('[data-announcements-skin="classic"]')).not.toBeNull();
  });
});
