import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SkinSettingsPage from "./page";

const state = vi.hoisted(() => ({
  updates: [] as Record<string, string>[],
  setViewerSkin: vi.fn(),
  setPixelTime: vi.fn(),
  router: { replace: vi.fn() },
}));

vi.mock("next/navigation", () => ({ useRouter: () => state.router }));
vi.mock("@/components/RoomViewSkinProvider", () => ({ useRoomViewSkin: () => ({ setSkin: state.setViewerSkin, setPixelTime: state.setPixelTime }) }));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "resident-1" } } }) },
    from: () => ({
      select: (column: string) => ({
        eq: () => ({ maybeSingle: async () => ({
          data: column === "theme" ? { theme: "mist" } : { room_view_skin: "modern_pixel" },
          error: null,
        }) }),
      }),
      update: (value: Record<string, string>) => ({
        eq: async () => { state.updates.push(value); return { error: null }; },
      }),
    }),
  },
}));

describe("skin settings wardrobe", () => {
  beforeEach(() => {
    window.localStorage.clear();
    state.updates.length = 0;
    state.setViewerSkin.mockClear();
    state.setPixelTime.mockClear();
    state.router.replace.mockClear();
  });

  it("shows a captured classic page and waits for Save before switching skins", async () => {
    render(<SkinSettingsPage />);
    await screen.findByRole("heading", { name: "房间皮肤" });

    expect(screen.getByAltText("真实旧版玻璃皮肤的深夜广场页面截图").getAttribute("src"))
      .toContain("classic-glass-space-real.webp");

    fireEvent.click(screen.getByRole("button", { name: /经典玻璃/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: /经典玻璃/ }).getAttribute("aria-pressed")).toBe("true"));
    expect(state.updates).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: /保存选择/ }));
    await waitFor(() => expect(state.updates).toContainEqual({ room_view_skin: "classic" }));
  });

  it("saves the existing room theme when switching modern pixel to night", async () => {
    render(<SkinSettingsPage />);
    await screen.findByRole("heading", { name: "房间皮肤" });

    const nightArtwork = () => document.querySelector('img[src*="wardrobe-night-controls.webp"]');
    const cabinetArtwork = () => document.querySelector('img[src*="wardrobe-cutout-day.webp"]');
    expect(nightArtwork()).toBeNull();
    expect(cabinetArtwork()).not.toBeNull();
    state.setPixelTime.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "夜晚" }));
    expect(screen.getByAltText("现代像素夜晚房间实景")).not.toBeNull();
    expect(screen.getByRole("button", { name: "日间" }).getAttribute("aria-pressed")).toBe("false");
    expect(nightArtwork()).not.toBeNull();
    expect(cabinetArtwork()).not.toBeNull();
    expect(state.setPixelTime).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "日间" }));
    expect(nightArtwork()).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "夜晚" }));
    expect(state.updates).toHaveLength(0);
    expect(state.setPixelTime).not.toHaveBeenCalled();
    expect(cabinetArtwork()).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /保存选择/ }));
    await waitFor(() => expect(state.updates).toContainEqual({ theme: "midnight" }));
    expect(state.setPixelTime).toHaveBeenCalledWith("evening");
    expect(state.updates).toContainEqual({ room_view_skin: "modern_pixel" });
    await waitFor(() => expect(document.querySelector('img[src*="wardrobe-cutout-evening.webp"]')).not.toBeNull());
  });
});
