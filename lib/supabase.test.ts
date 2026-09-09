import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createBrowserClient: vi.fn(() => ({ auth: {} })),
  createClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: mocks.createBrowserClient,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

describe("browser Supabase client", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.createBrowserClient.mockClear();
    mocks.createClient.mockClear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("uses cookie-backed auth so server actions can read the browser session", async () => {
    await import("./supabase");

    expect(mocks.createBrowserClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "test-anon-key"
    );
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
