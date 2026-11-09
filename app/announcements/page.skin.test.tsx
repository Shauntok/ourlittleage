import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AnnouncementsPage from "./page";

const mocks = vi.hoisted(() => ({ skin: "modern_pixel" as "modern_pixel" | "classic" }));

vi.mock("next/dynamic", () => ({
  default: () => () => <div data-testid="modern-announcements">现代像素公告</div>,
}));
vi.mock("@/components/RoomViewSkinProvider", () => ({
  useRoomViewSkin: () => ({ skin: mocks.skin }),
}));
vi.mock("@/lib/supabase", () => ({ supabase: { from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ order: async () => ({ data: [], error: null }) })) })) })) } }));

describe("AnnouncementsPage skin routing", () => {
  beforeEach(() => { mocks.skin = "modern_pixel"; });

  it("loads the modern wall for the modern skin", () => {
    render(<AnnouncementsPage />);
    expect(screen.getByTestId("modern-announcements")).toBeInTheDocument();
  });

  it("keeps the classic page for the classic skin", async () => {
    mocks.skin = "classic";
    const { container } = render(<AnnouncementsPage />);
    expect(await screen.findByText("暂时还没有公告。")).toBeInTheDocument();
    expect(container.querySelector('[data-announcements-skin="classic"]')).not.toBeNull();
    expect(screen.queryByTestId("modern-announcements")).toBeNull();
  });
});
