// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminActor: vi.fn(),
  canViewVipMembership: vi.fn(),
  canManageVipMembership: vi.fn(),
  getOverview: vi.fn(),
  grantVip: vi.fn(),
  extendVip: vi.fn(),
  cancelVip: vi.fn(),
  revokeVip: vi.fn(),
}));

vi.mock("@/lib/admin/authorization", () => ({
  getAdminActor: mocks.getAdminActor,
  canViewVipMembership: mocks.canViewVipMembership,
  canManageVipMembership: mocks.canManageVipMembership,
}));

vi.mock("@/lib/vip/service", () => ({
  getVipAdminOverview: mocks.getOverview,
  grantVip: mocks.grantVip,
  extendVip: mocks.extendVip,
  cancelVip: mocks.cancelVip,
  revokeVip: mocks.revokeVip,
  VipServiceError: class VipServiceError extends Error {
    constructor(public kind: string, message: string) {
      super(message);
    }
  },
}));

import { GET, POST } from "./route";

const residentId = "22222222-2222-4222-8222-222222222222";
const requestId = "33333333-3333-4333-8333-333333333333";

describe("/api/admin/users/[id]/vip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminActor.mockResolvedValue({ id: "owner-id", role: "owner" });
    mocks.canViewVipMembership.mockReturnValue(true);
    mocks.canManageVipMembership.mockReturnValue(true);
    mocks.getOverview.mockResolvedValue({ membership: null });
    mocks.grantVip.mockResolvedValue({ eventType: "grant" });
  });

  it("allows owner/admin reads through the protected server route", async () => {
    const response = await GET(
      new Request(`https://ourlittleage.test/api/admin/users/${residentId}/vip?page=2`),
      context(residentId)
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.getOverview).toHaveBeenCalledWith(residentId, 2);
  });

  it("allows an owner grant without accepting actor identity from the browser", async () => {
    const response = await POST(
      request("grant", { durationDays: 30 }),
      context(residentId)
    );

    expect(response.status).toBe(200);
    expect(mocks.grantVip).toHaveBeenCalledWith(residentId, {
      durationDays: 30,
      reason: "Manual QA grant",
      requestId,
    });
    expect(mocks.grantVip.mock.calls[0][1]).not.toHaveProperty("actorId");
  });

  it("keeps admin read-only and rejects moderator/user access", async () => {
    mocks.getAdminActor.mockResolvedValue({ id: "admin-id", role: "admin" });
    mocks.canManageVipMembership.mockReturnValue(false);

    const write = await POST(request("grant", { durationDays: 30 }), context(residentId));
    expect(write.status).toBe(403);
    expect(mocks.grantVip).not.toHaveBeenCalled();

    mocks.canViewVipMembership.mockReturnValue(false);
    const read = await GET(
      new Request(`https://ourlittleage.test/api/admin/users/${residentId}/vip`),
      context(residentId)
    );
    expect(read.status).toBe(403);
    expect(mocks.getOverview).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated reads and writes", async () => {
    mocks.getAdminActor.mockResolvedValue(null);

    const read = await GET(
      new Request(`https://ourlittleage.test/api/admin/users/${residentId}/vip`),
      context(residentId)
    );
    const write = await POST(request("grant", { durationDays: 30 }), context(residentId));

    expect(read.status).toBe(401);
    expect(write.status).toBe(401);
    expect(mocks.getOverview).not.toHaveBeenCalled();
    expect(mocks.grantVip).not.toHaveBeenCalled();
  });

  it("rejects malformed actions before calling the service", async () => {
    const response = await POST(
      request("extend", { durationDays: 0 }),
      context(residentId)
    );

    expect(response.status).toBe(400);
    expect(mocks.extendVip).not.toHaveBeenCalled();
  });
});

function request(action: string, extra: Record<string, unknown> = {}) {
  return new Request(`https://ourlittleage.test/api/admin/users/${residentId}/vip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      reason: "Manual QA grant",
      requestId,
      ...extra,
    }),
  });
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}
