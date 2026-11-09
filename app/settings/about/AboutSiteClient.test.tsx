import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ skin: "classic" as "classic" | "modern_pixel" }));
vi.mock("@/components/RoomViewSkinProvider", () => ({ useRoomViewSkin: () => ({ skin: state.skin }) }));

import AboutSiteClient from "./AboutSiteClient";

afterEach(cleanup);

describe("about site skins", () => {
  it("keeps the original about message in the glass view", () => {
    state.skin = "classic";
    render(<AboutSiteClient />);
    expect(screen.getByRole("heading", { name: "关于小时代" })).toBeVisible();
    expect(screen.getByText("它更像是一座深夜里的数字小镇。")).toBeVisible();
    expect(screen.getByText("谢谢你愿意来到这里，也谢谢你留下属于自己的光。")).toBeVisible();
    expect(screen.getByRole("link", { name: "去深夜广场看看" })).toHaveAttribute("href", "/space");
    expect(document.querySelector('[data-about-skin="modern_pixel"]')).toBeNull();
  });

  it("renders the approved double-page design with the same complete message", () => {
    state.skin = "modern_pixel";
    render(<AboutSiteClient />);
    expect(document.querySelector('[data-about-skin="modern_pixel"]')).not.toBeNull();
    expect(screen.getByRole("heading", { name: "关于小时代" })).toBeVisible();
    expect(screen.getByText("它更像是一座深夜里的数字小镇。")).toBeVisible();
    expect(screen.getByText("谢谢你愿意来到这里，也谢谢你留下属于自己的光。")).toBeVisible();
    expect(screen.getByText(/而是来住下。/)).toBeVisible();
    expect(screen.getByRole("link", { name: "去深夜广场看看" })).toHaveAttribute("href", "/space");
  });
});
