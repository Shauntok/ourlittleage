import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  updateSupabaseSession: vi.fn(),
}));

vi.mock("@/lib/supabase-proxy", () => ({
  updateSupabaseSession: mocks.updateSupabaseSession,
}));

import { proxy } from "./proxy";

describe("proxy", () => {
  beforeEach(() => {
    mocks.updateSupabaseSession.mockReset();
    mocks.updateSupabaseSession.mockImplementation(async (request) =>
      NextResponse.next({ request })
    );
  });

  it("keeps the canonical www redirect ahead of session refresh", async () => {
    const request = new NextRequest("https://ourlittleage.com/space", {
      headers: { host: "ourlittleage.com" },
    });
    const response = await proxy(request);

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://www.ourlittleage.com/space"
    );
    expect(mocks.updateSupabaseSession).not.toHaveBeenCalled();
  });

  it("refreshes the session while preserving private-route noindex headers", async () => {
    const request = new NextRequest(
      "https://www.ourlittleage.com/notifications"
    );
    const response = await proxy(request);

    expect(mocks.updateSupabaseSession).toHaveBeenCalledWith(request);
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("refreshes the session without marking public routes noindex", async () => {
    const request = new NextRequest("https://www.ourlittleage.com/space");
    const response = await proxy(request);

    expect(mocks.updateSupabaseSession).toHaveBeenCalledWith(request);
    expect(response.headers.get("x-robots-tag")).toBeNull();
  });
});
