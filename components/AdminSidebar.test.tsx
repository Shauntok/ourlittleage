import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AdminSidebar from "./AdminSidebar";

const mocks = vi.hoisted(() => ({
  role: "admin",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/feedback",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/supabase", () => {
  const query = {
    select: vi.fn(),
    neq: vi.fn(),
    eq: vi.fn(),
    single: vi.fn().mockImplementation(async () => ({
      data: { role: mocks.role },
    })),
    then: (resolve: (value: { count: number }) => unknown) =>
      Promise.resolve({ count: 0 }).then(resolve),
  };

  query.select.mockReturnValue(query);
  query.neq.mockReturnValue(query);
  query.eq.mockReturnValue(query);

  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } } }),
      },
      from: vi.fn().mockReturnValue(query),
    },
  };
});

afterEach(cleanup);

beforeEach(() => {
  mocks.role = "admin";
});

describe("AdminSidebar desktop layout", () => {
  it("stays compact and scrollable inside the viewport", () => {
    render(<AdminSidebar />);

    const sidebar = screen.getByTestId("admin-sidebar-desktop");
    const panel = screen.getByTestId("admin-sidebar-desktop-panel");

    expect(sidebar).toHaveClass("lg:top-4");
    expect(panel).toHaveClass("max-h-[calc(100vh-2rem)]", "overflow-y-auto", "w-52");
    expect(screen.getAllByText("回首页").length).toBeGreaterThan(0);
  });

  it("shows a separate sponsorship inquiry destination for admins", async () => {
    render(<AdminSidebar />);

    expect(await screen.findAllByText("业配中心")).not.toHaveLength(0);
    const links = await screen.findAllByRole("link", { name: /合作申请/ });
    expect(links[0]).toHaveAttribute("href", "/admin/sponsors/inquiries");
  });

  it("shows the protected admin changelog destination to admins", async () => {
    render(<AdminSidebar />);

    const links = await screen.findAllByRole("link", { name: /后台更新日志/ });
    expect(links[0]).toHaveAttribute("href", "/admin/changelog");
  });

  it("does not show the protected admin changelog destination to moderators", async () => {
    mocks.role = "moderator";
    render(<AdminSidebar />);

    expect(await screen.findAllByText("回首页")).not.toHaveLength(0);
    expect(screen.queryByRole("link", { name: /后台更新日志/ })).not.toBeInTheDocument();
  });
});
