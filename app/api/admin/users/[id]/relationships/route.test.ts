// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminActor: vi.fn(),
  canViewRelationships: vi.fn(),
  getSummary: vi.fn(),
  listRelationships: vi.fn(),
}));

vi.mock("@/lib/admin/authorization", () => ({
  getAdminActor: mocks.getAdminActor,
  canViewRelationships: mocks.canViewRelationships,
}));

vi.mock("@/lib/relationships/service", () => ({
  getResidentRelationshipSummary: mocks.getSummary,
  listResidentRelationships: mocks.listRelationships,
}));

import { GET } from "./route";

const residentId = "22222222-2222-4222-8222-222222222222";

describe("GET /api/admin/users/[id]/relationships", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminActor.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      role: "owner",
    });
    mocks.canViewRelationships.mockReturnValue(true);
    mocks.getSummary.mockResolvedValue({ followersCount: 4 });
    mocks.listRelationships.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
  });

  it("returns the guarded relationship summary", async () => {
    const request = new Request(`https://ourlittleage.test/api/admin/users/${residentId}/relationships`);
    const response = await GET(request, context(residentId));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ summary: { followersCount: 4 } });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("returns one validated paginated detail view", async () => {
    const request = new Request(`https://ourlittleage.test/api/admin/users/${residentId}/relationships?kind=followers&page=2`);
    const response = await GET(request, context(residentId));

    expect(response.status).toBe(200);
    expect(mocks.listRelationships).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      residentId,
      "followers",
      2,
      20
    );
  });

  it.each(["moderator", "user"])("returns 403 for %s", async (role) => {
    mocks.getAdminActor.mockResolvedValue({ id: "actor", role });
    mocks.canViewRelationships.mockReturnValue(false);

    const response = await GET(
      new Request(`https://ourlittleage.test/api/admin/users/${residentId}/relationships`),
      context(residentId)
    );

    expect(response.status).toBe(403);
    expect(mocks.getSummary).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid IDs and list parameters", async () => {
    const invalidId = await GET(
      new Request("https://ourlittleage.test/api/admin/users/x/relationships"),
      context("x")
    );
    const invalidKind = await GET(
      new Request(`https://ourlittleage.test/api/admin/users/${residentId}/relationships?kind=everything`),
      context(residentId)
    );

    expect(invalidId.status).toBe(400);
    expect(invalidKind.status).toBe(400);
  });
});

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}
