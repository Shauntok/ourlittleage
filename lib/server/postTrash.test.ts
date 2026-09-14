import { describe, expect, it, vi } from "vitest";

import {
  cleanupExpiredDeletedPosts,
  listOwnedTrashPosts,
  restoreOwnedPost,
  softDeleteOwnedPost,
} from "./postTrash";

function makeQuery(result: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    is: vi.fn(),
    not: vi.fn(),
    gt: vi.fn(),
    lte: vi.fn(),
    order: vi.fn(),
    maybeSingle: vi.fn(),
  };

  for (const method of [
    query.select,
    query.eq,
    query.in,
    query.is,
    query.not,
    query.gt,
    query.lte,
  ]) {
    method.mockReturnValue(query);
  }
  query.order.mockResolvedValue(result);
  query.maybeSingle.mockResolvedValue(result);

  return query;
}

describe("post trash data access", () => {
  const now = new Date("2026-09-20T00:00:00.000Z");

  it("lists only the resident's retained deleted articles and diaries", async () => {
    const rows = [{ id: 7, type: "diary", deleted_at: "2026-09-19T00:00:00Z" }];
    const query = makeQuery({ data: rows, error: null });
    const client = { from: vi.fn(() => ({ select: query.select })) };

    await expect(
      listOwnedTrashPosts(client as never, "resident-a", now)
    ).resolves.toEqual(rows);

    expect(client.from).toHaveBeenCalledWith("posts");
    expect(query.eq).toHaveBeenCalledWith("author_id", "resident-a");
    expect(query.in).toHaveBeenCalledWith("type", ["diary", "article"]);
    expect(query.not).toHaveBeenCalledWith("deleted_at", "is", null);
    expect(query.gt).toHaveBeenCalledWith(
      "deleted_at",
      "2026-09-05T00:00:00.000Z"
    );
    expect(query.order).toHaveBeenCalledWith("deleted_at", {
      ascending: false,
    });
  });

  it("soft deletes only an owned active post using trusted server time", async () => {
    const row = { id: 8, type: "article", status: "draft" };
    const query = makeQuery({ data: row, error: null });
    const update = vi.fn(() => query);
    const client = { from: vi.fn(() => ({ update })) };

    await expect(
      softDeleteOwnedPost(client as never, "resident-a", 8, now)
    ).resolves.toEqual(row);

    expect(update).toHaveBeenCalledWith({
      deleted_at: "2026-09-20T00:00:00.000Z",
      deleted_by: "resident-a",
      delete_reason: "author_soft_delete",
      edited_at: "2026-09-20T00:00:00.000Z",
    });
    expect(query.eq).toHaveBeenCalledWith("id", 8);
    expect(query.eq).toHaveBeenCalledWith("author_id", "resident-a");
    expect(query.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("restores only an owned post still inside the retention window", async () => {
    const row = { id: 9, type: "diary", status: "published" };
    const query = makeQuery({ data: row, error: null });
    const update = vi.fn(() => query);
    const client = { from: vi.fn(() => ({ update })) };

    await expect(
      restoreOwnedPost(client as never, "resident-a", 9, now)
    ).resolves.toEqual(row);

    expect(update).toHaveBeenCalledWith({
      deleted_at: null,
      deleted_by: null,
      delete_reason: null,
      edited_at: "2026-09-20T00:00:00.000Z",
    });
    expect(query.eq).toHaveBeenCalledWith("author_id", "resident-a");
    expect(query.gt).toHaveBeenCalledWith(
      "deleted_at",
      "2026-09-05T00:00:00.000Z"
    );
  });

  it("hard deletes only eligible article and diary rows", async () => {
    const query = makeQuery({ count: 3, error: null });
    query.lte.mockResolvedValue({ count: 3, error: null });
    const remove = vi.fn(() => query);
    const client = { from: vi.fn(() => ({ delete: remove })) };

    await expect(
      cleanupExpiredDeletedPosts(client as never, now)
    ).resolves.toBe(3);

    expect(remove).toHaveBeenCalledWith({ count: "exact" });
    expect(query.in).toHaveBeenCalledWith("type", ["diary", "article"]);
    expect(query.not).toHaveBeenCalledWith("deleted_at", "is", null);
    expect(query.lte).toHaveBeenCalledWith(
      "deleted_at",
      "2026-09-05T00:00:00.000Z"
    );
  });

  it("does not hide a database failure behind an empty trash state", async () => {
    const query = makeQuery({ data: null, error: new Error("fetch failed") });
    const client = { from: vi.fn(() => ({ select: query.select })) };

    await expect(
      listOwnedTrashPosts(client as never, "resident-a", now)
    ).rejects.toThrow("fetch failed");
  });
});
