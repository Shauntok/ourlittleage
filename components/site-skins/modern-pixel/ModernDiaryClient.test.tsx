import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ModernDiaryClient from "./ModernDiaryClient";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  is: vi.fn(),
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
        eq: () => ({ or: () => ({ is: mocks.is }) }),
      }),
    }),
  },
}));

describe("ModernDiaryClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "resident-a" } } });
    mocks.is.mockResolvedValue({
      data: [
        {
          id: 1,
          slug: null,
          status: "draft",
          visibility: "private",
          content: "还没有写完的一天",
          created_at: "2026-10-18T12:00:00.000Z",
          published_at: null,
          edit_count: 0,
        },
        {
          id: 2,
          slug: null,
          status: "published",
          visibility: "public",
          content: "今天走过街角的花店",
          created_at: "2026-10-17T12:00:00.000Z",
          published_at: "2026-10-17T12:00:00.000Z",
          edit_count: 0,
        },
      ],
      error: null,
    });
  });

  it("keeps deleted posts out and routes drafts to the editor", async () => {
    const { container } = render(<ModernDiaryClient />);
    await waitFor(() => expect(mocks.is).toHaveBeenCalledWith("deleted_at", null));
    expect(container.querySelector('a[href="/diary/1/edit"]')).not.toBeNull();
    expect(container.querySelector('a[href="/diary/2"]')).not.toBeNull();
  });

  it("filters by status and recorded calendar day", async () => {
    const { container } = render(<ModernDiaryClient />);
    await screen.findByText("今天走过街角的花店");

    fireEvent.click(screen.getByRole("button", { name: /草稿 1/ }));
    expect(container.querySelector('a[href="/diary/2"]')).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /全部 2/ }));
    expect(screen.getByText("2026 年 10 月")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /2026年10月18日，有日记/ }));
    expect(container.querySelector('a[href="/diary/1/edit"]')).not.toBeNull();
    expect(container.querySelector('a[href="/diary/2"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "清除筛选" }));
    expect(container.querySelector('a[href="/diary/2"]')).not.toBeNull();
  });
});
