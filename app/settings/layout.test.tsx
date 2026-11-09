import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettingsLayout from "./layout";

const state = vi.hoisted(() => ({ skin: "modern_pixel" as "modern_pixel" | "classic", pathname: "/settings/profile" }));

vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("@/components/RoomViewSkinProvider", () => ({ useRoomViewSkin: () => ({ skin: state.skin }) }));

describe("settings shared navigation", () => {
  beforeEach(() => {
    state.skin = "modern_pixel";
    state.pathname = "/settings/profile";
  });

  it("keeps the modern settings navigation on the skin page", () => {
    state.pathname = "/settings/skin";
    render(<SettingsLayout><p>皮肤设置内容</p></SettingsLayout>);

    expect(screen.getByRole("heading", { name: "设置" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "皮肤" }).getAttribute("href")).toBe("/settings/skin");
    expect(screen.getByText("皮肤设置内容")).not.toBeNull();
  });

  it("leaves the classic settings navigation unchanged", () => {
    state.skin = "classic";
    render(<SettingsLayout><p>旧版内容</p></SettingsLayout>);

    expect(screen.getByRole("heading", { name: "SETTINGS" })).not.toBeNull();
    expect(screen.getByText("旧版内容")).not.toBeNull();
  });
});
