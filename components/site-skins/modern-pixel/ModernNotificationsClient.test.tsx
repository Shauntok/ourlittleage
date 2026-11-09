import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { NotificationRecord } from "@/lib/notifications/model";
import ModernNotificationsClient, { type ModernNotificationsProps } from "./ModernNotificationsClient";
import styles from "./notifications.module.css";

function notice(overrides: Partial<NotificationRecord> = {}): NotificationRecord {
  return {
    id: "notice-1", user_id: "resident-1", title: "第一封来信", content: "今天街角开了新花。",
    type: "announcement", is_read: false, is_important: false, is_starred: false, deleted_at: null,
    created_at: "2026-10-23T08:00:00Z", actor_id: null, post_id: null, comment_id: null,
    actor_count: null, recent_actor_ids: null, last_activity_at: null, ...overrides,
  };
}

function props(overrides: Partial<ModernNotificationsProps> = {}): ModernNotificationsProps {
  return {
    section: "mailbox", tab: "unread", interactionFilter: "all",
    mailboxFilterCounts: { unread: 2, read: 0, important: 0, starred: 0, trash: 0 },
    interactionTabs: [{ key: "all", label: "全部", count: 0 }], interactionUnreadCount: 0,
    filteredNotifications: [notice(), notice({ id: "notice-2", title: "第二封来信", content: "一切都好。" })],
    visibleInteractions: [], actorsById: {}, loading: false, message: "",
    onSectionChange: vi.fn(), onMailboxFilterChange: vi.fn(), onInteractionFilterChange: vi.fn(),
    onMarkRead: vi.fn(async () => {}), onDelete: vi.fn(async () => {}), onRestore: vi.fn(async () => {}),
    onStar: vi.fn(async () => {}), onImportant: vi.fn(async () => {}),
    onAccept: vi.fn(async () => ({ ok: true })), onReject: vi.fn(async () => ({ ok: true })),
    onRefresh: vi.fn(async () => {}), ...overrides,
  };
}

