import "server-only";

import { getAdminActor } from "@/lib/admin/authorization";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type SecurityRiskLevel = "low" | "medium" | "high" | "critical";
export type SecurityReviewStatus =
  | "no_review_required"
  | "pending"
  | "reviewed";

export type SecurityFeatureFlags = {
  securityCenterEnabled: boolean;
  securityEventCollectionEnabled: boolean;
  riskEvaluationEnabled: boolean;
  automaticEnforcementEnabled: boolean;
};

export type SecurityEvent = {
  id: string;
  eventType:
    | "risk_level_changed"
    | "review_marked_pending"
    | "review_marked_complete"
    | "internal_note_updated";
  userId: string | null;
  username: string | null;
  actorId: string | null;
  actorUsername: string | null;
  reason: string;
  severity: SecurityRiskLevel;
  occurredAt: string;
  metadata: Record<string, unknown>;
};

export type PagedSecurityEvents = {
  items: SecurityEvent[];
  total: number;
  page: number;
  pageSize: number;
};

export type WordDetectionMatch = {
  commentId: string;
  residentId: string;
  username: string | null;
  matchedKeywords: string[];
  detectedAt: string;
};

export type SecurityOverview = {
  flags: SecurityFeatureFlags;
  pendingReviewCount: number;
  riskCounts: Record<SecurityRiskLevel, number>;
  events: PagedSecurityEvents;
  wordDetection:
    | {
        available: true;
        activeKeywords: number;
        inactiveKeywords: number;
        pendingComments: number;
        recentMatches: WordDetectionMatch[];
      }
    | { available: false };
};

export type ResidentSecurityOverview = {
  profile: {
    userId: string;
    riskLevel: SecurityRiskLevel;
    reviewStatus: SecurityReviewStatus;
    lastEventAt: string | null;
    lastReviewedAt: string | null;
    reviewedBy: string | null;
    notes: string | null;
    updatedAt: string;
  };
  events: PagedSecurityEvents;
};

export type SecurityRiskActionInput =
  | {
      action: "set_risk";
      riskLevel: SecurityRiskLevel;
      reason: string;
      requestId: string;
    }
  | {
      action: "set_review";
      reviewStatus: SecurityReviewStatus;
      reason: string;
      requestId: string;
    }
  | {
      action: "set_note";
      note: string | null;
      reason: string;
      requestId: string;
    };

export class SecurityServiceError extends Error {
  constructor(
    public readonly kind:
      | "invalid_input"
      | "forbidden"
      | "not_found"
      | "internal",
    message: string
  ) {
    super(message);
    this.name = "SecurityServiceError";
  }
}

type QueryResult = {
  data: unknown;
  error: unknown;
  count?: number | null;
};

type QueryChain = PromiseLike<QueryResult> & {
  eq: (column: string, value: unknown) => QueryChain;
  in: (column: string, values: string[]) => QueryChain;
  order: (
    column: string,
    options?: { ascending?: boolean }
  ) => QueryChain;
  limit: (count: number) => QueryChain;
};

type SecurityDataClient = {
  rpc: (
    functionName: string,
    parameters?: Record<string, unknown>
  ) => PromiseLike<QueryResult>;
  from: (table: string) => {
    select: (
      columns?: string,
      options?: { count?: "exact"; head?: boolean }
    ) => QueryChain;
  };
};

const disabledSecurityFlags: Readonly<SecurityFeatureFlags> = Object.freeze({
  securityCenterEnabled: false,
  securityEventCollectionEnabled: false,
  riskEvaluationEnabled: false,
  automaticEnforcementEnabled: false,
});

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const riskLevels = new Set<SecurityRiskLevel>([
  "low",
  "medium",
  "high",
  "critical",
]);
const reviewStatuses = new Set<SecurityReviewStatus>([
  "no_review_required",
  "pending",
  "reviewed",
]);
const eventTypes = new Set<SecurityEvent["eventType"]>([
  "risk_level_changed",
  "review_marked_pending",
  "review_marked_complete",
  "internal_note_updated",
]);

