// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminActor: vi.fn(),
  redirect: vi.fn(),
  SecurityCenterClient: vi.fn(() => null),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/admin/authorization", () => ({
  getAdminActor: mocks.getAdminActor,
  canViewSecurityCenter: (role: unknown) => role === "owner" || role === "admin",
}));
vi.mock("@/components/admin/security/SecurityCenterClient", () => ({
  default: mocks.SecurityCenterClient,
}));

import SecurityCenterPage from "./page";

describe("SecurityCenterPage access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`redirect:${path}`);
    });
  });

  it.each(["owner", "admin"])("renders for %s", async (role) => {
    mocks.getAdminActor.mockResolvedValue({ id: `${role}-id`, role });

    await expect(SecurityCenterPage()).resolves.toBeTruthy();
  });

  it("redirects anonymous visitors home", async () => {
    mocks.getAdminActor.mockResolvedValue(null);

    await expect(SecurityCenterPage()).rejects.toThrow("redirect:/");
  });

  it.each(["moderator", "user"])("redirects %s to the admin homepage", async (role) => {
    mocks.getAdminActor.mockResolvedValue({ id: `${role}-id`, role });

    await expect(SecurityCenterPage()).rejects.toThrow(
      "redirect:/admin/homepage"
    );
  });
});
