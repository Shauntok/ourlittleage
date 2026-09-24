import "server-only";

import { z } from "zod";

import { getAdminActor } from "@/lib/admin/authorization";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  normalizeFirewallHostname,
  parsePublicNetworkTarget,
} from "@/lib/security/network";
import { SecurityServiceError } from "@/lib/security/service";

export type FirewallRequestStatus =
  | "awaiting_external_publish"
  | "active"
  | "resolved"
  | "cancelled"
  | "failed";

export type FirewallRequest = {
  id: string;
  targetReference: string;
  requestType:
    | "block_ip"
    | "block_cidr"
    | "unblock"
    | "rate_limit_observation";
  status: FirewallRequestStatus;
  targetNetwork: string | null;
  targetMasked: string | null;
  hostnameScope: "ourlittleage.com" | "www.ourlittleage.com" | null;
  relatedRequestId: string | null;
  pathMatchMode: "exact" | "prefix" | null;
  pathPattern: string | null;
  httpMethod: string | null;
  windowSeconds: number | null;
  requestThreshold: number | null;
  proposedFollowupAction: "rate_limit" | "challenge" | "deny" | null;
  reason: string;
  requestedBy: string;
  externalRuleId: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  resolvedAt: string | null;
  anonymizedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PagedFirewallRequests = {
  items: FirewallRequest[];
  total: number;
  page: number;
  pageSize: number;
};

export type FirewallRequestFilter = FirewallRequestStatus | "all" | "ended";

export type FirewallRequestMutationResult = {
  idempotent: boolean;
  request: FirewallRequest;
};

export type CreateFirewallRequestInput =
  | {
      requestType: "block_ip" | "block_cidr";
      target: string;
      hostnameScope: "ourlittleage.com" | "www.ourlittleage.com";
      reason: string;
      requestId: string;
    }
  | {
      requestType: "unblock";
      relatedRequestId: string;
      reason: string;
      requestId: string;
    }
  | {
      requestType: "rate_limit_observation";
      pathMatchMode: "exact" | "prefix";
      pathPattern: string;
      httpMethod: string;
      windowSeconds: number;
      requestThreshold: number;
      proposedFollowupAction: "rate_limit" | "challenge" | "deny";
      reason: string;
      requestId: string;
    };

export type TransitionFirewallRequestInput = {
  action:
    | "confirm_external"
    | "cancel"
    | "mark_failed"
    | "complete_observation";
  externalRuleId?: string;
  reason: string;
  requestId: string;
};

type QueryResult = { data: unknown; error: unknown };

export type SecurityFirewallClient = {
  rpc: (
    functionName: string,
    parameters?: Record<string, unknown>
  ) => PromiseLike<QueryResult>;
};

const pageSize = 20;
const uuidSchema = z.string().uuid();
const reasonSchema = z.string().trim().min(1).max(500);
const requestBase = {
  requestId: uuidSchema,
  reason: reasonSchema,
};
const httpMethodSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.enum(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]));
const pathPatternSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^\/(?!\/)/)
  .refine((value) => !value.includes("?") && !value.includes("#"));

const createSchema = z.discriminatedUnion("requestType", [
  z
    .object({
      requestType: z.literal("block_ip"),
      target: z.string().trim().min(1).max(200),
      hostnameScope: z.string().trim().min(1).max(100),
      ...requestBase,
    })
    .strict(),
  z
    .object({
      requestType: z.literal("block_cidr"),
      target: z.string().trim().min(1).max(200),
      hostnameScope: z.string().trim().min(1).max(100),
      ...requestBase,
    })
    .strict(),
  z
    .object({
      requestType: z.literal("unblock"),
      relatedRequestId: uuidSchema,
      ...requestBase,
    })
    .strict(),
  z
    .object({
      requestType: z.literal("rate_limit_observation"),
      pathMatchMode: z.enum(["exact", "prefix"]),
      pathPattern: pathPatternSchema,
      httpMethod: httpMethodSchema,
      windowSeconds: z.number().int().min(10).max(3600),
      requestThreshold: z.number().int().min(10).max(100000),
      proposedFollowupAction: z.enum(["rate_limit", "challenge", "deny"]),
      ...requestBase,
    })
    .strict(),
]);

const transitionSchema = z
  .object({
    action: z.enum([
      "confirm_external",
      "cancel",
      "mark_failed",
      "complete_observation",
    ]),
    externalRuleId: z.string().trim().min(1).max(200).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/).optional(),
    reason: reasonSchema,
    requestId: uuidSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.action === "confirm_external" && !value.externalRuleId) {
      context.addIssue({
        code: "custom",
        path: ["externalRuleId"],
        message: "External rule ID is required",
      });
    }
    if (value.action !== "confirm_external" && value.externalRuleId) {
      context.addIssue({
        code: "custom",
        path: ["externalRuleId"],
        message: "External rule ID is not allowed",
      });
    }
  });

