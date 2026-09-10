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

export type VipMembershipEvent = {
  id: string;
  eventType: VipMembershipEventType;
  reason: string;
  actorId: string;
  actorUsername: string | null;
  requestId: string;
  createdAt: string;
  previousState: VipMembership | null;
  newState: VipMembership;
};

export type VipAdminOverview = {
  databaseNow: string;
  flags: VipFeatureFlags;
  membership: VipMembership | null;
  entitlement: VipEntitlement;
  history: {
    items: VipMembershipEvent[];
    total: number;
    page: number;
    pageSize: number;
  };
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

type DurationVipInput = MembershipMutationInput & {
  durationDays: number;
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

export async function getVipAdminOverview(
  userId: string,
  page = 1,
  client: RpcClient = supabaseAdmin as unknown as RpcClient
): Promise<VipAdminOverview> {
  assertUuid(userId);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1_000_000) {
    throw invalidInput();
  }

  const actor = await requireVipActor(["owner", "admin"]);
  const { data, error } = await client.rpc("vip_admin_get_overview", {
    p_actor_id: actor.id,
    p_user_id: userId,
    p_page: page,
    p_page_size: 10,
  });

  if (error) throw mapDatabaseError(error);
  return mapAdminOverview(data);
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
  input: DurationVipInput,
  client: RpcClient = supabaseAdmin as unknown as RpcClient
) {
  assertDurationDays(input.durationDays);
  return mutateVip(userId, "grant", input, input.durationDays, client);
}

export async function extendVip(
  userId: string,
  input: DurationVipInput,
  client: RpcClient = supabaseAdmin as unknown as RpcClient
) {
  assertDurationDays(input.durationDays);
  return mutateVip(userId, "extend", input, input.durationDays, client);
}

export async function cancelVip(
  userId: string,
  input: MembershipMutationInput,
  client: RpcClient = supabaseAdmin as unknown as RpcClient
) {
  return mutateVip(userId, "cancel", input, null, client);
}

export async function revokeVip(
  userId: string,
  input: MembershipMutationInput,
  client: RpcClient = supabaseAdmin as unknown as RpcClient
) {
  return mutateVip(userId, "revoke", input, null, client);
}

async function mutateVip(
  userId: string,
  eventType: VipMembershipEventType,
  input: MembershipMutationInput,
  durationDays: number | null,
  client: RpcClient
): Promise<VipMutationResult> {
  assertUuid(userId);
  assertUuid(input.requestId);
  const reason = input.reason.trim();

  if (!reason || reason.length > 500) {
    throw invalidInput();
  }

  const actor = await requireVipActor(["owner"]);

  const { data, error } = await client.rpc("vip_admin_apply_membership_action", {
    p_actor_id: actor.id,
    p_user_id: userId,
    p_event_type: eventType,
    p_duration_days: durationDays,
    p_reason: reason,
    p_request_id: input.requestId,
  });

  if (error) {
    throw mapDatabaseError(error);
  }

  return mapMutationResult(data);
}

function mapAdminOverview(value: unknown): VipAdminOverview {
  if (!isRecord(value) || !isRecord(value.history)) throw internalError();

  const databaseNow = value.database_now;
  const historyItems = value.history.items;
  if (
    typeof databaseNow !== "string" ||
    !Number.isFinite(Date.parse(databaseNow)) ||
    !Array.isArray(historyItems)
  ) {
    throw internalError();
  }

  return {
    databaseNow,
    flags: mapFeatureFlags(value.flags),
    membership:
      value.membership === null || value.membership === undefined
        ? null
        : mapMembership(value.membership),
    entitlement: mapEntitlement(value.entitlement),
    history: {
      items: historyItems.map(mapMembershipEvent),
      total: readNonNegativeInteger(value.history.total),
      page: readPositiveInteger(value.history.page),
      pageSize: readPositiveInteger(value.history.page_size),
    },
  };
}

function mapFeatureFlags(value: unknown): VipFeatureFlags {
  if (!isRecord(value)) return { ...disabledVipFeatureFlags };
  return {
    vipEntitlementEnabled: value.vip_entitlement_enabled === true,
    vipPublicUiEnabled: value.vip_public_ui_enabled === true,
    vipPurchaseEnabled: value.vip_purchase_enabled === true,
    vipReferralRewardEnabled: value.vip_referral_reward_enabled === true,
    vipPublicBadgeEnabled: value.vip_public_badge_enabled === true,
  };
}

function mapEntitlement(value: unknown): VipEntitlement {
  if (!isRecord(value)) throw internalError();
  const reason = value.reason;
  if (
    typeof value.is_active !== "boolean" ||
    typeof reason !== "string" ||
    !entitlementReasons.has(reason as VipEntitlementReason)
  ) {
    throw internalError();
  }

  const membership =
    value.membership === null || value.membership === undefined
      ? null
      : mapMembership(value.membership);

  return {
    isActive: value.is_active,
    reason: reason as VipEntitlementReason,
    membership,
  };
}

function mapMembershipEvent(value: unknown): VipMembershipEvent {
  if (!isRecord(value)) throw internalError();
  const eventType = value.event_type;
  if (
    typeof value.id !== "string" ||
    typeof eventType !== "string" ||
    !["grant", "extend", "cancel", "revoke"].includes(eventType) ||
    typeof value.reason !== "string" ||
    typeof value.actor_id !== "string" ||
    typeof value.request_id !== "string" ||
    typeof value.created_at !== "string"
  ) {
    throw internalError();
  }

  return {
    id: value.id,
    eventType: eventType as VipMembershipEventType,
    reason: value.reason,
    actorId: value.actor_id,
    actorUsername:
      typeof value.actor_username === "string" ? value.actor_username : null,
    requestId: value.request_id,
    createdAt: value.created_at,
    previousState:
      value.previous_state === null || value.previous_state === undefined
        ? null
        : mapMembership(value.previous_state),
    newState: mapMembership(value.new_state),
  };
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

function assertDurationDays(value: number): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > 3650) {
    throw invalidInput();
  }
}

function readNonNegativeInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw internalError();
  }
  return value;
}

function readPositiveInteger(value: unknown) {
  const parsed = readNonNegativeInteger(value);
  if (parsed < 1) throw internalError();
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
