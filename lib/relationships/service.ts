import "server-only";

import { z } from "zod";

import { supabaseAdmin } from "@/lib/supabase-admin";

const uuidSchema = z.uuid();
const followModeSchema = z.enum(["open", "approval_required"]);
const relationshipStatusSchema = z.enum(["pending", "accepted"]);

export type FollowMode = z.infer<typeof followModeSchema>;
export type RelationshipStatus = z.infer<typeof relationshipStatusSchema>;
export type RelationshipListKind =
  | "followers"
  | "following"
  | "mutual"
  | "pending_received"
  | "pending_sent";

export type FollowRelationship = {
  id: string;
  follower_id: string;
  following_id: string;
  status: RelationshipStatus;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
};

export type RelationshipSummary = {
  followersCount: number;
  followingCount: number;
  mutualCount: number;
  pendingReceivedCount: number;
  pendingSentCount: number;
  followMode: FollowMode;
};

export type AdminRelationshipItem = {
  relationshipId: string;
  residentId: string;
  username: string | null;
  avatarUrl: string | null;
  status: RelationshipStatus;
  relationshipAt: string;
};

export type AdminRelationshipPage = {
  items: AdminRelationshipItem[];
  total: number;
  page: number;
  pageSize: number;
};

const followRelationshipSchema = z.object({
  id: uuidSchema,
  follower_id: uuidSchema,
  following_id: uuidSchema,
  status: relationshipStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
  accepted_at: z.string().nullable(),
});

const stateSchema = z.object({
  outbound_status: relationshipStatusSchema.nullable(),
  inbound_status: relationshipStatusSchema.nullable(),
  is_following: z.boolean(),
  is_mutual: z.boolean(),
});

const summarySchema = z.object({
  followers_count: z.number().int().nonnegative(),
  following_count: z.number().int().nonnegative(),
  mutual_count: z.number().int().nonnegative(),
  pending_received_count: z.number().int().nonnegative(),
  pending_sent_count: z.number().int().nonnegative(),
  follow_mode: followModeSchema,
});

const listRowSchema = z.object({
  relationship_id: uuidSchema,
  resident_id: uuidSchema,
  username: z.string().nullable(),
  avatar_url: z.string().nullable(),
  relationship_status: relationshipStatusSchema,
  relationship_at: z.string(),
  total_count: z.number().int().nonnegative(),
});

export async function followUser(actorId: string, targetId: string) {
  return relationshipRpc("relationship_follow_user", actorId, targetId);
}

export async function unfollowUser(actorId: string, targetId: string) {
  return booleanRpc("relationship_unfollow_user", {
    p_actor_id: validUuid(actorId),
    p_target_id: validUuid(targetId),
  });
}

export async function cancelFollowRequest(actorId: string, targetId: string) {
  return booleanRpc("relationship_cancel_pending", {
    p_actor_id: validUuid(actorId),
    p_target_id: validUuid(targetId),
  });
}

export async function acceptFollowRequest(actorId: string, requestId: string) {
  return requestRpc("relationship_accept_request", actorId, requestId);
}

export async function rejectFollowRequest(actorId: string, requestId: string) {
  return booleanRpc("relationship_reject_request", {
    p_actor_id: validUuid(actorId),
    p_request_id: validUuid(requestId),
  });
}

export async function removeFollower(actorId: string, followerId: string) {
  return booleanRpc("relationship_remove_follower", {
    p_actor_id: validUuid(actorId),
    p_follower_id: validUuid(followerId),
  });
}

export async function setFollowMode(actorId: string, mode: FollowMode) {
  const { data, error } = await supabaseAdmin.rpc(
    "relationship_set_follow_mode",
    { p_actor_id: validUuid(actorId), p_follow_mode: followModeSchema.parse(mode) }
  );
  if (error) throw operationError();
  return followModeSchema.parse(data);
}

export async function getRelationshipState(actorId: string, targetId: string) {
  const { data, error } = await supabaseAdmin.rpc("relationship_get_state", {
    p_actor_id: validUuid(actorId),
    p_target_id: validUuid(targetId),
  });
  if (error) throw operationError();
  const row = stateSchema.parse(first(data));
  return {
    outboundStatus: row.outbound_status,
    inboundStatus: row.inbound_status,
    isFollowing: row.is_following,
    isMutual: row.is_mutual,
  };
}

