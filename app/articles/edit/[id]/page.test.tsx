import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ArticleEditPage from "./page";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  single: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "84" }),
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/lib/supabase", () => {
  const query = {
    eq: vi.fn(),
    is: vi.fn(),
    single: mocks.single,
  };
  query.eq.mockReturnValue(query);
  query.is.mockReturnValue(query);

  return {
    supabase: {
      auth: { getUser: mocks.getUser },
      from: () => ({ select: () => query }),
    },
  };
});

describe("ArticleEditPage deleted URL handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "resident-a" } } });
    mocks.single.mockResolvedValue({ data: null, error: new Error("not found") });
  });

  it("sends unavailable or deleted owned content to trash without looping", async () => {
    render(<ArticleEditPage />);

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/trash"));
  });
});