const statuses = new Set<FirewallRequestStatus>([
  "awaiting_external_publish",
  "active",
  "resolved",
  "cancelled",
  "failed",
]);
const requestTypes = new Set<FirewallRequest["requestType"]>([
  "block_ip",
  "block_cidr",
  "unblock",
  "rate_limit_observation",
]);
const hostnames = new Set<NonNullable<FirewallRequest["hostnameScope"]>>([
  "ourlittleage.com",
  "www.ourlittleage.com",
]);
const pathModes = new Set<NonNullable<FirewallRequest["pathMatchMode"]>>([
  "exact",
  "prefix",
]);
const followupActions = new Set<
  NonNullable<FirewallRequest["proposedFollowupAction"]>
>(["rate_limit", "challenge", "deny"]);

export async function getFirewallRequests(
  page: number,
  status: FirewallRequestFilter,
  client: SecurityFirewallClient = supabaseAdmin as unknown as SecurityFirewallClient
): Promise<PagedFirewallRequests> {
  if (!Number.isSafeInteger(page) || page < 1 || page > 1_000_000) {
    throw invalidInput();
  }
  if (status !== "all" && status !== "ended" && !statuses.has(status)) {
    throw invalidInput();
  }

  const actor = await requireActor(["owner", "admin"]);
  const { data, error } = await client.rpc("security_admin_get_firewall_requests", {
    p_actor_id: actor.id,
    p_page: page,
    p_page_size: pageSize,
    p_status: status,
  });

  if (error) throw mapDatabaseError(error);
  return mapPagedRequests(data);
}

export async function createFirewallRequest(
  input: CreateFirewallRequestInput,
  client: SecurityFirewallClient = supabaseAdmin as unknown as SecurityFirewallClient
): Promise<FirewallRequestMutationResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) throw invalidInput();
  const actor = await requireActor(["owner"]);
  const value = parsed.data;

  let parameters: Record<string, unknown>;
  if (value.requestType === "block_ip" || value.requestType === "block_cidr") {
    let target: string;
    let hostname: string;
    try {
      target = parsePublicNetworkTarget(value.target, value.requestType).normalized;
      hostname = normalizeFirewallHostname(value.hostnameScope);
    } catch {
      throw invalidInput();
    }
    parameters = createParameters(actor.id, value, {
      target,
      hostname,
    });
  } else if (value.requestType === "unblock") {
    parameters = createParameters(actor.id, value, {
      relatedRequestId: value.relatedRequestId,
    });
  } else {
    parameters = createParameters(actor.id, value, {
      pathMatchMode: value.pathMatchMode,
      pathPattern: value.pathPattern,
      httpMethod: value.httpMethod,
      windowSeconds: value.windowSeconds,
      requestThreshold: value.requestThreshold,
      proposedFollowupAction: value.proposedFollowupAction,
    });
  }

  const { data, error } = await client.rpc(
    "security_owner_create_firewall_request",
    parameters
  );
  if (error) throw mapDatabaseError(error);
  return mapMutationResult(data);
}

export async function transitionFirewallRequest(
  id: string,
  input: TransitionFirewallRequestInput,
  client: SecurityFirewallClient = supabaseAdmin as unknown as SecurityFirewallClient
): Promise<FirewallRequestMutationResult> {
  if (!uuidSchema.safeParse(id).success) throw invalidInput();
  const parsed = transitionSchema.safeParse(input);
  if (!parsed.success) throw invalidInput();
  const actor = await requireActor(["owner"]);

  const { data, error } = await client.rpc(
    "security_owner_transition_firewall_request",
    {
      p_actor_id: actor.id,
      p_firewall_request_id: id,
      p_request_id: parsed.data.requestId,
      p_action: parsed.data.action,
      p_external_rule_id: parsed.data.externalRuleId ?? null,
      p_reason: parsed.data.reason,
    }
  );
  if (error) throw mapDatabaseError(error);
  return mapMutationResult(data);
}

export async function cleanupExpiredFirewallTargets(
  limit = 100,
  client: SecurityFirewallClient = supabaseAdmin as unknown as SecurityFirewallClient
): Promise<number> {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) {
    throw invalidInput();
  }
  const { data, error } = await client.rpc("security_cleanup_firewall_targets", {
    p_limit: limit,
  });
  if (error) throw mapDatabaseError(error);
  return readCount(data);
}

function createParameters(
  actorId: string,
  value: z.infer<typeof createSchema>,
  fields: {
    target?: string;
    hostname?: string;
    relatedRequestId?: string;
    pathMatchMode?: string;
    pathPattern?: string;
    httpMethod?: string;
    windowSeconds?: number;
    requestThreshold?: number;
    proposedFollowupAction?: string;
  }
) {
  return {
    p_actor_id: actorId,
    p_request_id: value.requestId,
    p_request_type: value.requestType,
    p_target: fields.target ?? null,
    p_hostname: fields.hostname ?? null,
    p_related_request_id: fields.relatedRequestId ?? null,
    p_path_match_mode: fields.pathMatchMode ?? null,
    p_path_pattern: fields.pathPattern ?? null,
    p_http_method: fields.httpMethod ?? null,
    p_window_seconds: fields.windowSeconds ?? null,
    p_request_threshold: fields.requestThreshold ?? null,
    p_proposed_followup_action: fields.proposedFollowupAction ?? null,
    p_reason: value.reason,
  };
}

