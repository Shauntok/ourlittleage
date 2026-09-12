import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const wordDetectionSection = vi.hoisted(() => vi.fn(() => <div>词语检测区块</div>));

vi.mock("./WordDetectionSection", () => ({
  default: wordDetectionSection,
}));

import SecurityCenterClient from "./SecurityCenterClient";

const overview = {
  flags: {
    securityCenterEnabled: true,
    securityEventCollectionEnabled: true,
    riskEvaluationEnabled: false,
    automaticEnforcementEnabled: false,
  },
  pendingReviewCount: 3,
  riskCounts: { low: 32, medium: 7, high: 2, critical: 1 },
  events: {
    items: [
      {
        id: "event-1",
        eventType: "risk_level_changed",
        userId: "resident-1",
        username: "晚风",
        actorId: "owner-1",
        actorUsername: "owner",
        reason: "人工复核",
        severity: "high",
        occurredAt: "2026-09-12T10:00:00.000Z",
        metadata: {
          previous: { risk_level: "low", review_status: "no_review_required" },
          new: { risk_level: "high", review_status: "pending" },
        },
      },
    ],
    total: 21,
    page: 1,
    pageSize: 20,
  },
  wordDetection: { available: false },
};

describe("SecurityCenterClient", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ overview }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows loading then compact metrics, flags, and recent events", async () => {
    render(<SecurityCenterClient currentRole="owner" />);

    expect(screen.getByText("正在读取安全状态...")).toBeInTheDocument();
    expect(await screen.findByText("晚风")).toBeInTheDocument();

    for (const value of ["3", "32", "7", "2", "1"]) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
    expect(screen.getByText("人工调整风险等级")).toBeInTheDocument();
    expect(screen.getByText("人工复核")).toBeInTheDocument();
    expect(screen.getAllByText("已启用")).toHaveLength(2);
    expect(screen.getAllByText("未启用")).toHaveLength(2);
    expect(screen.getByText("词语检测区块")).toBeInTheDocument();
    expect(wordDetectionSection).toHaveBeenCalledWith(
      expect.objectContaining({ canManage: true, summary: overview.wordDetection }),
      undefined
    );
    expect(screen.queryByRole("button", { name: /刷新/ })).not.toBeInTheDocument();
  });

  it("loads the selected event page", async () => {
    render(<SecurityCenterClient currentRole="admin" />);
    await screen.findByText("晚风");

    fireEvent.click(screen.getByRole("button", { name: "下一页" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenLastCalledWith(
        "/api/admin/security?page=2",
        { cache: "no-store", credentials: "same-origin" }
      );
    });
  });

  it("renders an explicit empty state", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        overview: {
          ...overview,
          events: { items: [], total: 0, page: 1, pageSize: 20 },
        },
      }),
    } as Response);

    render(<SecurityCenterClient currentRole="owner" />);

    expect(await screen.findByText("目前还没有安全事件。")).toBeInTheDocument();
  });

  it("keeps overview failures local and offers retry", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);

    render(<SecurityCenterClient currentRole="owner" />);

    expect(await screen.findByText("安全中心数据暂时无法读取。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新尝试" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });
});
