import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  followUser: vi.fn(),
  cancelFollowRequest: vi.fn(),
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
}));

import { cancelFollowRequest, followUser } from "./relationships";

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
});
