import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  followUser: vi.fn(),
  cancelFollowRequest: vi.fn(),
  getPublicRelationshipSummary: vi.fn(),
  getPublicRelationships: vi.fn(),
  getRelationshipState: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
  })),
}));

vi.mock("@/lib/relationships/service", () => ({
  followUser: mocks.followUser,
  cancelFollowRequest: mocks.cancelFollowRequest,
  unfollowUser: vi.fn(),
  acceptFollowRequest: vi.fn(),
  rejectFollowRequest: vi.fn(),
  removeFollower: vi.fn(),
  setFollowMode: vi.fn(),
  getPublicRelationshipSummary: mocks.getPublicRelationshipSummary,
  getPublicRelationships: mocks.getPublicRelationships,
  getRelationshipState: mocks.getRelationshipState,
}));

import {
  cancelFollowRequest,
  followUser,
  getPublicRelationships,
  getPublicRelationshipSummary,
  getResidentRelationshipState,
} from "./relationships";

const actorId = "11111111-1111-4111-8111-111111111111";
const targetId = "22222222-2222-4222-8222-222222222222";

describe("relationship server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: actorId } },
      error: null,
    });
  });

  it("uses the authenticated session as the follow actor", async () => {
    mocks.followUser.mockResolvedValue({ status: "accepted" });

    await expect(followUser(targetId)).resolves.toMatchObject({
      ok: true,
      relationship: { status: "accepted" },
    });
    expect(mocks.followUser).toHaveBeenCalledWith(actorId, targetId);
  });

  it("does not run a relationship mutation without a session", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(followUser(targetId)).resolves.toEqual({
      ok: false,
      error: "请先登录。",
    });
    expect(mocks.followUser).not.toHaveBeenCalled();
  });

  it("lets the authenticated requester cancel their outgoing pending request", async () => {
    mocks.cancelFollowRequest.mockResolvedValue(true);

    await expect(cancelFollowRequest(targetId)).resolves.toEqual({
      ok: true,
      changed: true,
    });
    expect(mocks.cancelFollowRequest).toHaveBeenCalledWith(actorId, targetId);
  });

  it("reads public relationship counts without requiring a session", async () => {
    mocks.getPublicRelationshipSummary.mockResolvedValue({
      followersCount: 4,
      followingCount: 2,
    });

    await expect(getPublicRelationshipSummary(targetId)).resolves.toEqual({
      ok: true,
      summary: { followersCount: 4, followingCount: 2 },
    });
    expect(mocks.getPublicRelationshipSummary).toHaveBeenCalledWith(targetId);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("uses a fixed public page size and exposes no actor input", async () => {
    mocks.getPublicRelationships.mockResolvedValue({
      items: [],
      total: 0,
      page: 3,
      pageSize: 20,
    });

    await expect(
      getPublicRelationships(targetId, "following", 3)
    ).resolves.toMatchObject({ ok: true, page: { pageSize: 20 } });
    expect(mocks.getPublicRelationships).toHaveBeenCalledWith(
      targetId,
      "following",
      3,
      20
    );
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("derives relationship state actor identity from the authenticated session", async () => {
    mocks.getRelationshipState.mockResolvedValue({
      outboundStatus: "pending",
      inboundStatus: null,
      isFollowing: false,
      isMutual: false,
    });

    await expect(getResidentRelationshipState(targetId)).resolves.toEqual({
      ok: true,
      state: {
        outboundStatus: "pending",
        inboundStatus: null,
        isFollowing: false,
        isMutual: false,
      },
    });
    expect(mocks.getRelationshipState).toHaveBeenCalledWith(actorId, targetId);
  });

  it("returns stable user-safe public read errors", async () => {
    mocks.getPublicRelationshipSummary.mockRejectedValue(
      new Error("private database details")
    );

    await expect(getPublicRelationshipSummary(targetId)).resolves.toEqual({
      ok: false,
      error: "关系资料暂时无法读取。",
    });
  });
});