describe("modern pixel post desk", () => {
  it.each(["unread", "read", "important", "starred", "trash"] as const)(
    "uses compact envelopes in the %s mailbox folder",
    (tab) => {
      const item = notice({ is_read: tab === "read", deleted_at: tab === "trash" ? "2026-10-23T09:00:00Z" : null });
      render(<ModernNotificationsClient {...props({ tab, filteredNotifications: [item] })} />);

      expect(screen.getByRole("button", { name: "阅读：第一封来信" })).toHaveClass(styles.envelopeLetter);
      expect(screen.getByRole("region", { name: "读信区" })).toHaveClass(styles.openEnvelope);
      expect(document.querySelector(`.${styles.envelopeSeams}`)).not.toBeNull();
      expect(document.querySelector(`.${styles.openFlap}`)).not.toBeNull();
    }
  );

  it("selects a letter without marking it read, then applies reader actions", () => {
    const input = props();
    render(<ModernNotificationsClient {...input} />);

    fireEvent.click(screen.getByRole("button", { name: "阅读：第二封来信" }));
    expect(screen.getByRole("heading", { name: "第二封来信" })).toBeVisible();
    expect(input.onMarkRead).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "标记为已读" }));
    expect(input.onMarkRead).toHaveBeenCalledWith("notice-2");
    fireEvent.click(screen.getByRole("button", { name: "星标" }));
    expect(input.onStar).toHaveBeenCalledWith("notice-2", false);
    fireEvent.click(screen.getByRole("button", { name: "移到垃圾桶" }));
    expect(input.onDelete).toHaveBeenCalledWith("notice-2");
  });

  it("keeps folders and section switches connected", () => {
    const input = props();
    render(<ModernNotificationsClient {...input} />);
    fireEvent.click(screen.getByRole("tab", { name: "重要" }));
    expect(input.onMailboxFilterChange).toHaveBeenCalledWith("important");
    fireEvent.click(screen.getByRole("tab", { name: /互动/ }));
    expect(input.onSectionChange).toHaveBeenCalledWith("interactions");
  });

  it("allows restoring a deleted letter", () => {
    const input = props({ tab: "trash", filteredNotifications: [notice({ deleted_at: "2026-10-23T09:00:00Z" })] });
    render(<ModernNotificationsClient {...input} />);
    fireEvent.click(screen.getByRole("button", { name: "恢复" }));
    expect(input.onRestore).toHaveBeenCalledWith("notice-1");
    expect(screen.queryByRole("button", { name: "移到垃圾桶" })).not.toBeInTheDocument();
  });

  it("handles a pending relationship request from the reader", async () => {
    const input = props({
      filteredNotifications: [notice({
        type: "follow_request", actor_id: "actor-1", relationship_id: "rel-1",
        relationship: { id: "rel-1", follower_id: "actor-1", following_id: "resident-1", status: "pending", accepted_at: null },
      })],
      actorsById: { "actor-1": { id: "actor-1", username: "小雨", avatar_url: null } },
    });
    render(<ModernNotificationsClient {...input} />);
    fireEvent.click(screen.getByRole("button", { name: "接受关注申请" }));
    await waitFor(() => expect(input.onAccept).toHaveBeenCalledWith("rel-1"));
    await waitFor(() => expect(input.onRefresh).toHaveBeenCalled());
  });

  it.each(["follow", "follow_request", "follow_accepted"])(
    "shows the sender's profile avatar for %s letters",
    (type) => {
      const input = props({
        filteredNotifications: [notice({ type, actor_id: "actor-1" })],
        actorsById: { "actor-1": { id: "actor-1", username: "小雨", avatar_url: "https://example.com/avatar.png" } },
      });
      render(<ModernNotificationsClient {...input} />);
      expect(screen.getByRole("img", { name: "小雨的头像" })).toHaveAttribute("src", "https://example.com/avatar.png");
      expect(screen.queryByRole("img", { name: "默认居民头像" })).not.toBeInTheDocument();
    }
  );

  it("uses the original person icon when an avatar is absent or fails to load", () => {
    const input = props({
      filteredNotifications: [notice({ type: "follow", actor_id: "actor-1" })],
      actorsById: { "actor-1": { id: "actor-1", username: "小雨", avatar_url: null } },
    });
    const { rerender } = render(<ModernNotificationsClient {...input} />);
    expect(screen.getByRole("img", { name: "默认居民头像" })).toBeVisible();

    rerender(<ModernNotificationsClient {...props({
      ...input,
      actorsById: { "actor-1": { id: "actor-1", username: "小雨", avatar_url: "https://example.com/broken.png" } },
    })} />);
    fireEvent.error(screen.getByRole("img", { name: "小雨的头像" }));
    expect(screen.getByRole("img", { name: "默认居民头像" })).toBeVisible();
  });

  it("keeps non-follow letters on their existing icons", () => {
    render(<ModernNotificationsClient {...props({ filteredNotifications: [notice({ actor_id: "actor-1" })], actorsById: { "actor-1": { id: "actor-1", username: "小雨", avatar_url: "https://example.com/avatar.png" } } })} />);
    expect(screen.queryByRole("img", { name: "小雨的头像" })).not.toBeInTheDocument();
  });

  it("keeps interaction notifications in the same reading layout", () => {
    const input = props({
      section: "interactions", visibleInteractions: [notice({ type: "like", title: "有人喜欢了你的内容", actor_id: "actor-1", post_id: 42, post: { id: 42, title: "街角", type: "diary", slug: null } })],
      actorsById: { "actor-1": { id: "actor-1", username: "小雨", avatar_url: null } },
    });
    render(<ModernNotificationsClient {...input} />);
    expect(screen.getByRole("heading", { name: "小雨喜欢了你的日记" })).toBeVisible();
    expect(screen.getByRole("link", { name: /查看相关内容/ })).toHaveAttribute("href", "/diary/42");
    expect(screen.getByRole("button", { name: "阅读：小雨喜欢了你的日记" })).not.toHaveClass(styles.envelopeLetter);
    expect(screen.getByRole("region", { name: "读信区" })).not.toHaveClass(styles.openEnvelope);
  });

  it("distinguishes likes on a comment from likes on a post", () => {
    const input = props({
      section: "interactions", visibleInteractions: [notice({ type: "like", actor_id: "actor-1", comment_id: "comment-1" })],
      actorsById: { "actor-1": { id: "actor-1", username: "小雨", avatar_url: null } },
    });
    render(<ModernNotificationsClient {...input} />);
    expect(screen.getByRole("heading", { name: "小雨喜欢了你的留言" })).toBeVisible();
  });
});
