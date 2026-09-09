// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminActor: vi.fn(),
  getResidentAgeDistribution: vi.fn(),
}));

vi.mock("@/lib/admin/authorization", () => ({
  getAdminActor: mocks.getAdminActor,
}));

vi.mock("@/lib/admin/age-distribution", () => ({
  getResidentAgeDistribution: mocks.getResidentAgeDistribution,
  getMalaysiaDate: () => "2026-09-09",
}));

import { GET } from "./route";

const distribution = {
  asOfDate: "2026-09-09",
  totalResidents: 44,
  classifiedResidents: 41,
  unclassifiedResidents: 3,
  bands: [{ key: "18_24", label: "18–24岁", count: 12 }],
};

describe("GET /api/admin/homepage/age-distribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminActor.mockResolvedValue({ id: "owner-1", role: "owner" });
    mocks.getResidentAgeDistribution.mockResolvedValue(distribution);
  });

  it.each(["owner", "admin", "moderator"])(
    "returns aggregate age data for the existing %s dashboard role",
    async (role) => {
      mocks.getAdminActor.mockResolvedValue({ id: `${role}-1`, role });
      const request = new Request("https://ourlittleage.test/api/admin/homepage/age-distribution");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(distribution);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    }
  );

  it("rejects unauthenticated access", async () => {
    mocks.getAdminActor.mockResolvedValue(null);
    const response = await GET(new Request("https://ourlittleage.test/api/admin/homepage/age-distribution"));

    expect(response.status).toBe(401);
    expect(mocks.getResidentAgeDistribution).not.toHaveBeenCalled();
  });

  it("rejects ordinary residents", async () => {
    mocks.getAdminActor.mockResolvedValue({ id: "user-1", role: "user" });
    const response = await GET(new Request("https://ourlittleage.test/api/admin/homepage/age-distribution"));

    expect(response.status).toBe(403);
    expect(mocks.getResidentAgeDistribution).not.toHaveBeenCalled();
  });
});
