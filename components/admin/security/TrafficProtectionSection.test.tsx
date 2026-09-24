import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./FirewallRequestForm", () => ({
  default: () => <div>Owner 防护表单</div>,
}));

import TrafficProtectionSection from "./TrafficProtectionSection";

const waitingRequest = {
  id: "78000000-0000-4000-8000-000000000001",
  targetReference: "79000000-0000-4000-8000-000000000001",
  requestType: "block_ip",
  status: "awaiting_external_publish",
  targetNetwork: "8.8.8.8/32",
  targetMasked: "8.8.x.x/32",
  hostnameScope: "www.ourlittleage.com",
  relatedRequestId: null,
  pathMatchMode: null,
  pathPattern: null,
  httpMethod: null,
  windowSeconds: null,
  requestThreshold: null,
  proposedFollowupAction: null,
  reason: "Prepare a manual block",
  requestedBy: "7a000000-0000-4000-8000-000000000001",
  externalRuleId: null,
  confirmedBy: null,
  confirmedAt: null,
  resolvedAt: null,
  anonymizedAt: null,
  createdAt: "2026-09-24T02:00:00.000Z",
  updatedAt: "2026-09-24T02:00:00.000Z",
};

describe("TrafficProtectionSection", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          requests: { items: [waitingRequest], total: 1, page: 1, pageSize: 20 },
        }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows honest external-source wording and the Owner workflow", async () => {
    render(<TrafficProtectionSection currentRole="owner" />);

    expect(await screen.findByText("流量防护")).toBeInTheDocument();
    expect(screen.getByText("Vercel 是实际规则与实时流量的依据")).toBeInTheDocument();
    expect(screen.getByText("Owner 人工确认")).toBeInTheDocument();
    expect(screen.getByText("8.8.8.8/32")).toBeInTheDocument();
    expect(screen.getByText("Owner 防护表单")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "确认已发布" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "取消防护单" })).toBeInTheDocument();
  });

  it("keeps Admin read-only and displays only a masked target", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        requests: {
          items: [{ ...waitingRequest, targetNetwork: null }],
          total: 1,
          page: 1,
          pageSize: 20,
        },
      }),
    } as Response);
    render(<TrafficProtectionSection currentRole="admin" />);

    expect(await screen.findByText("8.8.x.x/32")).toBeInTheDocument();
    expect(screen.queryByText("8.8.8.8/32")).not.toBeInTheDocument();
    expect(screen.queryByText("Owner 防护表单")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "确认已发布" })).not.toBeInTheDocument();
  });

  it.each(["owner", "admin"] as const)(
    "shows only the anonymized state to %s after retention cleanup",
    async (currentRole) => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          requests: {
            items: [
              {
                ...waitingRequest,
                status: "resolved",
                targetNetwork: null,
                targetMasked: null,
                reason: "retention_period_completed",
                resolvedAt: "2026-06-24T02:00:00.000Z",
                anonymizedAt: "2026-09-24T02:00:00.000Z",
              },
            ],
            total: 1,
            page: 1,
            pageSize: 20,
          },
        }),
      } as Response);

      render(<TrafficProtectionSection currentRole={currentRole} />);

      expect(await screen.findByText("目标已匿名化")).toBeInTheDocument();
      expect(screen.queryByText("8.8.8.8/32")).not.toBeInTheDocument();
      expect(screen.queryByText("8.8.x.x/32")).not.toBeInTheDocument();
    }
  );

  it("loads each visible filter without a page-level refresh control", async () => {
    render(<TrafficProtectionSection currentRole="owner" />);
    await screen.findByText("8.8.8.8/32");

    fireEvent.click(screen.getByRole("button", { name: "生效中" }));
    await waitFor(() => {
      expect(fetch).toHaveBeenLastCalledWith(
        "/api/admin/security/firewall?page=1&status=active",
        { cache: "no-store", credentials: "same-origin" }
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "已结束" }));
    await waitFor(() => {
      expect(fetch).toHaveBeenLastCalledWith(
        "/api/admin/security/firewall?page=1&status=ended",
        { cache: "no-store", credentials: "same-origin" }
      );
    });
    expect(screen.queryByRole("button", { name: /刷新/ })).not.toBeInTheDocument();
  });

  it("keeps failures local and offers retry only after an error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    render(<TrafficProtectionSection currentRole="owner" />);

    expect(await screen.findByText("流量防护数据暂时无法读取。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新加载流量防护" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });

  it("renders an explicit empty state", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        requests: { items: [], total: 0, page: 1, pageSize: 20 },
      }),
    } as Response);
    render(<TrafficProtectionSection currentRole="owner" />);

    expect(await screen.findByText("这个状态下还没有流量防护单。")).toBeInTheDocument();
  });
});
