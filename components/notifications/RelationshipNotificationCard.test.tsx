import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import RelationshipNotificationCard from "@/components/notifications/RelationshipNotificationCard";
import type {
  NotificationProfile,
  NotificationRecord,
} from "@/lib/notifications/model";

const actor: NotificationProfile = {
  id: "rain",
  username: "小雨",
  avatar_url: "https://example.com/rain.jpg",
};

const baseNotification: NotificationRecord = {
  id: "notification-1",
  user_id: "recipient",
  title: "新的关注申请",
  content: "小雨想关注你的房间，正在等待回应。",
  type: "follow_request",
  is_read: false,
  is_important: false,
  is_starred: false,
  deleted_at: null,
  created_at: "2026-09-08T08:00:00.000Z",
  actor_id: "rain",
  post_id: null,
  comment_id: null,
  relationship_id: "relationship-1",
  actor_count: 1,
  recent_actor_ids: ["rain"],
  last_activity_at: "2026-09-08T08:00:00.000Z",
  relationship: {
    id: "relationship-1",
    follower_id: "rain",
    following_id: "recipient",
    status: "pending",
    accepted_at: null,
  },
};

function renderCard(
  notification: NotificationRecord = baseNotification,
  overrides: Partial<React.ComponentProps<typeof RelationshipNotificationCard>> = {}
) {
  const props: React.ComponentProps<typeof RelationshipNotificationCard> = {
    notification,
    actor,
    onAccept: vi.fn().mockResolvedValue({ ok: true }),
    onReject: vi.fn().mockResolvedValue({ ok: true }),
    onRefresh: vi.fn().mockResolvedValue(undefined),
    onStar: vi.fn(),
    onImportant: vi.fn(),
    onMarkRead: vi.fn(),
    onDelete: vi.fn(),
    onRestore: vi.fn(),
    ...overrides,
  };

  render(<RelationshipNotificationCard {...props} />);
  return props;
}

afterEach(cleanup);

describe("RelationshipNotificationCard", () => {
  it("shows who followed and links to that resident's room", () => {
    renderCard({
      ...baseNotification,
      type: "follow",
      relationship: {
        ...baseNotification.relationship!,
        status: "accepted",
        accepted_at: "2026-09-08T08:00:00.000Z",
      },
    });

    expect(screen.getByText("小雨关注了你")).toBeVisible();
    expect(screen.getByRole("img", { name: "小雨的头像" })).toHaveAttribute(
      "src",
      actor.avatar_url
    );
    expect(screen.getByRole("link", { name: "前往小雨的房间" })).toHaveAttribute(
      "href",
      "/u/%E5%B0%8F%E9%9B%A8"
    );
  });

  it("accepts a pending request once and disables both decisions while waiting", async () => {
    let finish: ((value: { ok: true }) => void) | undefined;
    const onAccept = vi.fn(
      () => new Promise<{ ok: true }>((resolve) => (finish = resolve))
    );
    const onReject = vi.fn().mockResolvedValue({ ok: true });
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    renderCard(baseNotification, { onAccept, onReject, onRefresh });

    const accept = screen.getByRole("button", { name: "接受关注申请" });
    const reject = screen.getByRole("button", { name: "拒绝关注申请" });
    fireEvent.click(accept);
    fireEvent.click(accept);

    expect(onAccept).toHaveBeenCalledOnce();
    expect(onAccept).toHaveBeenCalledWith("relationship-1");
    expect(accept).toBeDisabled();
    expect(reject).toBeDisabled();

    finish?.({ ok: true });
    await waitFor(() => expect(onRefresh).toHaveBeenCalledOnce());
  });

  it("shows an accepted request as resolved without repeat actions", () => {
    renderCard({
      ...baseNotification,
      is_read: true,
      relationship: {
        ...baseNotification.relationship!,
        status: "accepted",
        accepted_at: "2026-09-08T08:05:00.000Z",
      },
    });

    expect(screen.getByText("已接受")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "接受关注申请" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "拒绝关注申请" })
    ).not.toBeInTheDocument();
  });

  it.each([
    ["missing", undefined],
    ["empty", []],
  ])("shows an ended request when the relationship is %s", (_label, relationship) => {
    renderCard({ ...baseNotification, relationship });

    expect(screen.getByText("申请已结束")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "接受关注申请" })
    ).not.toBeInTheDocument();
  });

  it("links an accepted-follow notification to the accepting resident", () => {
    renderCard({
      ...baseNotification,
      type: "follow_accepted",
      content: "小雨接受了你的关注申请。",
      relationship: {
        ...baseNotification.relationship!,
        follower_id: "recipient",
        following_id: "rain",
        status: "accepted",
        accepted_at: "2026-09-08T08:05:00.000Z",
      },
    });

    expect(screen.getByText("小雨接受了你的关注申请")).toBeVisible();
    expect(screen.getByRole("link", { name: "前往小雨的房间" })).toHaveAttribute(
      "href",
      "/u/%E5%B0%8F%E9%9B%A8"
    );
    expect(
      screen.queryByRole("button", { name: "接受关注申请" })
    ).not.toBeInTheDocument();
  });

  it("refreshes authoritative state and gives a quiet message after a server error", async () => {
    const onAccept = vi.fn().mockResolvedValue({
      ok: false,
      error: "internal database details",
    });
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    renderCard(baseNotification, { onAccept, onRefresh });

    fireEvent.click(screen.getByRole("button", { name: "接受关注申请" }));

    expect(
      await screen.findByText("申请暂时无法处理，已重新读取当前状态。")
    ).toBeVisible();
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(screen.queryByText("internal database details")).not.toBeInTheDocument();
  });

  it("keeps the existing mailbox actions available", () => {
    const props = renderCard();

    fireEvent.click(screen.getByRole("button", { name: "星标" }));
    fireEvent.click(screen.getByRole("button", { name: "重要" }));
    fireEvent.click(screen.getByRole("button", { name: "标记为已读" }));
    fireEvent.click(screen.getByRole("button", { name: "删除" }));

    expect(props.onStar).toHaveBeenCalledOnce();
    expect(props.onImportant).toHaveBeenCalledOnce();
    expect(props.onMarkRead).toHaveBeenCalledOnce();
    expect(props.onDelete).toHaveBeenCalledOnce();
  });
});
