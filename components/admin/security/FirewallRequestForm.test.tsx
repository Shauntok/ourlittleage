import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import FirewallRequestForm from "./FirewallRequestForm";

const requestId = "74000000-0000-4000-8000-000000000001";

describe("FirewallRequestForm", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: {} }) })
    );
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(requestId);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("switches between network, unblock, and observation fields", () => {
    render(
      <FirewallRequestForm
        activeBlocks={[activeBlock]}
        onCreated={vi.fn()}
      />
    );

    expect(screen.getByLabelText("网络目标")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("防护类型"), {
      target: { value: "rate_limit_observation" },
    });
    expect(screen.getByLabelText("路径范围")).toBeInTheDocument();
    expect(screen.queryByLabelText("网络目标")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("防护类型"), {
      target: { value: "unblock" },
    });
    expect(screen.getByLabelText("现有防护单")).toBeInTheDocument();
  });

  it("shows a visible target error without submitting invalid private input", async () => {
    render(<FirewallRequestForm activeBlocks={[]} onCreated={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("网络目标"), {
      target: { value: "10.0.0.1" },
    });
    fireEvent.change(screen.getByLabelText("原因"), {
      target: { value: "Review suspicious traffic" },
    });
    fireEvent.click(screen.getByRole("button", { name: "建立防护单" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("公开网络");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reuses one request ID after an uncertain network failure", async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ result: {} }) } as Response);
    const onCreated = vi.fn();
    render(<FirewallRequestForm activeBlocks={[]} onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText("网络目标"), {
      target: { value: "8.8.8.8" },
    });
    fireEvent.change(screen.getByLabelText("原因"), {
      target: { value: "Review suspicious traffic" },
    });
    fireEvent.click(screen.getByRole("button", { name: "建立防护单" }));
    expect(await screen.findByText("防护单暂时无法建立，请重试。")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "建立防护单" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());

    const firstBody = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    const secondBody = JSON.parse(String(vi.mocked(fetch).mock.calls[1][1]?.body));
    expect(firstBody.requestId).toBe(requestId);
    expect(secondBody.requestId).toBe(requestId);
    expect(firstBody.target).toBe("8.8.8.8");
  });

  it("shows a credential-free operation summary and safe Vercel link", () => {
    render(<FirewallRequestForm activeBlocks={[]} onCreated={vi.fn()} />);

    expect(screen.getByText("Owner 人工确认")).toBeInTheDocument();
    expect(screen.getByText(/Vercel Firewall/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Bearer|Cookie|VERCEL_TOKEN|CLI/i);
    const link = screen.getByRole("link", { name: "打开 Vercel Dashboard" });
    expect(link).toHaveAttribute("href", "https://vercel.com/dashboard");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });
});

const activeBlock = {
  id: "75000000-0000-4000-8000-000000000001",
  targetReference: "76000000-0000-4000-8000-000000000001",
  requestType: "block_ip" as const,
  status: "active" as const,
  targetNetwork: "8.8.8.8/32",
  targetMasked: "8.8.x.x/32",
  hostnameScope: "www.ourlittleage.com" as const,
  relatedRequestId: null,
  pathMatchMode: null,
  pathPattern: null,
  httpMethod: null,
  windowSeconds: null,
  requestThreshold: null,
  proposedFollowupAction: null,
  reason: "Active fixture",
  requestedBy: "77000000-0000-4000-8000-000000000001",
  externalRuleId: "ip_rule_123",
  confirmedBy: "77000000-0000-4000-8000-000000000001",
  confirmedAt: "2026-09-24T02:00:00.000Z",
  resolvedAt: null,
  anonymizedAt: null,
  createdAt: "2026-09-24T01:00:00.000Z",
  updatedAt: "2026-09-24T02:00:00.000Z",
};
