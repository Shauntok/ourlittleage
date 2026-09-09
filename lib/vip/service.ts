import "server-only";

import { getAdminActor } from "@/lib/admin/authorization";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type VipFeatureFlags = {
  vipEntitlementEnabled: boolean;
  vipPublicUiEnabled: boolean;
  vipPurchaseEnabled: boolean;
  vipReferralRewardEnabled: boolean;
  vipPublicBadgeEnabled: boolean;
};

export const disabledVipFeatureFlags: Readonly<VipFeatureFlags> = Object.freeze({
  vipEntitlementEnabled: false,
  vipPublicUiEnabled: false,
  vipPurchaseEnabled: false,
  vipReferralRewardEnabled: false,
  vipPublicBadgeEnabled: false,
});
export type VipMembershipStatus = "active" | "cancelled" | "revoked";
export type VipMembershipEventType = "grant" | "extend" | "cancel" | "revoke";
export type VipEntitlementReason =
  | "active"
  | "feature_disabled"
  | "account_restricted"
  | "membership_missing"
  | "inactive_status"
  | "not_started"
  | "expired"
  | "unavailable";

export type VipMembership = {
  userId: string;
  status: VipMembershipStatus;
  startedAt: string;
  expiresAt: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VipEntitlement = {
  isActive: boolean;
  reason: VipEntitlementReason;
  membership: VipMembership | null;
};

export type VipMutationResult = {
  idempotent: boolean;
  eventId: string;
  eventType: VipMembershipEventType;
  requestId: string;
  membership: VipMembership;
};

export class VipServiceError extends Error {
  constructor(
    public readonly kind: "invalid_input" | "forbidden" | "not_found" | "internal",
    message: string
  ) {
    super(message);
    this.name = "VipServiceError";
  }
}

type RpcClient = {
  rpc: (
    functionName: string,
    parameters?: Record<string, unknown>
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

type MembershipMutationInput = {
  reason: string;
  requestId: string;
};

type GrantVipInput = MembershipMutationInput & {
  startedAt: string;
  expiresAt: string;
};

type ExtendVipInput = MembershipMutationInput & {
  expiresAt: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const membershipStatuses = new Set<VipMembershipStatus>([
  "active",
  "cancelled",
  "revoked",
]);
const entitlementReasons = new Set<VipEntitlementReason>([
  "active",
  "feature_disabled",
  "account_restricted",
  "membership_missing",
  "inactive_status",
  "not_started",
  "expired",
  "unavailable",
]);

export async function getVipFeatureFlags(
  client: RpcClient = supabaseAdmin as unknown as RpcClient
): Promise<VipFeatureFlags> {
  try {
    const { data, error } = await client.rpc("vip_get_feature_flags");

    if (error || !isRecord(data)) {
      return { ...disabledVipFeatureFlags };
    }

    return {
      vipEntitlementEnabled: data.vip_entitlement_enabled === true,
      vipPublicUiEnabled: data.vip_public_ui_enabled === true,
      vipPurchaseEnabled: data.vip_purchase_enabled === true,
      vipReferralRewardEnabled: data.vip_referral_reward_enabled === true,
      vipPublicBadgeEnabled: data.vip_public_badge_enabled === true,
    };
  } catch {
    return { ...disabledVipFeatureFlags };
  }
}

export async function getVipMembership(
  userId: string,
  client: RpcClient = supabaseAdmin as unknown as RpcClient
): Promise<VipMembership | null> {
  assertUuid(userId);
  return readMembershipRpc("vip_get_membership", { p_user_id: userId }, client);
}

export async function getVipMembershipForAdmin(
  userId: string,
  client: RpcClient = supabaseAdmin as unknown as RpcClient
): Promise<VipMembership | null> {
  assertUuid(userId);
  const actor = await requireVipActor(["owner", "admin"]);
  return readMembershipRpc(
    "vip_admin_get_membership",
    { p_actor_id: actor.id, p_user_id: userId },
    client
  );
}

export async function getVipEntitlement(
  userId: string,
  client: RpcClient = supabaseAdmin as unknown as RpcClient
): Promise<VipEntitlement> {
  if (!uuidPattern.test(userId)) {
    return unavailableEntitlement();
  }

  try {
    const { data, error } = await client.rpc("vip_get_entitlement", {
      p_user_id: userId,
    });

    if (error || !isRecord(data)) {
      return unavailableEntitlement();
    }

    const reason = data.reason;

    if (
      typeof data.is_active !== "boolean" ||
      typeof reason !== "string" ||
      !entitlementReasons.has(reason as VipEntitlementReason)
    ) {
      return unavailableEntitlement();
    }

    const membership =
      data.membership === null || data.membership === undefined
        ? null
        : mapMembership(data.membership);

    const claimsActive = data.is_active === true;
    const reasonClaimsActive = reason === "active";

    if (
      claimsActive !== reasonClaimsActive ||
      (claimsActive &&
        (!membership ||
          membership.userId !== userId ||
          membership.status !== "active"))
    ) {
      return unavailableEntitlement();
    }

    return {
      isActive: claimsActive,
      reason: reason as VipEntitlementReason,
      membership,
    };
  } catch {
    return unavailableEntitlement();
  }
}

export async function isVipActive(
  userId: string,
  client: RpcClient = supabaseAdmin as unknown as RpcClient
): Promise<boolean> {
  return (await getVipEntitlement(userId, client)).isActive;
}

export async function grantVip(
  userId: string,
  input: GrantVipInput,
  client: RpcClient = supabaseAdmin as unknown as RpcClient
) {
  const startedAt = parseTimestamp(input.startedAt);
  const expiresAt = parseTimestamp(input.expiresAt);

  if (expiresAt <= startedAt) {
    throw invalidInput();
  }

  return mutateVip(
    userId,
    "grant",
    input,
    input.startedAt,
    input.expiresAt,
    client
  );
}

export async function extendVip(
  userId: string,
  input: ExtendVipInput,
  client: RpcClient = supabaseAdmin as unknown as RpcClient
) {
  parseTimestamp(input.expiresAt);

  return mutateVip(
    userId,
    "extend",
    input,
    null,
    input.expiresAt,
    client
  );
}

export async function cancelVip(
  userId: string,
  input: MembershipMutationInput,
  client: RpcClient = supabaseAdmin as unknown as RpcClient
) {
  return mutateVip(userId, "cancel", input, null, null, client);
}

export async function revokeVip(
  userId: string,
  input: MembershipMutationInput,
  client: RpcClient = supabaseAdmin as unknown as RpcClient
) {
  return mutateVip(userId, "revoke", input, null, null, client);
}

async function mutateVip(
  userId: string,
  eventType: VipMembershipEventType,
  input: MembershipMutationInput,
  startedAt: string | null,
  expiresAt: string | null,
  client: RpcClient
): Promise<VipMutationResult> {
  assertUuid(userId);
  assertUuid(input.requestId);
  const reason = input.reason.trim();

  if (!reason || reason.length > 500) {
    throw invalidInput();
  }

  const actor = await requireVipActor(["owner"]);

  const { data, error } = await client.rpc("vip_apply_membership_event", {
    p_actor_id: actor.id,
    p_user_id: userId,
    p_event_type: eventType,
    p_started_at: startedAt,
    p_expires_at: expiresAt,
    p_reason: reason,
    p_request_id: input.requestId,
  });

  if (error) {
    throw mapDatabaseError(error);
  }

  return mapMutationResult(data);
}

async function requireVipActor(allowedRoles: string[]) {
  const actor = await getAdminActor();

  if (!actor || !actor.role || !allowedRoles.includes(actor.role)) {
    throw new VipServiceError("forbidden", "VIP owner access required");
  }

  return actor;
}

async function readMembershipRpc(
  functionName: string,
  parameters: Record<string, unknown>,
  client: RpcClient
): Promise<VipMembership | null> {
  const { data, error } = await client.rpc(functionName, parameters);

  if (error) {
    throw mapDatabaseError(error);
  }

  return data === null || data === undefined ? null : mapMembership(data);
}

function mapMembership(value: unknown): VipMembership {
  if (!isRecord(value)) {
    throw internalError();
  }

  const status = value.status;

  if (
    typeof value.user_id !== "string" ||
    !uuidPattern.test(value.user_id) ||
    typeof status !== "string" ||
    !membershipStatuses.has(status as VipMembershipStatus) ||
    typeof value.started_at !== "string" ||
    typeof value.expires_at !== "string" ||
    typeof value.cancel_at_period_end !== "boolean" ||
    typeof value.created_at !== "string" ||
    typeof value.updated_at !== "string"
  ) {
    throw internalError();
  }

  const startedAt = Date.parse(value.started_at);
  const expiresAt = Date.parse(value.expires_at);

  if (
    !Number.isFinite(startedAt) ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= startedAt
  ) {
    throw internalError();
  }

  return {
    userId: value.user_id,
    status: status as VipMembershipStatus,
    startedAt: value.started_at,
    expiresAt: value.expires_at,
    cancelAtPeriodEnd: value.cancel_at_period_end,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

function mapMutationResult(value: unknown): VipMutationResult {
  if (!isRecord(value) || !isRecord(value.event)) {
    throw internalError();
  }

  const eventType = value.event.event_type;

  if (
    typeof value.idempotent !== "boolean" ||
    typeof value.event.id !== "string" ||
    typeof eventType !== "string" ||
    !["grant", "extend", "cancel", "revoke"].includes(eventType) ||
    typeof value.event.request_id !== "string"
  ) {
    throw internalError();
  }

  return {
    idempotent: value.idempotent,
    eventId: value.event.id,
    eventType: eventType as VipMembershipEventType,
    requestId: value.event.request_id,
    membership: mapMembership(value.membership),
  };
}

function unavailableEntitlement(): VipEntitlement {
  return { isActive: false, reason: "unavailable", membership: null };
}

function assertUuid(value: string): void {
  if (!uuidPattern.test(value)) {
    throw invalidInput();
  }
}

function parseTimestamp(value: string): number {
  const parsed = Date.parse(value);

  if (!Number.isFinite(parsed)) {
    throw invalidInput();
  }

  return parsed;
}

function mapDatabaseError(error: unknown): VipServiceError {
  const code = isRecord(error) && typeof error.code === "string" ? error.code : "";

  if (code === "42501") {
    return new VipServiceError("forbidden", "VIP owner access required");
  }

  if (code === "P0002") {
    return new VipServiceError("not_found", "VIP resident not found");
  }

  if (["22023", "22P02", "23502", "23503", "23505", "23514"].includes(code)) {
    return invalidInput();
  }

  return internalError();
}

function invalidInput(): VipServiceError {
  return new VipServiceError("invalid_input", "Invalid VIP request");
}

function internalError(): VipServiceError {
  return new VipServiceError("internal", "VIP service unavailable");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
