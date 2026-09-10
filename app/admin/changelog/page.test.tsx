// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminActor: vi.fn(),
  getAdminChangelogEntries: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/admin/authorization", () => ({
  canViewAdminChangelog: (role: unknown) =>
    role === "owner" || role === "admin",
  getAdminActor: mocks.getAdminActor,
}));

vi.mock("@/lib/admin/changelog", () => ({
  getAdminChangelogEntries: mocks.getAdminChangelogEntries,
}));

import AdminChangelogPage from "./page";

describe("AdminChangelogPage access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminChangelogEntries.mockReturnValue([]);
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`redirect:${path}`);
    });
  });

  it.each(["owner", "admin"])("renders for %s", async (role) => {
    mocks.getAdminActor.mockResolvedValue({ id: `${role}-1`, role });

    await expect(AdminChangelogPage()).resolves.toBeTruthy();
    expect(mocks.getAdminChangelogEntries).toHaveBeenCalledOnce();
  });

  it("redirects unauthenticated visitors before loading entries", async () => {
    mocks.getAdminActor.mockResolvedValue(null);

    await expect(AdminChangelogPage()).rejects.toThrow("redirect:/");
    expect(mocks.getAdminChangelogEntries).not.toHaveBeenCalled();
  });

  it.each(["moderator", "user"])(
    "redirects %s before loading entries",
    async (role) => {
      mocks.getAdminActor.mockResolvedValue({ id: `${role}-1`, role });

      await expect(AdminChangelogPage()).rejects.toThrow(
        "redirect:/admin/homepage"
      );
      expect(mocks.getAdminChangelogEntries).not.toHaveBeenCalled();
    }
  );
});
