import { describe, expect, it } from "vitest";

import {
  filterInteractionNotifications,
  filterMailboxNotifications,
  getNotificationRelationship,
  getInteractionKind,
  getRelationshipNotificationType,
  isInteractionNotification,
  isRelationshipNotification,
  type NotificationRecord,
} from "./model";

function notification(
  overrides: Partial<NotificationRecord> = {}
): NotificationRecord {
  return {
    id: "notification-1",
    user_id: "resident-1",
    title: "小时代来信",
    content: "今晚也请慢慢生活。",
    type: "system",
    is_read: false,
    is_important: false,
    is_starred: false,
    deleted_at: null,
    created_at: "2026-08-25T00:00:00.000Z",
    actor_id: null,
    post_id: null,
    comment_id: null,
    actor_count: 1,
    recent_actor_ids: [],
    last_activity_at: "2026-08-25T00:00:00.000Z",
    ...overrides,
  };
}

describe("notification interaction classification", () => {
  it.each([
    ["like", "like"],
    ["comment", "comment"],
    ["reply", "reply"],
  ] as const)("classifies explicit %s rows", (type, expected) => {
    const item = notification({ type });

    expect(isInteractionNotification(item)).toBe(true);
    expect(getInteractionKind(item)).toBe(expected);
  });

  it.each([
    ["有人喜欢了你的内容 💗", "like"],
    ["有人喜欢了你的留言 💗", "like"],
    ["有人给你的内容留言了 💬", "comment"],
  ] as const)("classifies legacy title %s without rewriting it", (title, kind) => {
    const item = notification({ title, type: "system" });

    expect(isInteractionNotification(item)).toBe(true);
    expect(getInteractionKind(item)).toBe(kind);
  });

  it.each(["system", "announcement", "badge", "badge_award"])(
    "keeps formal %s notifications in the mailbox",
    (type) => {
      expect(isInteractionNotification(notification({ type }))).toBe(false);
    }
  );

  it("does not mistake a formal feedback message for an interaction", () => {
    expect(
      isInteractionNotification(
        notification({
          type: "system",
          title: "你的反馈已处理完成",
          content: "管理员已经处理了你的反馈。",
        })
      )
    ).toBe(false);
  });
});

describe("notification section filters", () => {
  const rows = [
    notification({ id: "mail", type: "system" }),
    notification({ id: "like", type: "like" }),
    notification({
      id: "legacy-comment",
      title: "有人给你的内容留言了",
    }),
  ];

  it("keeps interactions out of the mailbox", () => {
    expect(filterMailboxNotifications(rows).map((item) => item.id)).toEqual([
      "mail",
    ]);
  });

  it("supports all interaction filters", () => {
    expect(
      filterInteractionNotifications(rows, "all").map((item) => item.id)
    ).toEqual(["like", "legacy-comment"]);
    expect(
      filterInteractionNotifications(rows, "like").map((item) => item.id)
    ).toEqual(["like"]);
    expect(
      filterInteractionNotifications(rows, "comment").map((item) => item.id)
    ).toEqual(["legacy-comment"]);
    expect(filterInteractionNotifications(rows, "reply")).toEqual([]);
  });
});

describe("relationship notification classification", () => {
  it.each(["follow", "follow_request", "follow_accepted"] as const)(
    "keeps %s in the mailbox and out of interactions",
    (type) => {
      const item = notification({ id: type, type });

      expect(getRelationshipNotificationType(item)).toBe(type);
      expect(isRelationshipNotification(item)).toBe(true);
      expect(filterMailboxNotifications([item])).toEqual([item]);
      expect(filterInteractionNotifications([item], "all")).toEqual([]);
    }
  );

  it("normalizes a joined relationship returned as an object or array", () => {
    const relationship = {
      id: "relationship-1",
      follower_id: "rain",
      following_id: "resident-1",
      status: "pending",
      accepted_at: null,
    };

    expect(
      getNotificationRelationship(notification({ relationship }))
    ).toEqual(relationship);
    expect(
      getNotificationRelationship(notification({ relationship: [relationship] }))
    ).toEqual(relationship);
  });

  it("returns null for a missing or empty relationship join", () => {
    expect(getNotificationRelationship(notification())).toBeNull();
    expect(
      getNotificationRelationship(notification({ relationship: [] }))
    ).toBeNull();
  });

  it("keeps unknown types on the generic mailbox path", () => {
    const item = notification({ type: "future_notice" });

    expect(getRelationshipNotificationType(item)).toBeNull();
    expect(isRelationshipNotification(item)).toBe(false);
    expect(filterMailboxNotifications([item])).toEqual([item]);
  });
});
