import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import UserSecuritySection from "./UserSecuritySection";

const fetchMock = vi.fn();
const userId = "60000000-0000-4000-8000-000000000001";

const overview = {
  profile: {
    userId,
    riskLevel: "high",
    reviewStatus: "pending",
    lastEventAt: "2026-09-12T10:00:00.000Z",
    lastReviewedAt: null,
    reviewedBy: null,
    notes: "需要后续观察",
    updatedAt: "2026-09-12T10:00:00.000Z",
  },
  events: {
    items: [
      {
        id: "61000000-0000-4000-8000-000000000001",
        eventType: "risk_level_changed",
        userId,
        username: "小夜",
        actorId: "62000000-0000-4000-8000-000000000001",
        actorUsername: "owner",
        reason: "人工复核后调整",
        severity: "high",
        occurredAt: "2026-09-12T10:00:00.000Z",
        metadata: {},
      },
    ],
    total: 11,
    page: 1,
    pageSize: 10,
  },
};

describe("UserSecuritySection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockResolvedValue(json({ overview }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "63000000-0000-4000-8000-000000000001") });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows account, risk, and review state separately with history", async () => {
    render(
      <UserSecuritySection
        userId={userId}
        username="小夜"
        accountStatus="warned"
        currentRole="owner"
      />
    );

    expect(screen.getByText("读取安全资料中...")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Security" })).toBeInTheDocument();
    expect(screen.getByText("账号状态").nextSibling).toHaveTextContent("warned");
    expect(screen.getByText("风险等级").nextSibling).toHaveTextContent("高风险");
    expect(screen.getByText("复核状态").nextSibling).toHaveTextContent("待复核");
    expect(screen.getByDisplayValue("需要后续观察")).toBeInTheDocument();
    expect(screen.getByText("人工复核后调整")).toBeInTheDocument();
  });

  it("keeps Admin read-only", async () => {
    render(
      <UserSecuritySection
        userId={userId}
        username="小夜"
        accountStatus="active"
        currentRole="admin"
      />
    );

    expect(await screen.findByText("仅 Owner 可以调整安全复核资料。")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "更新风险" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "保存内部备注" })).not.toBeInTheDocument();
  });

  it("requires a non-empty reason for every Owner action", async () => {
    render(
      <UserSecuritySection
        userId={userId}
        username="小夜"
        accountStatus="active"
        currentRole="owner"
      />
    );

    const updateRisk = await screen.findByRole("button", { name: "更新风险" });
    expect(updateRisk).toBeDisabled();
    fireEvent.change(screen.getByLabelText("操作原因"), {
      target: { value: "人工复核" },
    });
    expect(updateRisk).toBeEnabled();
  });

  it("reuses the same request id when an uncertain mutation is retried", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ overview }))
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockResolvedValueOnce(json({ overview }))
      .mockResolvedValueOnce(json({ overview }));

    render(
      <UserSecuritySection
        userId={userId}
        username="小夜"
        accountStatus="active"
        currentRole="owner"
      />
    );

    await screen.findByRole("heading", { name: "Security" });
    fireEvent.change(screen.getByLabelText("操作原因"), {
      target: { value: "Retry review" },
    });
    fireEvent.click(screen.getByRole("button", { name: "更新风险" }));
    expect(await screen.findByText("操作没有完成，请确认当前状态后重试。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "更新风险" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    const firstBody = JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body));
    const retryBody = JSON.parse(String((fetchMock.mock.calls[2][1] as RequestInit).body));
    expect(retryBody.requestId).toBe(firstBody.requestId);
    expect(firstBody).not.toHaveProperty("actorId");
  });

  it("reloads the current history page after a successful mutation", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ overview }))
      .mockResolvedValueOnce(json({
        overview: { ...overview, events: { ...overview.events, page: 2 } },
      }))
      .mockResolvedValueOnce(json({ overview }))
      .mockResolvedValueOnce(json({ overview }));

    render(
      <UserSecuritySection
        userId={userId}
        username="小夜"
        accountStatus="active"
        currentRole="owner"
      />
    );

    await screen.findByRole("heading", { name: "Security" });
    fireEvent.click(screen.getByRole("button", { name: "下一页" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    fireEvent.change(screen.getByLabelText("操作原因"), {
      target: { value: "Complete review" },
    });
    fireEvent.click(screen.getByRole("button", { name: "更新复核状态" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(fetchMock.mock.calls[3][0]).toBe(
      `/api/admin/users/${userId}/security?page=2`
    );
  });

  it("contains read failures and offers a local retry", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));

    render(
      <UserSecuritySection
        userId={userId}
        username="小夜"
        accountStatus="active"
        currentRole="owner"
      />
    );

    expect(await screen.findByText("安全资料暂时无法读取")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新加载" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