export async function getResidentRelationshipSummary(
  actorId: string,
  residentId: string
): Promise<RelationshipSummary> {
  const { data, error } = await supabaseAdmin.rpc(
    "admin_get_resident_relationship_summary",
    { p_actor_id: validUuid(actorId), p_resident_id: validUuid(residentId) }
  );
  if (error) throw operationError();
  const row = summarySchema.parse(first(data));
  return {
    followersCount: row.followers_count,
    followingCount: row.following_count,
    mutualCount: row.mutual_count,
    pendingReceivedCount: row.pending_received_count,
    pendingSentCount: row.pending_sent_count,
    followMode: row.follow_mode,
  };
}

export async function listResidentRelationships(
  actorId: string,
  residentId: string,
  kind: RelationshipListKind,
  page = 1,
  pageSize = 20
): Promise<AdminRelationshipPage> {
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new Error("Invalid relationship request");
  }
  const validActorId = validUuid(actorId);
  const validResidentId = validUuid(residentId);
  let actualPage = page;
  let rows = await relationshipListRows(
    validActorId,
    validResidentId,
    kind,
    actualPage,
    pageSize
  );
  let total = rows[0]?.total_count || 0;

  if (rows.length === 0 && page > 1) {
    const summary = await getResidentRelationshipSummary(
      validActorId,
      validResidentId
    );
    total = summaryCount(summary, kind);
    const lastPage = Math.max(1, Math.ceil(total / pageSize));

    if (total > 0 && page > lastPage) {
      actualPage = lastPage;
      rows = await relationshipListRows(
        validActorId,
        validResidentId,
        kind,
        actualPage,
        pageSize
      );
    }
  }

  return {
    items: rows.map((row) => ({
      relationshipId: row.relationship_id,
      residentId: row.resident_id,
      username: row.username,
      avatarUrl: row.avatar_url,
      status: row.relationship_status,
      relationshipAt: row.relationship_at,
    })),
    total: rows[0]?.total_count || total,
    page: actualPage,
    pageSize,
  };
}

async function relationshipListRows(
  actorId: string,
  residentId: string,
  kind: RelationshipListKind,
  page: number,
  pageSize: number
) {
  const { data, error } = await supabaseAdmin.rpc(
    "admin_list_resident_relationships",
    {
      p_actor_id: actorId,
      p_resident_id: residentId,
      p_kind: kind,
      p_limit: pageSize,
      p_offset: (page - 1) * pageSize,
    }
  );
  if (error) throw operationError();
  return z.array(listRowSchema).parse(data || []);
}

function summaryCount(
  summary: RelationshipSummary,
  kind: RelationshipListKind
) {
  if (kind === "followers") return summary.followersCount;
  if (kind === "following") return summary.followingCount;
  if (kind === "mutual") return summary.mutualCount;
  if (kind === "pending_received") return summary.pendingReceivedCount;
  return summary.pendingSentCount;
}

async function relationshipRpc(name: string, actorId: string, targetId: string) {
  const { data, error } = await supabaseAdmin.rpc(name, {
    p_actor_id: validUuid(actorId),
    p_target_id: validUuid(targetId),
  });
  if (error) throw operationError();
  return followRelationshipSchema.parse(first(data));
}

async function requestRpc(name: string, actorId: string, requestId: string) {
  const { data, error } = await supabaseAdmin.rpc(name, {
    p_actor_id: validUuid(actorId),
    p_request_id: validUuid(requestId),
  });
  if (error) throw operationError();
  return followRelationshipSchema.parse(first(data));
}

async function booleanRpc(name: string, args: Record<string, string>) {
  const { data, error } = await supabaseAdmin.rpc(name, args);
  if (error) throw operationError();
  return z.boolean().parse(data);
}

function validUuid(value: string) {
  const parsed = uuidSchema.safeParse(value);
  if (!parsed.success) throw new Error("Invalid relationship request");
  return parsed.data;
}

function first(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function operationError() {
  return new Error("Relationship operation failed");
}