export async function getSecurityOverview(
  page = 1,
  client: SecurityDataClient = supabaseAdmin as unknown as SecurityDataClient
): Promise<SecurityOverview> {
  assertPage(page);
  const actor = await requireSecurityActor(["owner", "admin"]);
  const { data, error } = await client.rpc("security_admin_get_overview", {
    p_actor_id: actor.id,
    p_page: page,
    p_page_size: 20,
  });

  if (error) throw mapDatabaseError(error);

  const overview = mapSecurityOverview(data);
  const wordDetection = await getWordDetectionSummary(client);

  return { ...overview, wordDetection };
}

export async function getResidentSecurity(
  userId: string,
  page = 1,
  client: SecurityDataClient = supabaseAdmin as unknown as SecurityDataClient
): Promise<ResidentSecurityOverview> {
  assertUuid(userId);
  assertPage(page);
  const actor = await requireSecurityActor(["owner", "admin"]);
  return readResidentSecurity(actor.id, userId, page, client);
}

export async function applyResidentSecurityAction(
  userId: string,
  input: SecurityRiskActionInput,
  client: SecurityDataClient = supabaseAdmin as unknown as SecurityDataClient
): Promise<ResidentSecurityOverview> {
  assertUuid(userId);
  const normalized = normalizeAction(input);
  const actor = await requireSecurityActor(["owner"]);

  const { data, error } = await client.rpc(
    "security_owner_apply_risk_action",
    {
      p_actor_id: actor.id,
      p_user_id: userId,
      p_action: normalized.action,
      p_risk_level: normalized.riskLevel,
      p_review_status: normalized.reviewStatus,
      p_note: normalized.note,
      p_reason: normalized.reason,
      p_request_id: normalized.requestId,
    }
  );

  if (error) throw mapDatabaseError(error);
  assertMutationResult(data);

  return readResidentSecurity(actor.id, userId, 1, client);
}

async function readResidentSecurity(
  actorId: string,
  userId: string,
  page: number,
  client: SecurityDataClient
) {
  const { data, error } = await client.rpc("security_admin_get_resident", {
    p_actor_id: actorId,
    p_user_id: userId,
    p_page: page,
    p_page_size: 10,
  });

  if (error) throw mapDatabaseError(error);
  return mapResidentSecurityOverview(data);
}

async function getWordDetectionSummary(
  client: SecurityDataClient
): Promise<SecurityOverview["wordDetection"]> {
  try {
    const settled = await Promise.allSettled([
      client
        .from("comment_moderation_keywords")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      client
        .from("comment_moderation_keywords")
        .select("id", { count: "exact", head: true })
        .eq("is_active", false),
      client
        .from("comment_moderation_flags")
        .select("comment_id", { count: "exact", head: true })
        .eq("status", "pending"),
      client
        .from("comment_moderation_flags")
        .select("comment_id,matched_keywords,detected_at")
        .eq("status", "pending")
        .order("detected_at", { ascending: false })
        .limit(5),
    ]);

    if (settled.some((result) => result.status === "rejected")) {
      return { available: false };
    }

    const results = settled.map((result) =>
      result.status === "fulfilled" ? result.value : null
    );
    const [activeResult, inactiveResult, pendingResult, recentResult] = results;

    if (
      !activeResult ||
      !inactiveResult ||
      !pendingResult ||
      !recentResult ||
      activeResult.error ||
      inactiveResult.error ||
      pendingResult.error ||
      recentResult.error
    ) {
      return { available: false };
    }

    const activeKeywords = readCount(activeResult.count);
    const inactiveKeywords = readCount(inactiveResult.count);
    const pendingComments = readCount(pendingResult.count);
    const flags = mapModerationFlags(recentResult.data);

    if (flags.length === 0) {
      return {
        available: true,
        activeKeywords,
        inactiveKeywords,
        pendingComments,
        recentMatches: [],
      };
    }

    const commentResult = await client
      .from("comments")
      .select("id,author_id,profiles(username)")
      .in(
        "id",
        flags.map((flag) => flag.commentId)
      );

    if (commentResult.error) return { available: false };
    const comments = mapModerationComments(commentResult.data);
    const commentMap = new Map(comments.map((comment) => [comment.id, comment]));
    const recentMatches = flags.flatMap((flag) => {
      const comment = commentMap.get(flag.commentId);
      if (!comment) return [];
      return [
        {
          commentId: flag.commentId,
          residentId: comment.residentId,
          username: comment.username,
          matchedKeywords: flag.matchedKeywords,
          detectedAt: flag.detectedAt,
        },
      ];
    });

    return {
      available: true,
      activeKeywords,
      inactiveKeywords,
      pendingComments,
      recentMatches,
    };
  } catch {
    return { available: false };
  }
}

