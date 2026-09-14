import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Navbar from "./Navbar";

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
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "resident-a" } } });
  });

  it("uses the trash route in both mobile and desktop resident menus", async () => {
    const { container } = render(<Navbar />);

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
    render(<Navbar />);

    fireEvent.click(screen.getByRole("button", { name: /小时代/ }));
    const mobileMenu = screen.getByRole("navigation", {
      name: "手机居民菜单",
    });

    for (const label of [
      "首页",
      "深夜广场",
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
});
