// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminActor: vi.fn(),
  canManageSecurityFirewall: vi.fn(),
  transitionFirewallRequest: vi.fn(),
}));

vi.mock("@/lib/admin/authorization", () => ({
  getAdminActor: mocks.getAdminActor,
  canManageSecurityFirewall: mocks.canManageSecurityFirewall,
}));

vi.mock("@/lib/security/firewall", () => ({
  transitionFirewallRequest: mocks.transitionFirewallRequest,
}));

vi.mock("@/lib/security/service", () => ({
  SecurityServiceError: class SecurityServiceError extends Error {
    constructor(public kind: string, message: string) {
      super(message);
    }
  },
}));

import { SecurityServiceError } from "@/lib/security/service";
import { POST } from "./route";

const firewallId = "72000000-0000-4000-8000-000000000001";
const requestId = "73000000-0000-4000-8000-000000000001";

describe("POST /api/admin/security/firewall/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminActor.mockResolvedValue({ id: "owner-id", role: "owner" });
    mocks.canManageSecurityFirewall.mockReturnValue(true);
    mocks.transitionFirewallRequest.mockResolvedValue({ idempotent: false });
  });

  it("passes a strict external confirmation to the service", async () => {
    const body = {
      action: "confirm_external",
      externalRuleId: "ip_rule_123",
      reason: "Published manually in Vercel",
      requestId,
    };
    const response = await POST(jsonRequest(body), context(firewallId));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.transitionFirewallRequest).toHaveBeenCalledWith(firewallId, body);
  });

  it("denies anonymous, Admin, and Moderator mutations before parsing", async () => {
    mocks.getAdminActor.mockResolvedValueOnce(null);
    expect((await POST(brokenRequest(), context(firewallId))).status).toBe(401);

    for (const role of ["admin", "moderator"]) {
      mocks.getAdminActor.mockResolvedValueOnce({ id: `${role}-id`, role });
      mocks.canManageSecurityFirewall.mockReturnValueOnce(false);
      expect((await POST(brokenRequest(), context(firewallId))).status).toBe(403);
    }
    expect(mocks.transitionFirewallRequest).not.toHaveBeenCalled();
  });

  it.each([
    ["not-a-uuid", { action: "cancel", reason: "Cancel", requestId }],
    [firewallId, { action: "unknown", reason: "Invalid", requestId }],
    [firewallId, { action: "confirm_external", reason: "Missing external ID", requestId }],
    [firewallId, { action: "cancel", externalRuleId: "not-allowed", reason: "Cancel", requestId }],
  ])("rejects malformed transition %#", async (id, body) => {
    const response = await POST(jsonRequest(body), context(id));
    expect(response.status).toBe(400);
    expect(mocks.transitionFirewallRequest).not.toHaveBeenCalled();
  });

  it.each([
    ["not_found", 404],
    ["conflict", 409],
    ["invalid_input", 400],
    ["forbidden", 403],
    ["internal", 500],
  ] as const)("maps service error %s to %s", async (kind, status) => {
    mocks.transitionFirewallRequest.mockRejectedValue(
      new SecurityServiceError(kind, "database detail")
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await POST(
      jsonRequest({ action: "cancel", reason: "Cancel request", requestId }),
      context(firewallId)
    );
    expect(response.status).toBe(status);
    expect(await response.json()).not.toEqual({ error: "database detail" });
    consoleError.mockRestore();
  });
});

function jsonRequest(body: unknown) {
  return new Request(
    `https://ourlittleage.test/api/admin/security/firewall/${firewallId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

function brokenRequest() {
  return new Request(
    `https://ourlittleage.test/api/admin/security/firewall/${firewallId}`,
    { method: "POST", body: "not-json" }
  );
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}
