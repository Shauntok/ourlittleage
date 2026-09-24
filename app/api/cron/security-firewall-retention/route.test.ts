// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cleanup = vi.hoisted(() => vi.fn());

vi.mock("@/lib/security/firewall", () => ({
  cleanupExpiredFirewallTargets: cleanup,
}));

import { GET } from "./route";

describe("GET /api/cron/security-firewall-retention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "retention-secret");
    cleanup.mockResolvedValue(3);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails closed when CRON_SECRET is unavailable", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await GET(request());

    expect(response.status).toBe(503);
    expect(cleanup).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it.each([undefined, "", "Basic retention-secret", "Bearer wrong-secret"])(
    "rejects malformed Authorization %#",
    async (authorization) => {
      const response = await GET(request(authorization));
      expect(response.status).toBe(401);
      expect(cleanup).not.toHaveBeenCalled();
    }
  );

  it("uses the exact bearer secret and returns a no-store count", async () => {
    const response = await GET(request("Bearer retention-secret"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true, anonymized: 3 });
    expect(cleanup).toHaveBeenCalledOnce();
    expect(cleanup).toHaveBeenCalledWith(100);
  });

  it("returns a generic failure without leaking database details", async () => {
    cleanup.mockRejectedValue(new Error("raw target and database detail"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await GET(request("Bearer retention-secret"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Firewall retention failed",
    });
    expect(consoleError).toHaveBeenCalledWith("Firewall retention cleanup failed");
    consoleError.mockRestore();
  });
});

function request(authorization?: string) {
  return new Request(
    "https://ourlittleage.test/api/cron/security-firewall-retention",
    { headers: authorization ? { Authorization: authorization } : undefined }
  );
}
