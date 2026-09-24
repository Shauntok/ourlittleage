import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAdminActor } from "@/lib/admin/authorization";
import {
  cleanupExpiredFirewallTargets,
  createFirewallRequest,
  getFirewallRequests,
  transitionFirewallRequest,
} from "./firewall";

vi.mock("@/lib/admin/authorization", () => ({
  getAdminActor: vi.fn(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: { rpc: vi.fn() },
}));

const owner = { id: "60000000-0000-4000-8000-000000000001", role: "owner" };
const admin = { id: "60000000-0000-4000-8000-000000000002", role: "admin" };
const requestId = "61000000-0000-4000-8000-000000000001";
const firewallId = "62000000-0000-4000-8000-000000000001";

const requestRow = {
  id: firewallId,
  target_reference: "63000000-0000-4000-8000-000000000001",
  request_type: "block_ip",
  status: "awaiting_external_publish",
  target_network: "8.8.8.8/32",
  target_masked: "8.8.x.x/32",
  hostname_scope: "www.ourlittleage.com",
  related_request_id: null,
  path_match_mode: null,
  path_pattern: null,
  http_method: null,
  window_seconds: null,
  request_threshold: null,
  proposed_followup_action: null,
  reason: "Review repeated abusive traffic",
  requested_by: owner.id,
  external_rule_id: null,
  confirmed_by: null,
  confirmed_at: null,
  resolved_at: null,
  anonymized_at: null,
  created_at: "2026-09-24T02:00:00.000Z",
  updated_at: "2026-09-24T02:00:00.000Z",
};

function createClient(
  handler: (name: string, parameters?: Record<string, unknown>) => unknown =
    (name) => {
      if (name === "security_admin_get_firewall_requests") {
        return {
          data: { items: [requestRow], total: 1, page: 1, page_size: 20 },
          error: null,
        };
      }
      if (
        name === "security_owner_create_firewall_request" ||
        name === "security_owner_transition_firewall_request"
      ) {
        return {
          data: { idempotent: false, request: requestRow },
          error: null,
        };
      }
      if (name === "security_cleanup_firewall_targets") {
        return { data: 2, error: null };
      }
      throw new Error(`Unexpected RPC: ${name}`);
    }
) {
  return { rpc: vi.fn(async (name: string, parameters?: Record<string, unknown>) => handler(name, parameters)) };
}

describe("Security Firewall service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAdminActor).mockResolvedValue(owner);
  });

  it("maps the paged Owner view and calls only the protected RPC", async () => {
    const client = createClient();

    await expect(getFirewallRequests(1, "all", client as never)).resolves.toMatchObject({
      page: 1,
      pageSize: 20,
      items: [
        expect.objectContaining({
          id: firewallId,
          targetNetwork: "8.8.8.8/32",
          targetMasked: "8.8.x.x/32",
        }),
      ],
    });
    expect(client.rpc).toHaveBeenCalledWith(
      "security_admin_get_firewall_requests",
      {
        p_actor_id: owner.id,
        p_page: 1,
        p_page_size: 20,
        p_status: "all",
      }
    );
  });

  it("allows Admin masked reads and denies Moderator reads before RPC", async () => {
    vi.mocked(getAdminActor).mockResolvedValueOnce(admin);
    const adminClient = createClient(() => ({
      data: {
        items: [{ ...requestRow, target_network: null }],
        total: 1,
        page: 1,
        page_size: 20,
      },
      error: null,
    }));
    await expect(getFirewallRequests(1, "active", adminClient as never)).resolves.toMatchObject({
      items: [{ targetNetwork: null, targetMasked: "8.8.x.x/32" }],
    });

    vi.mocked(getAdminActor).mockResolvedValueOnce({
      id: "60000000-0000-4000-8000-000000000003",
      role: "moderator",
    });
    const moderatorClient = createClient();
    await expect(getFirewallRequests(1, "all", moderatorClient as never)).rejects.toMatchObject({
      kind: "forbidden",
    });
    expect(moderatorClient.rpc).not.toHaveBeenCalled();
  });

  it("normalizes public block targets before the Owner create RPC", async () => {
    const client = createClient();

    await createFirewallRequest(
      {
        requestType: "block_ip",
        target: " 8.8.8.8 ",
        hostnameScope: "www.ourlittleage.com",
        reason: "  Review repeated abusive traffic ",
        requestId,
      },
      client as never
    );

    expect(client.rpc).toHaveBeenCalledWith(
      "security_owner_create_firewall_request",
      {
        p_actor_id: owner.id,
        p_request_id: requestId,
        p_request_type: "block_ip",
        p_target: "8.8.8.8/32",
        p_hostname: "www.ourlittleage.com",
        p_related_request_id: null,
        p_path_match_mode: null,
        p_path_pattern: null,
        p_http_method: null,
        p_window_seconds: null,
        p_request_threshold: null,
        p_proposed_followup_action: null,
        p_reason: "Review repeated abusive traffic",
      }
    );
  });

  it("normalizes a rate-limit observation without accepting query fragments", async () => {
    const client = createClient();

    await createFirewallRequest(
      {
        requestType: "rate_limit_observation",
        pathMatchMode: "prefix",
        pathPattern: " /api/auth ",
        httpMethod: "post",
        windowSeconds: 60,
        requestThreshold: 500,
        proposedFollowupAction: "rate_limit",
        reason: "Observe authentication traffic",
        requestId,
      },
      client as never
    );

    expect(client.rpc).toHaveBeenCalledWith(
      "security_owner_create_firewall_request",
      expect.objectContaining({
        p_path_pattern: "/api/auth",
        p_http_method: "POST",
        p_target: null,
        p_hostname: null,
      })
    );

    await expect(
      createFirewallRequest(
        {
          requestType: "rate_limit_observation",
          pathMatchMode: "prefix",
          pathPattern: "/api/auth?secret=value",
          httpMethod: "POST",
          windowSeconds: 60,
          requestThreshold: 500,
          proposedFollowupAction: "rate_limit",
          reason: "Invalid path",
          requestId,
        },
        client as never
      )
    ).rejects.toMatchObject({ kind: "invalid_input" });
  });

  it("keeps Admin read-only and rejects invalid targets before RPC", async () => {
    vi.mocked(getAdminActor).mockResolvedValueOnce(admin);
    const adminClient = createClient();
    await expect(
      createFirewallRequest(
        {
          requestType: "block_ip",
          target: "8.8.8.8",
          hostnameScope: "www.ourlittleage.com",
          reason: "Admin cannot create",
          requestId,
        },
        adminClient as never
      )
    ).rejects.toMatchObject({ kind: "forbidden" });
    expect(adminClient.rpc).not.toHaveBeenCalled();

    vi.mocked(getAdminActor).mockResolvedValueOnce(owner);
    const invalidClient = createClient();
    await expect(
      createFirewallRequest(
        {
          requestType: "block_ip",
          target: "10.0.0.1",
          hostnameScope: "www.ourlittleage.com",
          reason: "Private address",
          requestId,
        },
        invalidClient as never
      )
    ).rejects.toMatchObject({ kind: "invalid_input" });
    expect(invalidClient.rpc).not.toHaveBeenCalled();
  });

  it("maps lifecycle transition parameters", async () => {
    const client = createClient();

    await transitionFirewallRequest(
      firewallId,
      {
        action: "confirm_external",
        externalRuleId: "ip_rule_123",
        reason: "Published manually in Vercel",
        requestId,
      },
      client as never
    );

    expect(client.rpc).toHaveBeenCalledWith(
      "security_owner_transition_firewall_request",
      {
        p_actor_id: owner.id,
        p_firewall_request_id: firewallId,
        p_request_id: requestId,
        p_action: "confirm_external",
        p_external_rule_id: "ip_rule_123",
        p_reason: "Published manually in Vercel",
      }
    );
  });

  it("rejects malformed RPC data and maps database failures safely", async () => {
    const malformedClient = createClient(() => ({
      data: { items: [{ ...requestRow, status: "invented" }], total: 1, page: 1, page_size: 20 },
      error: null,
    }));
    await expect(getFirewallRequests(1, "all", malformedClient as never)).rejects.toMatchObject({
      kind: "internal",
      message: "Security service unavailable",
    });

    const conflictClient = createClient(() => ({ data: null, error: { code: "23505" } }));
    await expect(
      createFirewallRequest(
        {
          requestType: "block_ip",
          target: "8.8.8.8",
          hostnameScope: "www.ourlittleage.com",
          reason: "Duplicate target",
          requestId,
        },
        conflictClient as never
      )
    ).rejects.toMatchObject({ kind: "conflict" });

    const failedClient = createClient(() => ({
      data: null,
      error: { code: "XX000", message: "raw target 8.8.8.8" },
    }));
    await expect(getFirewallRequests(1, "all", failedClient as never)).rejects.toMatchObject({
      kind: "internal",
      message: "Security service unavailable",
    });
  });

  it("maps the bounded retention cleanup count", async () => {
    const client = createClient();

    await expect(cleanupExpiredFirewallTargets(100, client as never)).resolves.toBe(2);
    expect(client.rpc).toHaveBeenCalledWith("security_cleanup_firewall_targets", {
      p_limit: 100,
    });
  });
});
