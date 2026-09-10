import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import UserVipMembershipSection from "./UserVipMembershipSection";

const fetchMock = vi.fn();
const userId = "973ca71a-0b4b-4756-82b7-75062e22df9a";

const overview = {
  databaseNow: "2026-09-10T05:00:00.000Z",
  flags: {
    vipEntitlementEnabled: false,
    vipPublicUiEnabled: false,
    vipPurchaseEnabled: false,
    vipReferralRewardEnabled: false,
    vipPublicBadgeEnabled: false,
  },
  membership: {
    userId,
    status: "active",
    startedAt: "2026-09-01T00:00:00.000Z",
    expiresAt: "2026-10-01T00:00:00.000Z",
    cancelAtPeriodEnd: false,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  },
  entitlement: {
    isActive: false,
    reason: "feature_disabled",
    membership: null,
  },
  history: {
    items: [
      {
        id: "44444444-4444-4444-8444-444444444444",
        eventType: "grant",
        reason: "Founding grant",
        actorId: "11111111-1111-4111-8111-111111111111",
        actorUsername: "owner",
        requestId: "33333333-3333-4333-8333-333333333333",
        createdAt: "2026-09-01T00:00:00.000Z",
        previousState: null,
        newState: null,
      },
    ],
    total: 1,
    page: 1,
    pageSize: 10,
  },
};

describe("UserVipMembershipSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockResolvedValue(json({ overview }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows stored state separately from the disabled calculated entitlement", async () => {
    render(
      <UserVipMembershipSection
        userId={userId}
        username="xiaoyu"
        currentRole="owner"
      />
    );

    expect(await screen.findByText("VIP Membership")).toBeInTheDocument();
    expect(screen.getByText("全局 VIP 权益目前关闭")).toBeInTheDocument();
    expect(screen.getByText("储存状态")).toBeInTheDocument();
    expect(screen.getByText("生效中")).toBeInTheDocument();
    expect(screen.getByText("实际权益")).toBeInTheDocument();
    expect(screen.getByText("功能未启用")).toBeInTheDocument();
    expect(screen.getByText("Founding grant")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/admin/users/${userId}/vip?page=1`,
      expect.objectContaining({ cache: "no-store", credentials: "same-origin" })
    );
    expect(fetchMock.mock.calls[0][1]?.headers).toBeUndefined();
  });

  it("keeps admin read-only", async () => {
    render(
      <UserVipMembershipSection
        userId={userId}
        username="xiaoyu"
        currentRole="admin"
      />
    );

    expect(await screen.findByText("仅 Owner 可以调整会员状态。"))
      .toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "授予" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "立即撤销" })).not.toBeInTheDocument();
  });

  it("posts a duration-based owner grant without client actor or role fields", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ overview: { ...overview, membership: null } }))
      .mockResolvedValueOnce(json({ result: { eventType: "grant" } }))
      .mockResolvedValueOnce(json({ overview }));

    render(
      <UserVipMembershipSection
        userId={userId}
        username="xiaoyu"
        currentRole="owner"
      />
    );

    fireEvent.click(await screen.findByRole("button", { name: "授予" }));
    fireEvent.change(screen.getByLabelText("操作原因"), {
      target: { value: "Manual owner grant" },
    });
    fireEvent.click(screen.getByRole("button", { name: "确认授予" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const init = fetchMock.mock.calls[1][1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      action: "grant",
      durationDays: 30,
      reason: "Manual owner grant",
    });
    expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(body).not.toHaveProperty("actorId");
    expect(body).not.toHaveProperty("role");
  });

  it("requires a resident-specific confirmation before revoke", async () => {
    render(
      <UserVipMembershipSection
        userId={userId}
        username="xiaoyu"
        currentRole="owner"
      />
    );

    fireEvent.click(await screen.findByRole("button", { name: "立即撤销" }));
    fireEvent.change(screen.getByLabelText("操作原因"), {
      target: { value: "Policy revocation" },
    });
    fireEvent.click(screen.getByRole("button", { name: "继续撤销" }));

    expect(await screen.findByRole("dialog", { name: "确认立即撤销 VIP" }))
      .toBeInTheDocument();
    expect(screen.getByText(/xiaoyu/)).toBeInTheDocument();
    expect(screen.getAllByText(/Policy revocation/)).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reuses the same request id when an owner retries an uncertain response", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ overview: { ...overview, membership: null } }))
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockResolvedValueOnce(json({ result: { eventType: "grant" } }))
      .mockResolvedValueOnce(json({ overview }));

    render(
      <UserVipMembershipSection
        userId={userId}
        username="xiaoyu"
        currentRole="owner"
      />
    );

    fireEvent.click(await screen.findByRole("button", { name: "授予" }));
    fireEvent.change(screen.getByLabelText("操作原因"), {
      target: { value: "Retry-safe grant" },
    });
    fireEvent.click(screen.getByRole("button", { name: "确认授予" }));
    expect(await screen.findByText("操作没有完成，请检查当前状态后重试。"))
      .toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "确认授予" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));

    const firstBody = JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body));
    const retryBody = JSON.parse(String((fetchMock.mock.calls[2][1] as RequestInit).body));
    expect(retryBody.requestId).toBe(firstBody.requestId);
  });
});

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
