import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { NotificationRecord } from "@/lib/notifications/model";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  notificationSelect: vi.fn(),
  notificationOrder: vi.fn(),
  profileIn: vi.fn(),
  notificationUpdate: vi.fn(),
  notificationUpdateFirstEq: vi.fn(),
  notificationUpdateSecondEq: vi.fn(),
  channel: vi.fn(),
  channelOn: vi.fn(),
  channelSubscribe: vi.fn(),
  removeChannel: vi.fn(),
  acceptFollowRequest: vi.fn(),
  rejectFollowRequest: vi.fn(),
}));

vi.mock("@/components/MouseGlow", () => ({ default: () => null }));

vi.mock("@/app/actions/relationships", () => ({
  acceptFollowRequest: mocks.acceptFollowRequest,
  rejectFollowRequest: mocks.rejectFollowRequest,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: (table: string) => {
      if (table === "notifications") {
        return {
          select: mocks.notificationSelect,
          update: mocks.notificationUpdate,
        };
      }

      if (table === "profiles") {
        return {
          select: () => ({ in: mocks.profileIn }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  },
}));

import NotificationsPage from "./page";

const relationship = {
  id: "relationship-1",
  follower_id: "actor-1",
  following_id: "resident-1",
  status: "pending",
  accepted_at: null,
};

function notification(
  overrides: Partial<NotificationRecord> = {}
): NotificationRecord {
  return {
    id: "notice-1",
    user_id: "resident-1",
    title: "新的关注申请",
    content: "小雨想关注你的房间，正在等待回应。",
    type: "follow_request",
    is_read: false,
    is_important: false,
    is_starred: false,
    deleted_at: null,
    created_at: "2026-09-08T08:00:00.000Z",
    actor_id: "actor-1",
    post_id: null,
    comment_id: null,
    relationship_id: "relationship-1",
    actor_count: 1,
    recent_actor_ids: ["actor-1"],
    last_activity_at: "2026-09-08T08:00:00.000Z",
    relationship,
    ...overrides,
  };
}

let rows: NotificationRecord[];
let realtimeCallback: (() => void) | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  rows = [notification()];
  realtimeCallback = undefined;

  mocks.getUser.mockResolvedValue({
    data: { user: { id: "resident-1" } },
    error: null,
  });
  mocks.notificationSelect.mockImplementation(() => ({
    eq: () => ({ order: mocks.notificationOrder }),
  }));
  mocks.notificationOrder.mockImplementation(async () => ({
    data: rows,
    error: null,
  }));
  mocks.profileIn.mockResolvedValue({
    data: [{ id: "actor-1", username: "小雨", avatar_url: null }],
    error: null,
  });
  mocks.notificationUpdate.mockImplementation(() => ({
    eq: mocks.notificationUpdateFirstEq,
  }));
  mocks.notificationUpdateFirstEq.mockImplementation(() => ({
    eq: mocks.notificationUpdateSecondEq,
  }));
  mocks.notificationUpdateSecondEq.mockResolvedValue({ error: null });

  mocks.channelOn.mockImplementation(
    (_event: string, _filter: unknown, callback: () => void) => {
      realtimeCallback = callback;
      return { subscribe: mocks.channelSubscribe };
    }
  );
  mocks.channelSubscribe.mockReturnValue({ topic: "resident-notifications" });
  mocks.channel.mockReturnValue({ on: mocks.channelOn });
  mocks.acceptFollowRequest.mockResolvedValue({ ok: true, relationship });
  mocks.rejectFollowRequest.mockResolvedValue({ ok: true, changed: true });
});

afterEach(cleanup);

describe("NotificationsPage relationship integration", () => {
  it("falls back to legacy notifications when the relationship foreign key is not deployed", async () => {
    const legacyRows = [
      notification({
        id: "badge-1",
        type: "badge",
        title: "你获得了新的徽章",
        content: "你获得了「创世神」。",
        actor_id: null,
        recent_actor_ids: [],
        relationship_id: null,
        relationship: null,
      }),
    ];
    mocks.notificationOrder
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: "PGRST200",
          message:
            "Could not find a relationship between 'notifications' and 'user_follows' in the schema cache",
        },
      })
      .mockResolvedValueOnce({ data: legacyRows, error: null });

    render(<NotificationsPage />);

    expect(await screen.findByText("你获得了新的徽章")).toBeVisible();
    expect(screen.getByRole("tab", { name: /信箱/ })).toHaveTextContent("1");
    expect(mocks.notificationSelect).toHaveBeenCalledTimes(2);
    expect(mocks.notificationSelect.mock.calls[0][0]).toContain(
      "relationship:user_follows!notifications_relationship_id_fkey"
    );
    expect(mocks.notificationSelect.mock.calls[1][0]).not.toContain(
      "relationship:user_follows"
    );
  });

  it("joins relationships and keeps follow notices in the mailbox", async () => {
    rows = [
      notification({ type: "follow", title: "有居民关注了你" }),
      notification({
        id: "like-1",
        type: "like",
        title: "有人喜欢了你的内容",
        relationship_id: null,
        relationship: null,
      }),
    ];

    render(<NotificationsPage />);

    expect(await screen.findByText("小雨关注了你")).toBeVisible();
    expect(mocks.notificationSelect).toHaveBeenCalledWith(
      expect.stringContaining(
        "relationship:user_follows!notifications_relationship_id_fkey"
      )
    );
    expect(screen.getByRole("tab", { name: /信箱/ })).toHaveTextContent("1");
    expect(screen.getByRole("tab", { name: /互动/ })).toHaveTextContent("1");

    fireEvent.click(screen.getByRole("tab", { name: /互动/ }));
    expect(screen.queryByText("小雨关注了你")).not.toBeInTheDocument();
  });

  it("accepts a request by joined relationship id and refreshes the mailbox", async () => {
    const dispatch = vi.spyOn(window, "dispatchEvent");
    mocks.acceptFollowRequest.mockImplementation(async () => {
      rows = [
        notification({
          is_read: true,
          relationship: {
            ...relationship,
            status: "accepted",
            accepted_at: "2026-09-08T08:05:00.000Z",
          },
        }),
      ];
      return { ok: true, relationship: rows[0].relationship };
    });
    render(<NotificationsPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "接受关注申请" })
    );

    await waitFor(() => {
      expect(mocks.acceptFollowRequest).toHaveBeenCalledWith("relationship-1");
      expect(mocks.notificationOrder).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByRole("tab", { name: "已读" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(await screen.findByText("已接受")).toBeVisible();
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "notifications-updated" }));
    dispatch.mockRestore();
  });

  it("rejects a request and performs the same authoritative refresh", async () => {
    mocks.rejectFollowRequest.mockImplementation(async () => {
      rows = [];
      return { ok: true, changed: true };
    });
    render(<NotificationsPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "拒绝关注申请" })
    );

    await waitFor(() => {
      expect(mocks.rejectFollowRequest).toHaveBeenCalledWith("relationship-1");
      expect(mocks.notificationOrder).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByText("小雨想关注你")).not.toBeInTheDocument();
  });

  it("does not offer request actions when the relationship no longer exists", async () => {
    rows = [
      notification({ relationship_id: null, relationship: null }),
    ];
    render(<NotificationsPage />);

    expect(await screen.findByText("申请已结束")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "接受关注申请" })
    ).not.toBeInTheDocument();
  });

  it("keeps an archived request resolved when its relationship id is null", async () => {
    rows = [
      notification({
        relationship_id: null,
        relationship: null,
        is_read: true,
        deleted_at: "2026-09-08T09:00:00.000Z",
      }),
    ];
    render(<NotificationsPage />);

    fireEvent.click(await screen.findByRole("tab", { name: "垃圾桶" }));

    expect(await screen.findByText("申请已结束")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "接受关注申请" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "拒绝关注申请" })
    ).not.toBeInTheDocument();
  });

  it("subscribes only to the current resident and removes the channel", async () => {
    const { unmount } = render(<NotificationsPage />);

    await waitFor(() => expect(mocks.channelOn).toHaveBeenCalled());
    expect(mocks.channelOn).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        table: "notifications",
        filter: "user_id=eq.resident-1",
      }),
      expect.any(Function)
    );

    await act(async () => realtimeCallback?.());
    await waitFor(() => expect(mocks.notificationOrder).toHaveBeenCalledTimes(2));

    unmount();
    expect(mocks.removeChannel).toHaveBeenCalledWith({
      topic: "resident-notifications",
    });
  });

  it("preserves unknown notification types through the generic mailbox card", async () => {
    rows = [
      notification({
        type: "future_notice",
        title: "来自未来的来信",
        content: "这封信仍然可以阅读。",
        actor_id: null,
        recent_actor_ids: [],
        relationship_id: null,
        relationship: null,
      }),
    ];
    render(<NotificationsPage />);

    expect(await screen.findByText("来自未来的来信")).toBeVisible();
    expect(screen.getByText("这封信仍然可以阅读。")).toBeVisible();
  });
});
