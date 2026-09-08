"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  acceptFollowRequest as acceptRequest,
  cancelFollowRequest as cancelRequest,
  followUser as createFollow,
  getPublicRelationships as readPublicRelationships,
  getPublicRelationshipSummary as readPublicRelationshipSummary,
  getRelationshipState as readRelationshipState,
  rejectFollowRequest as rejectRequest,
  removeFollower as removeExistingFollower,
  setFollowMode as updateFollowMode,
  unfollowUser as removeFollow,
  type FollowMode,
  type PublicRelationshipKind,
} from "@/lib/relationships/service";

const PUBLIC_RELATIONSHIP_PAGE_SIZE = 20;

export async function followUser(targetUserId: string) {
  return withActor(async (actorId) => ({
    ok: true as const,
    relationship: await createFollow(actorId, targetUserId),
  }));
}

export async function unfollowUser(targetUserId: string) {
  return withActor(async (actorId) => ({
    ok: true as const,
    changed: await removeFollow(actorId, targetUserId),
  }));
}

export async function cancelFollowRequest(targetUserId: string) {
  return withActor(async (actorId) => ({
    ok: true as const,
    changed: await cancelRequest(actorId, targetUserId),
  }));
}

export async function acceptFollowRequest(requestId: string) {
  return withActor(async (actorId) => ({
    ok: true as const,
    relationship: await acceptRequest(actorId, requestId),
  }));
}

export async function rejectFollowRequest(requestId: string) {
  return withActor(async (actorId) => ({
    ok: true as const,
    changed: await rejectRequest(actorId, requestId),
  }));
}

export async function removeFollower(followerId: string) {
  return withActor(async (actorId) => ({
    ok: true as const,
    changed: await removeExistingFollower(actorId, followerId),
  }));
}

export async function setFollowMode(mode: FollowMode) {
  return withActor(async (actorId) => ({
    ok: true as const,
    followMode: await updateFollowMode(actorId, mode),
  }));
}

export async function getPublicRelationshipSummary(residentId: string) {
  return withPublicRead(async () => ({
    ok: true as const,
    summary: await readPublicRelationshipSummary(residentId),
  }));
}

export async function getPublicRelationships(
  residentId: string,
  kind: PublicRelationshipKind,
  page = 1
) {
  return withPublicRead(async () => ({
    ok: true as const,
    page: await readPublicRelationships(
      residentId,
      kind,
      page,
      PUBLIC_RELATIONSHIP_PAGE_SIZE
    ),
  }));
}

export async function getResidentRelationshipState(targetResidentId: string) {
  return withActor(async (actorId) => ({
    ok: true as const,
    state: await readRelationshipState(actorId, targetResidentId),
  }));
}

async function withActor<T>(operation: (actorId: string) => Promise<T>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false as const, error: "请先登录。" };
  }

  try {
    return await operation(user.id);
  } catch {
    return { ok: false as const, error: "关系操作暂时无法完成。" };
  }
}

async function withPublicRead<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch {
    return { ok: false as const, error: "关系资料暂时无法读取。" };
  }
}
