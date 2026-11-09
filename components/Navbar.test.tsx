import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Navbar from "./Navbar";
import RoomViewSkinProvider from "./RoomViewSkinProvider";

vi.mock("next/navigation", () => ({ usePathname: () => "/home" }));

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  removeChannel: vi.fn(),
}));

vi.mock("@/lib/supabase", () => {
  const channel = {
    on: vi.fn(),
    subscribe: vi.fn(),
  };
  channel.on.mockReturnValue(channel);
  channel.subscribe.mockReturnValue(channel);

  return {
    supabase: {
      auth: { getUser: mocks.getUser },
      from: (table: string) => {
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: "resident-a",
                      username: "QA Resident",
                      role: "owner",
                      room_view_skin: "classic",
                    },
                    error: null,
                  }),
              }),
            }),
          };
        }

        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                is: () => Promise.resolve({ count: 0, error: null }),
              }),
            }),
          }),
        };
      },
      channel: () => channel,
      removeChannel: mocks.removeChannel,
    },
  };
});

describe("Navbar trash navigation", () => {
  function renderNavbar() {
    return render(
      <RoomViewSkinProvider>
        <Navbar />
      </RoomViewSkinProvider>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "resident-a" } } });
  });

  it("uses the trash route in both mobile and desktop resident menus", async () => {
    const { container } = renderNavbar();

    fireEvent.click(screen.getByRole("button", { name: /小时代/ }));
    expect(screen.getByRole("link", { name: "垃圾桶" })).toHaveAttribute(
      "href",
      "/trash"
    );

    fireEvent.click(screen.getByRole("button", { name: /小时代/ }));
    const residentButton = await screen.findByRole("button", {
      name: /QA Resident/,
    });
    fireEvent.click(residentButton);

    expect(screen.getByRole("link", { name: "垃圾桶" })).toHaveAttribute(
      "href",
      "/trash"
    );
    await waitFor(() =>
      expect(container.querySelector('a[href="/drafts"]')).toBeNull()
    );
  });

  it("uses one fixed icon column for every mobile and resident-menu action", async () => {
    renderNavbar();

    fireEvent.click(screen.getByRole("button", { name: /小时代/ }));
    const mobileMenu = screen.getByRole("navigation", {
      name: "手机居民菜单",
    });

    for (const label of [
      "首页",
      "广场",
      "我的日记",
      "我的文章",
      "垃圾桶",
      "写日记",
      "写文章",
    ]) {
      const item = within(mobileMenu).getByRole("link", { name: label });
      expect(item).toHaveClass("grid-cols-[20px_minmax(0,1fr)_auto]");
      expect(item.querySelector("svg")).toHaveClass(
        "h-[18px]",
        "w-[18px]",
        "justify-self-center"
      );
    }

    fireEvent.click(screen.getByRole("button", { name: /小时代/ }));
    fireEvent.click(
      await screen.findByRole("button", { name: /QA Resident/ })
    );
    const residentMenu = screen.getByRole("navigation", {
      name: "居民账号菜单",
    });

    for (const label of [
      "我的房间",
      "信箱与互动",
      "垃圾桶",
      "房间设置",
      "意见反馈",
      "后台管理",
    ]) {
      const item = within(residentMenu).getByRole("link", { name: label });
      expect(item).toHaveClass("grid-cols-[20px_minmax(0,1fr)_auto]");
      expect(item.querySelector("svg")).toHaveClass(
        "h-[18px]",
        "w-[18px]",
        "justify-self-center"
      );
    }

    const logout = within(residentMenu).getByRole("button", { name: "登出" });
    expect(logout).toHaveClass("grid-cols-[20px_minmax(0,1fr)_auto]");
    expect(logout.querySelector("svg")).toHaveClass(
      "h-[18px]",
      "w-[18px]",
      "justify-self-center"
    );
  });

  it("applies the viewer's saved skin to the global navigation", async () => {
    renderNavbar();

    await waitFor(() => {
      expect(document.querySelector("[data-room-nav]")).toHaveAttribute(
        "data-room-nav-skin",
        "classic"
      );
    });
  });

  it("scopes modern pixel navigation styles to the selected skin, not the room route", () => {
    const globalStyles = readFileSync(
      resolve(process.cwd(), "app/globals.css"),
      "utf8"
    );

    expect(globalStyles).toContain(
      'header[data-room-nav-skin="modern_pixel"] [data-room-nav-shell]'
    );
    expect(globalStyles).not.toContain(
      'body[data-resident-room-page] [data-room-nav-shell]'
    );
    expect(globalStyles).toContain(
      'header[data-room-nav-skin="modern_pixel"] [data-room-menu-frame] [data-room-frame-part]'
    );
    expect(globalStyles).not.toContain(
      'body[data-resident-room-page] [data-room-menu-frame]'
    );
  });

  it("marks the current section and keeps light navigation styles isolated from classic", () => {
    const { container } = renderNavbar();
    expect(container.querySelector('a[href="/home"]:not([data-room-brand])')).toHaveAttribute(
      "data-room-nav-current",
      ""
    );

    const globalStyles = readFileSync(
      resolve(process.cwd(), "app/globals.css"),
      "utf8"
    );
    expect(globalStyles).toContain('header[data-room-nav-skin="modern_pixel"] [data-room-nav-current=""]');
    expect(globalStyles).toContain('header[data-room-nav-skin="modern_pixel"] [data-room-login]');
    expect(globalStyles).toContain("background-color: #fcfcff");
  });

  it("hides only the modern pixel account name so the unread badge stays on the avatar", async () => {
    const { container } = renderNavbar();
    await screen.findByRole("button", { name: /QA Resident/ });
    expect(container.querySelector("[data-room-account-name]")).toHaveTextContent("QA Resident");

    const globalStyles = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
    expect(globalStyles).toMatch(
      /header\[data-room-nav-skin="modern_pixel"\] \[data-room-account-name\] \{\s*display: none;/
    );
    expect(globalStyles).not.toContain('header[data-room-nav-skin="classic"] [data-room-account-name]');
  });
});