function mapSecurityOverview(value: unknown) {
  if (
    !isRecord(value) ||
    !isRecord(value.risk_counts) ||
    !isRecord(value.events)
  ) {
    throw internalError();
  }

  return {
    flags: mapFeatureFlags(value.flags),
    pendingReviewCount: readCount(value.pending_review_count),
    riskCounts: {
      low: readCount(value.risk_counts.low),
      medium: readCount(value.risk_counts.medium),
      high: readCount(value.risk_counts.high),
      critical: readCount(value.risk_counts.critical),
    },
    events: mapPagedEvents(value.events),
  };
}

function mapResidentSecurityOverview(value: unknown): ResidentSecurityOverview {
  if (!isRecord(value) || !isRecord(value.profile) || !isRecord(value.events)) {
    throw internalError();
  }

  const profile = value.profile;
  const riskLevel = readRiskLevel(profile.risk_level);
  const reviewStatus = readReviewStatus(profile.review_status);

  return {
    profile: {
      userId: readUuid(profile.user_id),
      riskLevel,
      reviewStatus,
      lastEventAt: readNullableDate(profile.last_event_at),
      lastReviewedAt: readNullableDate(profile.last_reviewed_at),
      reviewedBy: readNullableUuid(profile.reviewed_by),
      notes: readNullableString(profile.notes),
      updatedAt: readDate(profile.updated_at),
    },
    events: mapPagedEvents(value.events),
  };
}

function mapPagedEvents(value: Record<string, unknown>): PagedSecurityEvents {
  if (!Array.isArray(value.items)) throw internalError();

  return {
    items: value.items.map(mapSecurityEvent),
    total: readCount(value.total),
    page: readPositiveInteger(value.page),
    pageSize: readPositiveInteger(value.page_size),
  };
}

function mapSecurityEvent(value: unknown): SecurityEvent {
  if (!isRecord(value)) throw internalError();
  const eventType = value.event_type;
  const severity = value.severity;

  if (
    typeof value.id !== "string" ||
    typeof eventType !== "string" ||
    !eventTypes.has(eventType as SecurityEvent["eventType"]) ||
    value.category !== "admin" ||
    typeof value.reason !== "string" ||
    !value.reason.trim() ||
    typeof severity !== "string" ||
    !riskLevels.has(severity as SecurityRiskLevel) ||
    value.source !== "security_center_manual" ||
    !isRecord(value.metadata)
  ) {
    throw internalError();
  }

  return {
    id: readUuid(value.id),
    eventType: eventType as SecurityEvent["eventType"],
    userId: readNullableUuid(value.user_id),
    username: readNullableString(value.username),
    actorId: readNullableUuid(value.actor_id),
    actorUsername: readNullableString(value.actor_username),
    reason: value.reason,
    severity: severity as SecurityRiskLevel,
    occurredAt: readDate(value.occurred_at),
    metadata: value.metadata,
  };
}

function mapFeatureFlags(value: unknown): SecurityFeatureFlags {
  if (
    !isRecord(value) ||
    typeof value.security_center_enabled !== "boolean" ||
    typeof value.security_event_collection_enabled !== "boolean" ||
    typeof value.risk_evaluation_enabled !== "boolean" ||
    typeof value.automatic_enforcement_enabled !== "boolean"
  ) {
    return { ...disabledSecurityFlags };
  }

  return {
    securityCenterEnabled: value.security_center_enabled,
    securityEventCollectionEnabled: value.security_event_collection_enabled,
    riskEvaluationEnabled: value.risk_evaluation_enabled,
    automaticEnforcementEnabled: value.automatic_enforcement_enabled,
  };
}

function mapModerationFlags(value: unknown) {
  if (!Array.isArray(value)) throw internalError();

  return value.slice(0, 5).map((row) => {
    if (
      !isRecord(row) ||
      typeof row.comment_id !== "string" ||
      !Array.isArray(row.matched_keywords) ||
      !row.matched_keywords.every((keyword) => typeof keyword === "string")
    ) {
      throw internalError();
    }

    return {
      commentId: row.comment_id,
      matchedKeywords: row.matched_keywords as string[],
      detectedAt: readDate(row.detected_at),
    };
  });
}

