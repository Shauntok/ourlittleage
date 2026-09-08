import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: { rpc: mocks.rpc },
}));

import {
  followUser,
  getRelationshipState,
  getResidentRelationshipSummary,
  listResidentRelationships,
} from "./service";

const actorId = "11111111-1111-4111-8111-111111111111";
const targetId = "22222222-2222-4222-8222-222222222222";

describe("relationship server service", () => {
  beforeEach(() => mocks.rpc.mockReset());

  it("creates a follow through the guarded database operation", async () => {
    const row = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      follower_id: actorId,
      following_id: targetId,
      status: "accepted",
      created_at: "2026-09-08T00:00:00Z",
      updated_at: "2026-09-08T00:00:00Z",
      accepted_at: "2026-09-08T00:00:00Z",
    };
    mocks.rpc.mockResolvedValue({ data: row, error: null });

    await expect(followUser(actorId, targetId)).resolves.toEqual(row);
    expect(mocks.rpc).toHaveBeenCalledWith("relationship_follow_user", {
      p_actor_id: actorId,
      p_target_id: targetId,
    });
  });

  it("rejects malformed IDs before reaching the database", async () => {
    await expect(followUser("not-a-uuid", targetId)).rejects.toThrow(
      "Invalid relationship request"
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("returns derived outbound and mutual state", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{
        outbound_status: "accepted",
        inbound_status: "accepted",
        is_following: true,
        is_mutual: true,
      }],
      error: null,
    });

    await expect(getRelationshipState(actorId, targetId)).resolves.toEqual({
      outboundStatus: "accepted",
      inboundStatus: "accepted",
      isFollowing: true,
      isMutual: true,
    });
  });

  it("maps exact admin summary counts and follow mode", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{
        followers_count: 41,
        following_count: 23,
        mutual_count: 8,
        pending_received_count: 3,
        pending_sent_count: 2,
        follow_mode: "approval_required",
      }],
      error: null,
    });

    await expect(
      getResidentRelationshipSummary(actorId, targetId)
    ).resolves.toEqual({
      followersCount: 41,
      followingCount: 23,
      mutualCount: 8,
      pendingReceivedCount: 3,
      pendingSentCount: 2,
      followMode: "approval_required",
    });
  });

  it("requests one bounded relationship page", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{
        relationship_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        resident_id: targetId,
        username: "resident",
        avatar_url: null,
        relationship_status: "accepted",
        relationship_at: "2026-09-08T00:00:00Z",
        total_count: 21,
      }],
      error: null,
    });

    await listResidentRelationships(actorId, targetId, "followers", 2, 20);

    expect(mocks.rpc).toHaveBeenCalledWith(
      "admin_list_resident_relationships",
      {
        p_actor_id: actorId,
        p_resident_id: targetId,
        p_kind: "followers",
        p_limit: 20,
        p_offset: 20,
      }
    );
  });

  it("clamps an empty out-of-range page without losing the exact total", async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: [{
          followers_count: 41,
          following_count: 0,
          mutual_count: 0,
          pending_received_count: 0,
          pending_sent_count: 0,
          follow_mode: "open",
        }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{
          relationship_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          resident_id: targetId,
          username: "resident",
          avatar_url: null,
          relationship_status: "accepted",
          relationship_at: "2026-09-08T00:00:00Z",
          total_count: 41,
        }],
        error: null,
      });

    const result = await listResidentRelationships(
      actorId,
      targetId,
      "followers",
      9,
      20
    );

    expect(result).toMatchObject({ total: 41, page: 3, pageSize: 20 });
    expect(mocks.rpc).toHaveBeenLastCalledWith(
      "admin_list_resident_relationships",
      expect.objectContaining({ p_limit: 20, p_offset: 40 })
    );
  });

  it("does not expose raw database errors", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: new Error("private table internal details"),
    });

    await expect(followUser(actorId, targetId)).rejects.toThrow(
      "Relationship operation failed"
    );
  });
});
