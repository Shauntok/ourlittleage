import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { getSession: mocks.getSession } },
}));

import UserRelationshipSection from "./UserRelationshipSection";

const fetchMock = vi.fn();
const userId = "973ca71a-0b4b-4756-82b7-75062e22df9a";

const summary = {
  followersCount: 41,
  followingCount: 23,
  mutualCount: 8,
  pendingReceivedCount: 3,
  pendingSentCount: 2,
  followMode: "approval_required",
};

describe("UserRelationshipSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "admin-token" } },
    });
    fetchMock.mockResolvedValue(json({ summary }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows the relationship summary and privacy mode", async () => {
    render(<UserRelationshipSection userId={userId} />);

    expect(await screen.findByText("关系")).toBeInTheDocument();
    expect(screen.getByText("41")).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("需要本人批准")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/admin/users/${userId}/relationships`,
      expect.objectContaining({
        headers: { Authorization: "Bearer admin-token" },
        cache: "no-store",
      })
    );
  });

  it("loads one paginated readable detail list on demand", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ summary }))
      .mockResolvedValueOnce(
        json({
          relationships: {
            items: [
              {
                relationshipId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                residentId: "22222222-2222-4222-8222-222222222222",
                username: "xiaoyu",
                avatarUrl: null,
                status: "accepted",
                relationshipAt: "2026-09-08T03:00:00.000Z",
              },
            ],
            total: 41,
            page: 1,
            pageSize: 20,
          },
        })
      );

    render(<UserRelationshipSection userId={userId} />);
    fireEvent.click(await screen.findByRole("button", { name: /关注者 41/ }));

    expect(await screen.findByText("@xiaoyu")).toBeInTheDocument();
    expect(screen.getByText("22222222-2222-4222-8222-222222222222")).toBeInTheDocument();
    expect(screen.getByText("第 1 / 3 页")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      `/api/admin/users/${userId}/relationships?kind=followers&page=1`,
      expect.any(Object)
    );
  });

  it("keeps the page usable when relationship data fails and can retry", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));

    render(<UserRelationshipSection userId={userId} />);

    expect(await screen.findByText("关系数据暂时无法读取")).toBeInTheDocument();
    fetchMock.mockResolvedValueOnce(json({ summary }));
    fireEvent.click(screen.getByRole("button", { name: "重新加载" }));

    await waitFor(() => expect(screen.getByText("41")).toBeInTheDocument());
  });

  it("does not let a slower previous detail request replace the active list", async () => {
    const followers = deferred<Response>();
    const following = deferred<Response>();
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("kind=followers")) return followers.promise;
      if (url.includes("kind=following")) return following.promise;
      return Promise.resolve(json({ summary }));
    });

    render(<UserRelationshipSection userId={userId} />);
    fireEvent.click(await screen.findByRole("button", { name: /关注者 41/ }));
    fireEvent.click(screen.getByRole("button", { name: /关注中 23/ }));

    following.resolve(detailResponse("newer-list"));
    expect(await screen.findByText("@newer-list")).toBeInTheDocument();

    await act(async () => {
      followers.resolve(detailResponse("stale-list"));
      await followers.promise;
    });
    expect(screen.queryByText("@stale-list")).not.toBeInTheDocument();
    expect(screen.getByText("@newer-list")).toBeInTheDocument();
  });
});

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function detailResponse(username: string) {
  return json({
    relationships: {
      items: [{
        relationshipId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        residentId: "22222222-2222-4222-8222-222222222222",
        username,
        avatarUrl: null,
        status: "accepted",
        relationshipAt: "2026-09-08T03:00:00.000Z",
      }],
      total: 1,
      page: 1,
      pageSize: 20,
    },
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}
