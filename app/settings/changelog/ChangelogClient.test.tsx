import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ skin: "modern_pixel" as "modern_pixel" | "classic" }));
vi.mock("@/components/RoomViewSkinProvider", () => ({ useRoomViewSkin: () => ({ skin: state.skin }) }));

import ChangelogClient from "./ChangelogClient";

afterEach(cleanup);

describe("settings changelog skins", () => {
  it("lets residents open every version through the archive drawers", () => {
    state.skin = "modern_pixel";
    render(<ChangelogClient />);

    expect(screen.getByRole("heading", { name: "正式版 1.0.0" })).toBeVisible();
    expect(screen.getByRole("button", { name: /查看 正式版 1.0.0/ })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "往期 →" }));
    expect(screen.getByRole("heading", { name: "Alpha 0.9.5" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "往期 →" }));
    fireEvent.click(screen.getByRole("button", { name: "往期 →" }));
    expect(screen.getByRole("button", { name: /查看 Alpha 0.8.0/ })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /查看 Alpha 0.8.0/ }));
    expect(screen.getByRole("heading", { name: "Alpha 0.8.0" })).toBeVisible();
  });

  it("can expand the full latest record without losing any sections", () => {
    state.skin = "modern_pixel";
    render(<ChangelogClient />);

    expect(screen.getByRole("heading", { name: "新功能" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "修复" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "优化" })).toBeVisible();
    expect(screen.queryByText(/更新日志新增版本档案柜/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /展开全部内容/ }));
    expect(screen.getByText(/更新日志改为版本档案柜/)).toBeVisible();
    expect(screen.getByRole("button", { name: /收起部分内容/ })).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps the full glass changelog when classic skin is selected", () => {
    state.skin = "classic";
    render(<ChangelogClient />);

    expect(document.querySelector('[data-changelog-skin="classic"]')).not.toBeNull();
    expect(screen.getByRole("heading", { name: "正式版 1.0.0" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Alpha 0.8.0" })).toBeVisible();
    expect(screen.queryByRole("navigation", { name: "版本档案" })).toBeNull();
  });
});
