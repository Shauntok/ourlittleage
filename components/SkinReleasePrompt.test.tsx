import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SkinReleasePrompt from "./SkinReleasePrompt";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  lt: vi.fn(),
  or: vi.fn(),
  result: { data: { id: "old-resident" }, error: null } as { data: { id: string } | null; error: null },
  skin: "classic" as "classic" | "modern_pixel",
  pixelTime: "day" as "day" | "evening",
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/components/RoomViewSkinProvider", () => ({
  useRoomViewSkin: () => ({ skin: mocks.skin, pixelTime: mocks.pixelTime }),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      update: (value: unknown) => { mocks.update(value); return query; },
    }),
  },
}));

const query = {
  eq: (...args: unknown[]) => { mocks.eq(...args); return query; },
  lt: (...args: unknown[]) => { mocks.lt(...args); return query; },
  or: (...args: unknown[]) => { mocks.or(...args); return query; },
  select: () => query,
  maybeSingle: async () => mocks.result,
};

const release = { id: "new-skin-1", name: "花园皮肤", publishedAt: "2025-01-01T00:00:00Z" };

describe("SkinReleasePrompt", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.result = { data: { id: "old-resident" }, error: null }; mocks.skin = "classic"; mocks.pixelTime = "day"; });

  it("is dormant when a skin release is explicitly disabled", () => {
    render(<SkinReleasePrompt userId="old-resident" release={null} />);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("atomically claims an old resident's release, then opens the skin settings", async () => {
    render(<SkinReleasePrompt userId="old-resident" release={release} />);
    expect(await screen.findByRole("dialog", { name: "有新的皮肤了" })).toBeVisible();
    expect(mocks.update).toHaveBeenCalledWith({ last_skin_release_prompt_id: "new-skin-1" });
    expect(mocks.eq).toHaveBeenCalledWith("id", "old-resident");
    expect(mocks.lt).toHaveBeenCalledWith("created_at", release.publishedAt);
    expect(mocks.or).toHaveBeenCalledWith("last_skin_release_prompt_id.is.null,last_skin_release_prompt_id.neq.new-skin-1");
    fireEvent.click(screen.getByRole("button", { name: "带我去看看" }));
    expect(mocks.push).toHaveBeenCalledWith("/settings/skin");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("stays closed when the account is too new or already claimed", async () => {
    mocks.result = { data: null, error: null };
    render(<SkinReleasePrompt userId="new-resident" release={release} />);
    await waitFor(() => expect(mocks.update).toHaveBeenCalled());
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("uses the resident's current modern pixel evening appearance", async () => {
    mocks.skin = "modern_pixel";
    mocks.pixelTime = "evening";
    render(<SkinReleasePrompt userId="old-resident" release={release} />);
    expect(await screen.findByRole("dialog")).toHaveAttribute("data-skin", "modern_pixel");
    expect(screen.getByRole("dialog")).toHaveAttribute("data-pixel-time", "evening");
  });
});
