import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  is: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/components/diary/DiaryCalendarFilter", () => ({
  default: () => null,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          or: () => ({ is: mocks.is }),
        }),
      }),
    }),
  },
}));

describe("DiaryPage draft lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "resident-a" } } });
    mocks.is.mockResolvedValue({
      data: [
        {
          id: 1,
          slug: "diary-1",
          type: "diary",
          status: "draft",
          content: "还没有写完的一天",
          visibility: "private",
          created_at: "2026-09-13T12:00:00.000Z",
          published_at: null,
        },
      ],
      error: null,
    });
  });

  it("excludes deleted rows in the query and opens drafts in the editor", async () => {
    const { container } = render(<DiaryPage />);

    await waitFor(() => expect(mocks.is).toHaveBeenCalledWith("deleted_at", null));
    expect(container.querySelector('a[href="/diary/1/edit"]')).not.toBeNull();
  });
});

import DiaryPage from "./page";
