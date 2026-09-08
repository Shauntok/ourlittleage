import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  getUser: vi.fn(),
  getSummary: vi.fn(),
  getState: vi.fn(),
  follow: vi.fn(),
  unfollow: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { getUser: mocks.getUser } },
}));

vi.mock("@/app/actions/relationships", () => ({
  getPublicRelationshipSummary: mocks.getSummary,
  getResidentRelationshipState: mocks.getState,
  followUser: mocks.follow,
  unfollowUser: mocks.unfollow,
  cancelFollowRequest: mocks.cancel,
}));

vi.mock("@/components/ui/ConfirmDialog", () => ({
  default: ({
    open,
    title,
    loading,
    onConfirm,
    onCancel,
  }: {
    open: boolean;
    title: string;
    loading?: boolean;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => open ? (
    <div role="dialog" aria-label={title}>
      <button type="button" disabled={loading} onClick={onConfirm}>
        确认关系变更
      </button>
      <button type="button" disabled={loading} onClick={onCancel}>
        取消
      </button>
    </div>
  ) : null,
}));

import ResidentRelationshipControls from "./ResidentRelationshipControls";

const residentId = "22222222-2222-4222-8222-222222222222";
const viewerId = "11111111-1111-4111-8111-111111111111";

function acceptedState(isMutual = false) {
  return {
    ok: true,
    state: {
      outboundStatus: "accepted",
      inboundStatus: isMutual ? "accepted" : null,
      isFollowing: true,
      isMutual,
    },
  };
}

function renderControls() {
  return render(
    <ResidentRelationshipControls
      residentId={residentId}
      username="夜雨"
    />
  );
}

describe("ResidentRelationshipControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSummary.mockResolvedValue({
      ok: true,
      summary: { followersCount: 41, followingCount: 23 },
    });
    mocks.getUser.mockResolvedValue({
      data: { user: { id: viewerId } },
      error: null,
    });
    mocks.getState.mockResolvedValue({
      ok: true,
      state: {
        outboundStatus: null,
        inboundStatus: null,
        isFollowing: false,
        isMutual: false,
      },
    });
  });

  afterEach(cleanup);

  it("shows public counts but no follow button to the room owner", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: residentId } },
      error: null,
    });
    renderControls();

    expect(await screen.findByText("关注中 23")).toBeVisible();
    expect(screen.getByText("关注者 41")).toBeVisible();
    expect(screen.queryByRole("button", { name: /关注夜雨/ })).toBeNull();
    expect(mocks.getState).not.toHaveBeenCalled();
  });

  it("shows a login follow action to anonymous visitors", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    renderControls();

    const button = await screen.findByRole("button", { name: "关注夜雨" });
    fireEvent.click(button);

    expect(mocks.push).toHaveBeenCalledWith(
      `/?returnTo=${encodeURIComponent("/u/夜雨")}`
    );
    expect(mocks.follow).not.toHaveBeenCalled();
  });

  it("follows directly when no outgoing relationship exists", async () => {
    mocks.follow.mockResolvedValue({
      ok: true,
      relationship: { status: "accepted" },
    });
    renderControls();

    fireEvent.click(await screen.findByRole("button", { name: "关注夜雨" }));

    await waitFor(() => expect(mocks.follow).toHaveBeenCalledWith(residentId));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows pending state and confirms before cancelling it", async () => {
    mocks.getState.mockResolvedValue({
      ok: true,
      state: {
        outboundStatus: "pending",
        inboundStatus: null,
        isFollowing: false,
        isMutual: false,
      },
    });
    mocks.cancel.mockResolvedValue({ ok: true, changed: true });
    renderControls();

    fireEvent.click(
      await screen.findByRole("button", { name: "取消对夜雨的关注申请" })
    );
    expect(screen.getByRole("dialog", { name: "取消关注申请？" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "确认关系变更" }));

    await waitFor(() => expect(mocks.cancel).toHaveBeenCalledWith(residentId));
  });

  it.each([
    [false, "已关注", "取消关注夜雨"],
    [true, "互相关注", "取消关注夜雨"],
  ])("shows %s mutual state as %s and confirms unfollow", async (isMutual, label, ariaLabel) => {
    mocks.getState.mockResolvedValue(acceptedState(isMutual as boolean));
    mocks.unfollow.mockResolvedValue({ ok: true, changed: true });
    renderControls();

    const button = await screen.findByRole("button", { name: ariaLabel });
    expect(button).toHaveTextContent(label);
    fireEvent.click(button);
    expect(screen.getByRole("dialog", { name: "取消关注？" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "确认关系变更" }));

    await waitFor(() => expect(mocks.unfollow).toHaveBeenCalledWith(residentId));
  });

  it("reserves stable profile space while relationship data loads", () => {
    mocks.getSummary.mockReturnValue(new Promise(() => {}));
    renderControls();

    expect(screen.getByTestId("relationship-controls")).toHaveClass("min-h-11");
    expect(screen.getByLabelText("正在读取关系资料")).toBeVisible();
  });

  it("keeps the room usable and offers a quiet retry when reads fail", async () => {
    mocks.getSummary.mockResolvedValue({
      ok: false,
      error: "关系资料暂时无法读取。",
    });
    renderControls();

    expect(await screen.findByText("关系资料暂时无法读取。")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "重新读取关系资料" }));
    await waitFor(() => expect(mocks.getSummary).toHaveBeenCalledTimes(2));
  });

  it("contains an unexpected read rejection inside the relationship area", async () => {
    mocks.getSummary.mockRejectedValue(new Error("network details"));
    renderControls();

    expect(await screen.findByText("关系资料暂时无法读取。")).toBeVisible();
    expect(screen.getByRole("button", { name: "重新读取关系资料" })).toBeVisible();
  });

  it("disables repeated follow clicks and refreshes counts and state", async () => {
    let finishFollow: ((value: unknown) => void) | undefined;
    mocks.follow.mockReturnValue(
      new Promise((resolve) => {
        finishFollow = resolve;
      })
    );
    renderControls();

    const button = await screen.findByRole("button", { name: "关注夜雨" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(mocks.follow).toHaveBeenCalledTimes(1);

    finishFollow?.({ ok: true, relationship: { status: "accepted" } });
    await waitFor(() => {
      expect(mocks.getSummary).toHaveBeenCalledTimes(2);
      expect(mocks.getState).toHaveBeenCalledTimes(2);
    });
  });

  it("keeps the prior state and shows a concise mutation error", async () => {
    mocks.getState.mockResolvedValue(acceptedState());
    mocks.unfollow.mockResolvedValue({
      ok: false,
      error: "关系操作暂时无法完成。",
    });
    renderControls();

    fireEvent.click(await screen.findByRole("button", { name: "取消关注夜雨" }));
    fireEvent.click(screen.getByRole("button", { name: "确认关系变更" }));

    expect(
      await screen.findByText("关系操作暂时无法完成。")
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "取消关注夜雨" })).toHaveTextContent(
      "已关注"
    );
  });

  it("restores the prior state after an unexpected mutation rejection", async () => {
    mocks.follow.mockRejectedValue(new Error("network details"));
    renderControls();

    fireEvent.click(await screen.findByRole("button", { name: "关注夜雨" }));

    expect(
      await screen.findByText("关系操作暂时无法完成。")
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "关注夜雨" })).toBeEnabled();
  });
});
