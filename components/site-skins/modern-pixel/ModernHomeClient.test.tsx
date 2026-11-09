import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ModernHomeClient, { type ModernHomeProps } from "./ModernHomeClient";

vi.mock("@/components/PageTransition", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/RoomStatusButton", () => ({
  default: () => <button type="button">今日状态</button>,
}));

const props: ModernHomeProps = {
  currentUserId: "resident-a",
  displayName: "系小卓呀",
  onlineCount: 1,
  onlineResidents: [{
    id: "resident-a",
    username: "系小卓呀",
    avatar_url: null,
    mood_emoji: null,
    status_message: null,
  }],
  latestDiary: "今天留下的一段日记",
  latestDiaryId: 154,
  latestDiaryDate: "2026-10-18T12:00:00.000Z",
  latestArticle: "新的文章",
  latestArticleSlug: "new-story",
  latestArticleDate: "2026-10-17T12:00:00.000Z",
  announcement: { title: "街区新消息", content: "新的公告内容" },
  unreadCount: 15,
  initialMoodEmoji: "",
  initialStatusMessage: "",
};

describe("ModernHomeClient", () => {
  it("shows the selected street-entry layout with working destinations", () => {
    const { container } = render(<ModernHomeClient {...props} />);

    expect(container.querySelector('[data-home-skin="modern_pixel"]')).not.toBeNull();
    expect(screen.getByRole("heading", { name: "欢迎回来，系小卓呀。" })).not.toBeNull();
    expect(screen.getByRole("link", { name: /写日记/ }).getAttribute("href")).toBe("/diary/new");
    expect(screen.getByRole("link", { name: /写文章/ }).getAttribute("href")).toBe("/articles/new");
    expect(screen.getByRole("link", { name: /信箱与互动/ }).getAttribute("href")).toBe("/notifications");
    expect(screen.getByRole("link", { name: /^我的房间/ }).getAttribute("href")).toBe("/u/%E7%B3%BB%E5%B0%8F%E5%8D%93%E5%91%80");
    expect(screen.getByRole("link", { name: /今天留下的一段日记/ }).getAttribute("href")).toBe("/diary/154");
    expect(screen.getByRole("link", { name: /新的文章/ }).getAttribute("href")).toBe("/articles/new-story");
    expect(screen.getByRole("heading", { name: "街区新消息" })).not.toBeNull();
    expect(container.querySelector('[data-home-announcement-board]')).not.toBeNull();
    expect(screen.getByRole("link", { name: /查看全部公告/ }).getAttribute("href")).toBe("/announcements");
    expect(screen.getByRole("button", { name: "今日状态" })).not.toBeNull();
  });

  it("keeps empty content paths useful", () => {
    render(<ModernHomeClient {...props} announcement={null} latestDiaryId={null} latestArticleSlug={null} onlineResidents={[]} />);

    expect(screen.getByRole("heading", { name: "欢迎来到小时代" })).not.toBeNull();
    expect(screen.getByRole("link", { name: /今天留下的一段日记/ }).getAttribute("href")).toBe("/space/diaries");
    expect(screen.getByRole("link", { name: /新的文章/ }).getAttribute("href")).toBe("/space/articles");
    expect(screen.queryByRole("heading", { name: "此刻在街区里" })).toBeNull();
  });
});
