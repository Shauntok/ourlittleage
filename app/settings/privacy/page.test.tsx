import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  selectEq: vi.fn(),
  single: vi.fn(),
  update: vi.fn(),
  updateEq: vi.fn(),
  setFollowMode: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  },
}));

vi.mock("@/app/actions/relationships", () => ({
  setFollowMode: mocks.setFollowMode,
}));

import PrivacySettingsPage from "./page";

const userId = "11111111-1111-4111-8111-111111111111";
const settings = {
  show_level: true,
  show_exp: true,
  show_trust_score: true,
  show_joined_days: true,
  show_badges: true,
  follow_mode: "open",
};

describe("PrivacySettingsPage follow privacy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
    mocks.single.mockResolvedValue({ data: settings, error: null });
    mocks.selectEq.mockReturnValue({ single: mocks.single });
    mocks.select.mockReturnValue({ eq: mocks.selectEq });
    mocks.updateEq.mockResolvedValue({ error: null });
    mocks.update.mockReturnValue({ eq: mocks.updateEq });
    mocks.from.mockReturnValue({
      select: mocks.select,
      update: mocks.update,
    });
    mocks.setFollowMode.mockResolvedValue({
      ok: true,
      followMode: "approval_required",
    });
  });

  afterEach(cleanup);

  it("loads follow_mode with the existing profile privacy fields", async () => {
    render(<PrivacySettingsPage />);

    await screen.findByRole("heading", { name: "隐私设置" });
    expect(mocks.select).toHaveBeenCalledWith(
      expect.stringContaining("follow_mode")
    );
    expect(
      screen.getByRole("radio", { name: "任何居民可关注" })
    ).toHaveAttribute("aria-checked", "true");
  });

  it("offers only open and approval-required follow choices", async () => {
    render(<PrivacySettingsPage />);
    await screen.findByRole("heading", { name: "隐私设置" });

    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByRole("radio", { name: "任何居民可关注" })).toBeVisible();
    expect(screen.getByRole("radio", { name: "关注需要批准" })).toBeVisible();
  });

  it.each([null, "legacy_mode"])(
    "uses the safe open default for %s without writing automatically",
    async (followMode) => {
      mocks.single.mockResolvedValue({
        data: { ...settings, follow_mode: followMode },
        error: null,
      });
      render(<PrivacySettingsPage />);

      expect(
        await screen.findByRole("radio", { name: "任何居民可关注" })
      ).toHaveAttribute("aria-checked", "true");
      expect(mocks.setFollowMode).not.toHaveBeenCalled();
    }
  );

  it("saves a changed follow mode only through the relationship action", async () => {
    render(<PrivacySettingsPage />);
    fireEvent.click(
      await screen.findByRole("radio", { name: "关注需要批准" })
    );
    fireEvent.click(screen.getByRole("button", { name: "保存设置" }));

    await waitFor(() => {
      expect(mocks.setFollowMode).toHaveBeenCalledWith("approval_required");
      expect(mocks.update).toHaveBeenCalledWith({
        show_level: true,
        show_exp: true,
        show_trust_score: true,
        show_joined_days: true,
        show_badges: true,
      });
    });
    expect(mocks.update.mock.calls[0][0]).not.toHaveProperty("follow_mode");
    expect(await screen.findByText("隐私设置已保存。")).toBeVisible();
  });

  it("keeps the existing boolean save path and skips an unchanged follow RPC", async () => {
    render(<PrivacySettingsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "显示等级" }));
    fireEvent.click(screen.getByRole("button", { name: "保存设置" }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ show_level: false })
    ));
    expect(mocks.setFollowMode).not.toHaveBeenCalled();
  });

  it.each(["profile", "relationship"])(
    "refetches authoritative settings when the %s save path fails",
    async (failurePath) => {
      if (failurePath === "profile") {
        mocks.updateEq.mockResolvedValue({ error: { message: "denied" } });
      } else {
        mocks.setFollowMode.mockResolvedValue({
          ok: false,
          error: "关系操作暂时无法完成。",
        });
      }
      render(<PrivacySettingsPage />);
      fireEvent.click(
        await screen.findByRole("radio", { name: "关注需要批准" })
      );
      fireEvent.click(screen.getByRole("button", { name: "保存设置" }));

      expect(
        await screen.findByText("部分设置未能保存，已重新读取当前状态。")
      ).toBeVisible();
      expect(screen.queryByText("隐私设置已保存。")).toBeNull();
      expect(mocks.single).toHaveBeenCalledTimes(2);
    }
  );

  it("contains an unexpected save rejection and refetches before re-enabling save", async () => {
    mocks.setFollowMode.mockRejectedValue(new Error("network details"));
    render(<PrivacySettingsPage />);
    fireEvent.click(
      await screen.findByRole("radio", { name: "关注需要批准" })
    );
    fireEvent.click(screen.getByRole("button", { name: "保存设置" }));

    expect(
      await screen.findByText("部分设置未能保存，已重新读取当前状态。")
    ).toBeVisible();
    expect(mocks.single).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "保存设置" })).toBeEnabled();
  });
});
