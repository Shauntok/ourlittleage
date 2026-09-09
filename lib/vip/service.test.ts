import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  getAdminActor: vi.fn(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: { rpc: mocks.rpc },
}));

vi.mock("@/lib/admin/authorization", () => ({
  getAdminActor: mocks.getAdminActor,
}));

import {
  cancelVip,
  extendVip,
  getVipEntitlement,
  getVipFeatureFlags,
  getVipMembership,
  getVipMembershipForAdmin,
  grantVip,
  isVipActive,
  revokeVip,
} from "./service";

const ownerId = "11111111-1111-4111-8111-111111111111";
const residentId = "22222222-2222-4222-8222-222222222222";
const requestId = "33333333-3333-4333-8333-333333333333";
const startedAt = "2026-09-09T00:00:00.000Z";
const expiresAt = "2026-10-09T00:00:00.000Z";

describe("VIP server service", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.getAdminActor.mockReset();
    mocks.getAdminActor.mockResolvedValue({ id: ownerId, role: "owner" });
  });

  it("fails closed when feature flags cannot be read", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "missing function" },
    });

    await expect(getVipFeatureFlags()).resolves.toEqual({
      vipEntitlementEnabled: false,
      vipPublicUiEnabled: false,
      vipPurchaseEnabled: false,
      vipReferralRewardEnabled: false,
      vipPublicBadgeEnabled: false,
    });
  });

  it("treats missing or malformed individual flag values as off", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        vip_entitlement_enabled: "true",
        vip_public_ui_enabled: true,
      },
      error: null,
    });

    await expect(getVipFeatureFlags()).resolves.toEqual({
      vipEntitlementEnabled: false,
      vipPublicUiEnabled: true,
      vipPurchaseEnabled: false,
      vipReferralRewardEnabled: false,
      vipPublicBadgeEnabled: false,
    });
  });

  it("fails closed when entitlement evaluation errors", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "XX000", message: "database unavailable" },
    });

    await expect(getVipEntitlement(residentId)).resolves.toMatchObject({
      isActive: false,
      reason: "unavailable",
      membership: null,
    });
    await expect(isVipActive(residentId)).resolves.toBe(false);
  });

  it("maps an active entitlement returned by the trusted database clock", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        is_active: true,
        reason: "active",
        membership: {
          user_id: residentId,
          status: "active",
          started_at: startedAt,
          expires_at: expiresAt,
          cancel_at_period_end: false,
          created_at: startedAt,
          updated_at: startedAt,
        },
      },
      error: null,
    });

    await expect(getVipEntitlement(residentId)).resolves.toEqual({
      isActive: true,
      reason: "active",
      membership: {
        userId: residentId,
        status: "active",
        startedAt,
        expiresAt,
        cancelAtPeriodEnd: false,
        createdAt: startedAt,
        updatedAt: startedAt,
      },
    });
  });

  it("returns the private current membership through the server-only RPC", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        user_id: residentId,
        status: "cancelled",
        started_at: startedAt,
        expires_at: expiresAt,
        cancel_at_period_end: false,
        created_at: startedAt,
        updated_at: expiresAt,
      },
      error: null,
    });

    await expect(getVipMembership(residentId)).resolves.toMatchObject({
      userId: residentId,
      status: "cancelled",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("vip_get_membership", {
      p_user_id: residentId,
    });
  });

  it("uses the guarded read RPC for owner and admin views", async () => {
    mocks.getAdminActor.mockResolvedValue({ id: ownerId, role: "admin" });
    mocks.rpc.mockResolvedValue({ data: null, error: null });

    await expect(getVipMembershipForAdmin(residentId)).resolves.toBeNull();
    expect(mocks.rpc).toHaveBeenCalledWith("vip_admin_get_membership", {
      p_actor_id: ownerId,
      p_user_id: residentId,
    });
  });

  it("uses explicit timestamps for an owner grant", async () => {
    mocks.rpc.mockResolvedValue({
      data: mutationResult("grant", false),
      error: null,
    });

    await grantVip(residentId, {
      startedAt,
      expiresAt,
      reason: "Founding resident grant",
      requestId,
    });

    expect(mocks.rpc).toHaveBeenCalledWith("vip_apply_membership_event", {
      p_actor_id: ownerId,
      p_user_id: residentId,
      p_event_type: "grant",
      p_started_at: startedAt,
      p_expires_at: expiresAt,
      p_reason: "Founding resident grant",
      p_request_id: requestId,
    });
  });

  it("keeps extend, cancel, and revoke behind the same guarded mutation RPC", async () => {
    mocks.rpc.mockResolvedValue({
      data: mutationResult("extend", false),
      error: null,
    });

    await extendVip(residentId, {
      expiresAt,
      reason: "Manual extension",
      requestId,
    });
    expect(mocks.rpc).toHaveBeenLastCalledWith(
      "vip_apply_membership_event",
      expect.objectContaining({
        p_event_type: "extend",
        p_started_at: null,
        p_expires_at: expiresAt,
      })
    );

    mocks.rpc.mockResolvedValue({
      data: mutationResult("cancel", false),
      error: null,
    });
    await cancelVip(residentId, {
      reason: "Cancelled by owner",
      requestId,
    });
    expect(mocks.rpc).toHaveBeenLastCalledWith(
      "vip_apply_membership_event",
      expect.objectContaining({
        p_event_type: "cancel",
        p_started_at: null,
        p_expires_at: null,
      })
    );

    mocks.rpc.mockResolvedValue({
      data: mutationResult("revoke", false),
      error: null,
    });
    await revokeVip(residentId, {
      reason: "Policy enforcement",
      requestId,
    });
    expect(mocks.rpc).toHaveBeenLastCalledWith(
      "vip_apply_membership_event",
      expect.objectContaining({ p_event_type: "revoke" })
    );
  });

  it("preserves an idempotent replay result from the database", async () => {
    mocks.rpc.mockResolvedValue({
      data: mutationResult("extend", true),
      error: null,
    });

    await expect(
      extendVip(residentId, {
        expiresAt,
        reason: "Retry-safe extension",
        requestId,
      })
    ).resolves.toMatchObject({ idempotent: true, eventType: "extend" });
  });

  it("rejects malformed identifiers and invalid grant windows before the RPC", async () => {
    await expect(
      grantVip("not-an-id", {
        startedAt,
        expiresAt,
        reason: "Invalid actor",
        requestId,
      })
    ).rejects.toThrow("Invalid VIP request");

    await expect(
      grantVip(residentId, {
        startedAt: expiresAt,
        expiresAt: startedAt,
        reason: "Invalid window",
        requestId,
      })
    ).rejects.toThrow("Invalid VIP request");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects VIP writes when the trusted session actor is not an owner", async () => {
    mocks.getAdminActor.mockResolvedValue({ id: ownerId, role: "admin" });

    await expect(
      cancelVip(residentId, {
        reason: "Unauthorized cancellation",
        requestId,
      })
    ).rejects.toThrow("VIP owner access required");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("fails closed for a contradictory active entitlement response", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        is_active: true,
        reason: "active",
        membership: null,
      },
      error: null,
    });

    await expect(getVipEntitlement(residentId)).resolves.toEqual({
      isActive: false,
      reason: "unavailable",
      membership: null,
    });
  });
});

function mutationResult(eventType: string, idempotent: boolean) {
  return {
    idempotent,
    event: {
      id: "44444444-4444-4444-8444-444444444444",
      event_type: eventType,
      request_id: requestId,
    },
    membership: {
      user_id: residentId,
      status: "active",
      started_at: startedAt,
      expires_at: expiresAt,
      cancel_at_period_end: false,
      created_at: startedAt,
      updated_at: startedAt,
    },
  };
}
