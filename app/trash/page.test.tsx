import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getUser: vi.fn(),
  listOwnedTrashPosts: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));
vi.mock("@/lib/server/postTrash", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/postTrash")>();
  return { ...actual, listOwnedTrashPosts: mocks.listOwnedTrashPosts };
});
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return { ...actual, redirect: mocks.redirect, useRouter: () => ({ refresh: vi.fn() }) };
});
vi.mock("@/app/actions/trash", () => ({ restorePost: vi.fn() }));

import TrashPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createSupabaseServerClient.mockResolvedValue({
    auth: { getUser: mocks.getUser },
  });
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "resident-a" } },
    error: null,
  });
  mocks.listOwnedTrashPosts.mockResolvedValue([]);
});

it("loads only the signed-in resident's trash on the server", async () => {
  render(await TrashPage());

  expect(screen.getByRole("heading", { name: "垃圾桶" })).toBeVisible();
  expect(mocks.listOwnedTrashPosts).toHaveBeenCalledWith(
    expect.anything(),
    "resident-a",
    expect.any(Date)
  );
});

it("redirects anonymous visitors before reading trash", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

  await expect(TrashPage()).rejects.toThrow("redirect:/");
  expect(mocks.listOwnedTrashPosts).not.toHaveBeenCalled();
});
