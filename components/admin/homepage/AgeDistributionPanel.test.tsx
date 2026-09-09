import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { getSession: mocks.getSession } },
}));

import AgeDistributionPanel from "./AgeDistributionPanel";

describe("AgeDistributionPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "admin-token" } },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        asOfDate: "2026-09-09",
        totalResidents: 44,
        classifiedResidents: 41,
        unclassifiedResidents: 3,
        bands: [
          { key: "under_13", label: "12岁以下", count: 2 },
          { key: "13_17", label: "13–17岁", count: 3 },
          { key: "18_24", label: "18–24岁", count: 12 },
          { key: "25_34", label: "25–34岁", count: 10 },
          { key: "35_44", label: "35–44岁", count: 7 },
          { key: "45_54", label: "45–54岁", count: 4 },
          { key: "55_64", label: "55–64岁", count: 2 },
          { key: "65_plus", label: "65岁以上", count: 1 },
        ],
      }),
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("loads private aggregate data only after the age row is opened", async () => {
    render(<AgeDistributionPanel />);

    const trigger = screen.getByRole("button", { name: /查看居民年龄分布/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(fetch).not.toHaveBeenCalled();

    fireEvent.click(trigger);

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      "/api/admin/homepage/age-distribution",
      expect.objectContaining({
        headers: { Authorization: "Bearer admin-token" },
        cache: "no-store",
      })
    ));
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByRole("img", { name: "居民年龄分布图" })).toBeVisible();
    expect(screen.getByText("18–24岁")).toBeVisible();
    expect(screen.getByText("12")).toBeVisible();
    expect(screen.getByText("3 位未记录或无法归类")).toBeVisible();
  });

  it("shows a contained error without breaking the dashboard", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    render(<AgeDistributionPanel />);

    fireEvent.click(screen.getByRole("button", { name: /查看居民年龄分布/ }));

    expect(await screen.findByText("年龄资料暂时无法读取。")).toBeVisible();
    expect(screen.getByRole("button", { name: "重新读取年龄资料" })).toBeVisible();
  });
});
