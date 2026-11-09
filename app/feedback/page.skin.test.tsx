import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FeedbackPage from "./page";

const mocks = vi.hoisted(() => ({ skin: "modern_pixel" as "modern_pixel" | "classic" }));

vi.mock("next/dynamic", () => ({
  default: () => () => <div data-testid="modern-feedback">现代像素反馈</div>,
}));
vi.mock("@/components/RoomViewSkinProvider", () => ({
  useRoomViewSkin: () => ({ skin: mocks.skin }),
}));
vi.mock("@/lib/supabase", () => ({ supabase: { auth: { getUser: vi.fn() } } }));

describe("FeedbackPage skin routing", () => {
  beforeEach(() => { mocks.skin = "modern_pixel"; });

  it("loads the modern form for the modern skin", () => {
    render(<FeedbackPage />);
    expect(screen.getByTestId("modern-feedback")).toBeInTheDocument();
  });

  it("keeps the existing classic form for the classic skin", () => {
    mocks.skin = "classic";
    const { container } = render(<FeedbackPage />);
    expect(container.querySelector('[data-feedback-skin="classic"]')).not.toBeNull();
    expect(screen.getByLabelText("反馈标题")).toBeInTheDocument();
    expect(screen.queryByTestId("modern-feedback")).toBeNull();
  });
});
