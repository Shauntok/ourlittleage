import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getUser: vi.fn(),
  softDeleteOwnedPost: vi.fn(),
  restoreOwnedPost: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

vi.mock("@/lib/server/postTrash", () => ({
  softDeleteOwnedPost: mocks.softDeleteOwnedPost,
  restoreOwnedPost: mocks.restoreOwnedPost,
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { restorePost, trashPost } from "./trash";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createSupabaseServerClient.mockResolvedValue({
    auth: { getUser: mocks.getUser },
  });
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "resident-a" } },
    error: null,
  });
  mocks.softDeleteOwnedPost.mockResolvedValue({
    id: 12,
    type: "article",
    status: "draft",
  });
  mocks.restoreOwnedPost.mockResolvedValue({
    id: 12,
    type: "article",
    status: "draft",
  });
});

describe("trash server actions", () => {
  it("takes the actor identity from the server session when deleting", async () => {
    await expect(trashPost(12)).resolves.toEqual({ ok: true });

    expect(mocks.softDeleteOwnedPost).toHaveBeenCalledWith(
      expect.anything(),
      "resident-a",
      12,
      expect.any(Date)
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/trash");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/articles");
  });

  it("takes the actor identity from the server session when restoring", async () => {
    await expect(restorePost(12)).resolves.toEqual({ ok: true });

    expect(mocks.restoreOwnedPost).toHaveBeenCalledWith(
      expect.anything(),
      "resident-a",
      12,
      expect.any(Date)
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/trash");
  });

  it("rejects unauthenticated changes", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(trashPost(12)).resolves.toEqual({
      ok: false,
      error: "请先登录。",
    });
    expect(mocks.softDeleteOwnedPost).not.toHaveBeenCalled();
  });

  it("rejects malformed post ids before touching the database", async () => {
    await expect(restorePost(-1)).resolves.toEqual({
      ok: false,
      error: "这份内容暂时无法处理。",
    });
    expect(mocks.restoreOwnedPost).not.toHaveBeenCalled();
  });
});
