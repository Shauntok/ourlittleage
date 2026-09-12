// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminActor: vi.fn(),
  canViewSecurityCenter: vi.fn(),
  canManageSecurityRisk: vi.fn(),
  getResidentSecurity: vi.fn(),
  applyResidentSecurityAction: vi.fn(),
}));

vi.mock("@/lib/admin/authorization", () => ({
  getAdminActor: mocks.getAdminActor,
  canViewSecurityCenter: mocks.canViewSecurityCenter,
  canManageSecurityRisk: mocks.canManageSecurityRisk,
}));

vi.mock("@/lib/security/service", () => ({
  getResidentSecurity: mocks.getResidentSecurity,
  applyResidentSecurityAction: mocks.applyResidentSecurityAction,
  SecurityServiceError: class SecurityServiceError extends Error {
    constructor(public kind: string, message: string) {
      super(message);
    }
  },
}));

import { SecurityServiceError } from "@/lib/security/service";
import { GET, POST } from "./route";

const residentId = "50000000-0000-4000-8000-000000000001";
const requestId = "51000000-0000-4000-8000-000000000001";

describe("/api/admin/users/[id]/security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminActor.mockResolvedValue({ id: "owner-id", role: "owner" });
    mocks.canViewSecurityCenter.mockReturnValue(true);
    mocks.canManageSecurityRisk.mockReturnValue(true);
    mocks.getResidentSecurity.mockResolvedValue({ profile: { userId: residentId } });
    mocks.applyResidentSecurityAction.mockResolvedValue({
      profile: { userId: residentId },
    });
  });

  it("allows owner/admin reads and keeps the response private", async () => {
    const response = await GET(
      new Request(
        `https://ourlittleage.test/api/admin/users/${residentId}/security?page=2`
      ),
      context(residentId)
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.getResidentSecurity).toHaveBeenCalledWith(residentId, 2);
  });

  it("allows only Owner mutations without accepting actor identity", async () => {
    const response = await POST(
      request({
        action: "set_risk",
        riskLevel: "high",
        reason: "Manual review",
        requestId,
      }),
      context(residentId)
    );

    expect(response.status).toBe(200);
    expect(mocks.applyResidentSecurityAction).toHaveBeenCalledWith(residentId, {
      action: "set_risk",
      riskLevel: "high",
      reason: "Manual review",
      requestId,
    });
    expect(mocks.applyResidentSecurityAction.mock.calls[0][1]).not.toHaveProperty(
      "actorId"
    );
  });

  it("rejects unauthenticated reads and writes", async () => {
    mocks.getAdminActor.mockResolvedValue(null);

    const read = await GET(
      new Request(`https://ourlittleage.test/api/admin/users/${residentId}/security`),
      context(residentId)
    );
    const write = await POST(
      request({
        action: "set_review",
        reviewStatus: "pending",
        reason: "Review",
        requestId,
      }),
      context(residentId)
    );

    expect(read.status).toBe(401);
    expect(write.status).toBe(401);
    expect(mocks.getResidentSecurity).not.toHaveBeenCalled();
    expect(mocks.applyResidentSecurityAction).not.toHaveBeenCalled();
  });

  it("keeps Admin read-only and denies Moderator/User reads", async () => {
    mocks.canManageSecurityRisk.mockReturnValue(false);
    const write = await POST(
      request({
        action: "set_review",
        reviewStatus: "pending",
        reason: "Review",
        requestId,
      }),
      context(residentId)
    );
    expect(write.status).toBe(403);
    expect(mocks.applyResidentSecurityAction).not.toHaveBeenCalled();

    mocks.canViewSecurityCenter.mockReturnValue(false);
    const read = await GET(
      new Request(`https://ourlittleage.test/api/admin/users/${residentId}/security`),
      context(residentId)
    );
    expect(read.status).toBe(403);
    expect(mocks.getResidentSecurity).not.toHaveBeenCalled();
  });

  it.each([
    [{ action: "set_risk", riskLevel: "invalid", reason: "Review", requestId }],
    [{ action: "set_note", note: "x", reason: "", requestId }],
    [{ action: "set_review", reviewStatus: "pending", reason: "Review", requestId, extra: true }],
  ])("rejects malformed mutation bodies", async (body) => {
    const response = await POST(request(body), context(residentId));

    expect(response.status).toBe(400);
    expect(mocks.applyResidentSecurityAction).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON, resident ids, and pages", async () => {
    const malformedJson = new Request(
      `https://ourlittleage.test/api/admin/users/${residentId}/security`,
      { method: "POST", body: "{" }
    );
    const badBody = await POST(malformedJson, context(residentId));
    const badId = await GET(
      new Request("https://ourlittleage.test/api/admin/users/bad/security"),
      context("bad")
    );
    const badPage = await GET(
      new Request(
        `https://ourlittleage.test/api/admin/users/${residentId}/security?page=0`
      ),
      context(residentId)
    );

    expect([badBody.status, badId.status, badPage.status]).toEqual([400, 400, 400]);
    expect(mocks.getResidentSecurity).not.toHaveBeenCalled();
    expect(mocks.applyResidentSecurityAction).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid_input", 400],
    ["forbidden", 403],
    ["not_found", 404],
  ])("maps service error %s to %s", async (kind, status) => {
    mocks.getResidentSecurity.mockRejectedValue(
      new SecurityServiceError(kind as never, "private detail")
    );

    const response = await GET(
      new Request(`https://ourlittleage.test/api/admin/users/${residentId}/security`),
      context(residentId)
    );

    expect(response.status).toBe(status);
  });

  it("does not leak internal service errors", async () => {
    mocks.getResidentSecurity.mockRejectedValue(new Error("database detail"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET(
      new Request(`https://ourlittleage.test/api/admin/users/${residentId}/security`),
      context(residentId)
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Security service unavailable" });
    expect(consoleError).toHaveBeenCalledWith("Resident security read failed");
    consoleError.mockRestore();
  });
});

function request(body: Record<string, unknown>) {
  return new Request(
    `https://ourlittleage.test/api/admin/users/${residentId}/security`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}