function mapModerationComments(value: unknown) {
  if (!Array.isArray(value)) throw internalError();

  return value.map((row) => {
    if (
      !isRecord(row) ||
      typeof row.id !== "string" ||
      typeof row.author_id !== "string"
    ) {
      throw internalError();
    }

    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const username =
      isRecord(profile) && typeof profile.username === "string"
        ? profile.username
        : null;

    return { id: row.id, residentId: row.author_id, username };
  });
}

function normalizeAction(input: SecurityRiskActionInput) {
  if (!isRecord(input)) throw invalidInput();
  const action = input.action;
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  const requestId = typeof input.requestId === "string" ? input.requestId : "";

  if (!reason || reason.length > 500 || !uuidPattern.test(requestId)) {
    throw invalidInput();
  }

  if (action === "set_risk") {
    if (
      typeof input.riskLevel !== "string" ||
      !riskLevels.has(input.riskLevel as SecurityRiskLevel)
    ) {
      throw invalidInput();
    }
    return {
      action,
      riskLevel: input.riskLevel as SecurityRiskLevel,
      reviewStatus: null,
      note: null,
      reason,
      requestId,
    };
  }

  if (action === "set_review") {
    if (
      typeof input.reviewStatus !== "string" ||
      !reviewStatuses.has(input.reviewStatus as SecurityReviewStatus)
    ) {
      throw invalidInput();
    }
    return {
      action,
      riskLevel: null,
      reviewStatus: input.reviewStatus as SecurityReviewStatus,
      note: null,
      reason,
      requestId,
    };
  }

  if (action === "set_note") {
    if (input.note !== null && typeof input.note !== "string") {
      throw invalidInput();
    }
    const note = typeof input.note === "string" ? input.note.trim() || null : null;
    if (note && note.length > 2000) throw invalidInput();
    return {
      action,
      riskLevel: null,
      reviewStatus: null,
      note,
      reason,
      requestId,
    };
  }

  throw invalidInput();
}

function assertMutationResult(value: unknown) {
  if (
    !isRecord(value) ||
    typeof value.idempotent !== "boolean" ||
    !isRecord(value.profile) ||
    !isRecord(value.event)
  ) {
    throw internalError();
  }
}

async function requireSecurityActor(allowedRoles: string[]) {
  const actor = await getAdminActor();

  if (!actor || !actor.role || !allowedRoles.includes(actor.role)) {
    throw new SecurityServiceError(
      "forbidden",
      "Security Center access required"
    );
  }

  return actor;
}

function assertUuid(value: string) {
  if (!uuidPattern.test(value)) throw invalidInput();
}

function assertPage(value: number) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 1_000_000) {
    throw invalidInput();
  }
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

function readRiskLevel(value: unknown): SecurityRiskLevel {
  if (typeof value !== "string" || !riskLevels.has(value as SecurityRiskLevel)) {
    throw internalError();
  }
  return value as SecurityRiskLevel;
}

function readReviewStatus(value: unknown): SecurityReviewStatus {
  if (
    typeof value !== "string" ||
    !reviewStatuses.has(value as SecurityReviewStatus)
  ) {
    throw internalError();
  }
  return value as SecurityReviewStatus;
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

function readUuid(value: unknown) {
  if (typeof value !== "string" || !uuidPattern.test(value)) {
    throw internalError();
  }
  return value;
}

function readNullableUuid(value: unknown) {
  return value === null || value === undefined ? null : readUuid(value);
}

function readNullableString(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw internalError();
  return value;
}

function mapDatabaseError(error: unknown) {
  const code = isRecord(error) && typeof error.code === "string" ? error.code : "";

  if (code === "42501") {
    return new SecurityServiceError("forbidden", "Security Center access required");
  }
  if (code === "P0002") {
    return new SecurityServiceError("not_found", "Security resident not found");
  }
  if (["22023", "22P02", "23502", "23503", "23505", "23514"].includes(code)) {
    return invalidInput();
  }
  return internalError();
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
