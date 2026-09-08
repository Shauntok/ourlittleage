"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  acceptFollowRequest as acceptRequest,
  cancelFollowRequest as cancelRequest,
  followUser as createFollow,
  rejectFollowRequest as rejectRequest,
  removeFollower as removeExistingFollower,
  setFollowMode as updateFollowMode,
  unfollowUser as removeFollow,
  type FollowMode,
} from "@/lib/relationships/service";

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
