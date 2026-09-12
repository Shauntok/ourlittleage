// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminActor: vi.fn(),
  canViewSecurityCenter: vi.fn(),
  getSecurityOverview: vi.fn(),
}));

vi.mock("@/lib/admin/authorization", () => ({
  getAdminActor: mocks.getAdminActor,
  canViewSecurityCenter: mocks.canViewSecurityCenter,
}));

vi.mock("@/lib/security/service", () => ({
  getSecurityOverview: mocks.getSecurityOverview,
  SecurityServiceError: class SecurityServiceError extends Error {
    constructor(public kind: string, message: string) {
      super(message);
    }
  },
}));

import { GET } from "./route";

describe("GET /api/admin/security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminActor.mockResolvedValue({ id: "owner-id", role: "owner" });
    mocks.canViewSecurityCenter.mockReturnValue(true);
    mocks.getSecurityOverview.mockResolvedValue({ events: { items: [] } });
  });

  it("returns a private owner/admin overview", async () => {
    const response = await GET(
      new Request("https://ourlittleage.test/api/admin/security?page=3")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.getSecurityOverview).toHaveBeenCalledWith(3);
  });

  it("rejects unauthenticated access before reading data", async () => {
    mocks.getAdminActor.mockResolvedValue(null);

    const response = await GET(
      new Request("https://ourlittleage.test/api/admin/security")
    );

    expect(response.status).toBe(401);
    expect(mocks.getSecurityOverview).not.toHaveBeenCalled();
  });

  it("rejects disallowed roles before reading data", async () => {
    mocks.canViewSecurityCenter.mockReturnValue(false);

    const response = await GET(
      new Request("https://ourlittleage.test/api/admin/security")
    );

    expect(response.status).toBe(403);
    expect(mocks.getSecurityOverview).not.toHaveBeenCalled();
  });

  it.each(["0", "1.5", "bad", "1000001"])(
    "rejects invalid page %s",
    async (page) => {
      const response = await GET(
        new Request(`https://ourlittleage.test/api/admin/security?page=${page}`)
      );

      expect(response.status).toBe(400);
      expect(mocks.getSecurityOverview).not.toHaveBeenCalled();
    }
  );

  it("returns a generic response for internal service failures", async () => {
    mocks.getSecurityOverview.mockRejectedValue(new Error("database detail"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET(
      new Request("https://ourlittleage.test/api/admin/security")
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Security service unavailable" });
    expect(consoleError).toHaveBeenCalledWith("Security overview read failed");
    consoleError.mockRestore();
  });
});
