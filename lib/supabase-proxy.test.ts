import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getClaims: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

describe("updateSupabaseSession", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.createServerClient.mockReset();
    mocks.getClaims.mockReset();

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("refreshes auth and writes updated cookies to the request and response", async () => {
    mocks.createServerClient.mockImplementation((_url, _key, options) => {
      mocks.getClaims.mockImplementation(async () => {
        options.cookies.setAll([
          {
            name: "sb-example-auth-token",
            value: "refreshed-token",
            options: { path: "/", maxAge: 3600, sameSite: "lax" },
          },
        ]);

        return { data: { claims: { sub: "resident-id" } } };
      });

      return { auth: { getClaims: mocks.getClaims } };
    });

    const request = new NextRequest("https://www.ourlittleage.com/u/test", {
      headers: { cookie: "existing-cookie=existing-value" },
    });
    const { updateSupabaseSession } = await import("./supabase-proxy");
    const response = await updateSupabaseSession(request);

    expect(mocks.createServerClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "test-anon-key",
      expect.objectContaining({ cookies: expect.any(Object) })
    );
    expect(mocks.getClaims).toHaveBeenCalledOnce();
    expect(request.cookies.get("sb-example-auth-token")?.value).toBe(
      "refreshed-token"
    );
    expect(response.cookies.get("sb-example-auth-token")?.value).toBe(
      "refreshed-token"
    );
    expect(response.headers.get("cache-control")).toContain("private");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("passes all request cookies to the server client", async () => {
    let getAll: (() => Array<{ name: string; value: string }>) | undefined;

    mocks.createServerClient.mockImplementation((_url, _key, options) => {
      getAll = options.cookies.getAll;
      return { auth: { getClaims: mocks.getClaims } };
    });
    mocks.getClaims.mockResolvedValue({ data: { claims: null } });

    const request = new NextRequest("https://www.ourlittleage.com/", {
      headers: { cookie: "first=one; second=two" },
    });
    const { updateSupabaseSession } = await import("./supabase-proxy");
    const response = await updateSupabaseSession(request);

    expect(getAll?.()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "first", value: "one" }),
        expect.objectContaining({ name: "second", value: "two" }),
      ])
    );
    expect(response.headers.get("cache-control")).toBeNull();
  });
});
