// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminActor: vi.fn(),
  canViewSecurityCenter: vi.fn(),
  canManageSecurityFirewall: vi.fn(),
  getFirewallRequests: vi.fn(),
  createFirewallRequest: vi.fn(),
}));

vi.mock("@/lib/admin/authorization", () => ({
  getAdminActor: mocks.getAdminActor,
  canViewSecurityCenter: mocks.canViewSecurityCenter,
  canManageSecurityFirewall: mocks.canManageSecurityFirewall,
}));

vi.mock("@/lib/security/firewall", () => ({
  getFirewallRequests: mocks.getFirewallRequests,
  createFirewallRequest: mocks.createFirewallRequest,
}));

vi.mock("@/lib/security/service", () => ({
  SecurityServiceError: class SecurityServiceError extends Error {
    constructor(public kind: string, message: string) {
      super(message);
    }
  },
}));

import { SecurityServiceError } from "@/lib/security/service";
import { GET, POST } from "./route";

const requestId = "71000000-0000-4000-8000-000000000001";

describe("/api/admin/security/firewall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminActor.mockResolvedValue({ id: "owner-id", role: "owner" });
    mocks.canViewSecurityCenter.mockReturnValue(true);
    mocks.canManageSecurityFirewall.mockReturnValue(true);
    mocks.getFirewallRequests.mockResolvedValue({ items: [], total: 0, page: 1 });
    mocks.createFirewallRequest.mockResolvedValue({ idempotent: false });
  });

  it("allows Owner/Admin private reads with bounded filters", async () => {
    const response = await GET(
      new Request(
        "https://ourlittleage.test/api/admin/security/firewall?page=2&status=active"
      )
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.getFirewallRequests).toHaveBeenCalledWith(2, "active");
  });

  it("rejects anonymous and disallowed reads before the service", async () => {
    mocks.getAdminActor.mockResolvedValueOnce(null);
    expect(
      (
        await GET(new Request("https://ourlittleage.test/api/admin/security/firewall"))
      ).status
    ).toBe(401);

    mocks.getAdminActor.mockResolvedValueOnce({ id: "resident", role: "user" });
    mocks.canViewSecurityCenter.mockReturnValueOnce(false);
    expect(
      (
        await GET(new Request("https://ourlittleage.test/api/admin/security/firewall"))
      ).status
    ).toBe(403);
    expect(mocks.getFirewallRequests).not.toHaveBeenCalled();
  });

  it.each([
    ["0", "all"],
    ["1", "unknown"],
  ])("rejects invalid query page=%s status=%s", async (page, status) => {
    const response = await GET(
      new Request(
        `https://ourlittleage.test/api/admin/security/firewall?page=${page}&status=${status}`
      )
    );
    expect(response.status).toBe(400);
    expect(mocks.getFirewallRequests).not.toHaveBeenCalled();
  });

  it("creates a strict Owner-only block request", async () => {
    const body = {
      requestType: "block_ip",
      target: "8.8.8.8",
      hostnameScope: "www.ourlittleage.com",
      reason: "Prepare a manual block",
      requestId,
    };
    const response = await POST(jsonRequest(body));

    expect(response.status).toBe(200);
    expect(mocks.createFirewallRequest).toHaveBeenCalledWith(body);
  });

  it("denies Admin writes before parsing the body", async () => {
    mocks.getAdminActor.mockResolvedValue({ id: "admin-id", role: "admin" });
    mocks.canManageSecurityFirewall.mockReturnValue(false);
    const response = await POST(
      new Request("https://ourlittleage.test/api/admin/security/firewall", {
        method: "POST",
        body: "not-json",
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.createFirewallRequest).not.toHaveBeenCalled();
  });

  it.each([
    null,
    {},
    {
      requestType: "block_ip",
      target: "8.8.8.8",
      hostnameScope: "www.ourlittleage.com",
      reason: "",
      requestId,
    },
    {
      requestType: "block_ip",
      target: "8.8.8.8",
      hostnameScope: "www.ourlittleage.com",
      reason: "Valid",
      requestId,
      actorId: "forged",
    },
  ])("rejects malformed create body %#", async (body) => {
    const response = body === null
      ? await POST(
          new Request("https://ourlittleage.test/api/admin/security/firewall", {
            method: "POST",
            body: "not-json",
          })
        )
      : await POST(jsonRequest(body));
    expect(response.status).toBe(400);
    expect(mocks.createFirewallRequest).not.toHaveBeenCalled();
  });

  it.each([
    ["conflict", 409],
    ["invalid_input", 400],
    ["forbidden", 403],
    ["internal", 500],
  ] as const)("maps service error %s without exposing details", async (kind, status) => {
    mocks.createFirewallRequest.mockRejectedValue(
      new SecurityServiceError(kind, "raw database and target detail")
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await POST(
      jsonRequest({
        requestType: "block_ip",
        target: "8.8.8.8",
        hostnameScope: "www.ourlittleage.com",
        reason: "Prepare a manual block",
        requestId,
      })
    );

    expect(response.status).toBe(status);
    expect(JSON.stringify(await response.json())).not.toContain("8.8.8.8");
    consoleError.mockRestore();
  });
});

function jsonRequest(body: unknown) {
  return new Request("https://ourlittleage.test/api/admin/security/firewall", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