function mapPagedRequests(value: unknown): PagedFirewallRequests {
  if (!isRecord(value) || !Array.isArray(value.items)) throw internalError();
  return {
    items: value.items.map(mapRequest),
    total: readCount(value.total),
    page: readPositiveInteger(value.page),
    pageSize: readPositiveInteger(value.page_size),
  };
}

function mapMutationResult(value: unknown): FirewallRequestMutationResult {
  if (!isRecord(value) || typeof value.idempotent !== "boolean") {
    throw internalError();
  }
  return { idempotent: value.idempotent, request: mapRequest(value.request) };
}

function mapRequest(value: unknown): FirewallRequest {
  if (!isRecord(value)) throw internalError();
  const requestType = readSetValue(value.request_type, requestTypes);
  const status = readSetValue(value.status, statuses);
  const hostnameScope = readNullableSetValue(value.hostname_scope, hostnames);
  const pathMatchMode = readNullableSetValue(value.path_match_mode, pathModes);
  const proposedFollowupAction = readNullableSetValue(
    value.proposed_followup_action,
    followupActions
  );
  const reason = readNonEmptyString(value.reason);

  return {
    id: readUuid(value.id),
    targetReference: readUuid(value.target_reference),
    requestType,
    status,
    targetNetwork: readNullableString(value.target_network),
    targetMasked: readNullableString(value.target_masked),
    hostnameScope,
    relatedRequestId: readNullableUuid(value.related_request_id),
    pathMatchMode,
    pathPattern: readNullableString(value.path_pattern),
    httpMethod: readNullableString(value.http_method),
    windowSeconds: readNullableInteger(value.window_seconds),
    requestThreshold: readNullableInteger(value.request_threshold),
    proposedFollowupAction,
    reason,
    requestedBy: readUuid(value.requested_by),
    externalRuleId: readNullableString(value.external_rule_id),
    confirmedBy: readNullableUuid(value.confirmed_by),
    confirmedAt: readNullableDate(value.confirmed_at),
    resolvedAt: readNullableDate(value.resolved_at),
    anonymizedAt: readNullableDate(value.anonymized_at),
    createdAt: readDate(value.created_at),
    updatedAt: readDate(value.updated_at),
  };
}

async function requireActor(roles: string[]) {
  const actor = await getAdminActor();
  if (!actor || !actor.role || !roles.includes(actor.role)) {
    throw new SecurityServiceError("forbidden", "Security Center access required");
  }
  return actor;
}

function mapDatabaseError(error: unknown) {
  const code = isRecord(error) && typeof error.code === "string" ? error.code : "";
  if (code === "42501") {
    return new SecurityServiceError("forbidden", "Security Center access required");
  }
  if (code === "P0002") {
    return new SecurityServiceError("not_found", "Firewall request not found");
  }
  if (code === "23505") {
    return new SecurityServiceError("conflict", "Firewall request conflicts with an active request");
  }
  if (["22023", "22P02", "23502", "23503", "23514"].includes(code)) {
    return invalidInput();
  }
  return internalError();
}

function readSetValue<T extends string>(value: unknown, allowed: Set<T>): T {
  if (typeof value !== "string" || !allowed.has(value as T)) throw internalError();
  return value as T;
}

function readNullableSetValue<T extends string>(value: unknown, allowed: Set<T>) {
  return value === null || value === undefined ? null : readSetValue(value, allowed);
}

function readCount(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw internalError();
  }
  return value;
}

function readPositiveInteger(value: unknown) {
  const parsed = readCount(value);
  if (parsed < 1) throw internalError();
  return parsed;
}

function readNullableInteger(value: unknown) {
  return value === null || value === undefined ? null : readCount(value);
}

function readUuid(value: unknown) {
  const parsed = uuidSchema.safeParse(value);
  if (!parsed.success) throw internalError();
  return parsed.data;
}

function readNullableUuid(value: unknown) {
  return value === null || value === undefined ? null : readUuid(value);
}

function readNonEmptyString(value: unknown) {
  if (typeof value !== "string" || !value.trim()) throw internalError();
  return value;
}

function readNullableString(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw internalError();
  return value;
}

function readDate(value: unknown) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw internalError();
  }
  return value;
}

function readNullableDate(value: unknown) {
  return value === null || value === undefined ? null : readDate(value);
}

function invalidInput() {
  return new SecurityServiceError("invalid_input", "Invalid Security Center request");
}

function internalError() {
  return new SecurityServiceError("internal", "Security service unavailable");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
