import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/RoomStatusButton", () => ({ default: () => null }));
vi.mock("@/components/RoomAvatarEditor", () => ({ default: () => null }));
vi.mock("@/components/RoomViewSkinProvider", () => ({
  useRoomViewSkin: () => ({ pixelTime: "day" }),
}));
vi.mock("@/components/TranslatedText", () => ({
  default: ({ text }: { text: string }) => text,
}));
vi.mock("@/components/relationships/ResidentRelationshipControls", () => ({
  default: ({ residentId, username }: { residentId: string; username: string }) => (
    <div data-testid="room-relationship-controls">
      {residentId}:{username}
    </div>
  ),
}));

import UserRoomClient from "./UserRoomClient";

describe("UserRoomClient relationship integration", () => {
  afterEach(cleanup);

  it("places relationship controls in the resident profile area", () => {
    render(
      <UserRoomClient
        profile={{
          id: "22222222-2222-4222-8222-222222222222",
          username: "夜雨",
          avatar_url: null,
          banner_url: null,
          bio: "一间安静的房间。",
          show_joined_days: true,
          show_level: false,
          show_exp: false,
          show_trust_score: false,
        }}
        activeTab="all"
        residentTitle="新住民"
        levelProgress={{ current: 0, percent: 0, text: "" }}
        joinedDays={3}
        isStatusExpired
        visibleBadges={[]}
        publicPosts={[]}
        publicDiaries={[]}
        publicArticles={[]}
        likeCountMapData={[]}
        commentCountMapData={[]}
        roomTheme="from-black via-zinc-950 to-black"
      />
    );

    expect(screen.getByTestId("room-relationship-controls")).toHaveTextContent(
      "22222222-2222-4222-8222-222222222222:夜雨"
    );
    expect(screen.queryByText("新住民")).not.toBeInTheDocument();
    expect(screen.getByText("一间安静的房间。")).toBeVisible();
  });

  it("keeps a full 300-character bio and places residency above the stat cards", () => {
    const bio = "这是我的房间故事。".repeat(37).slice(0, 300);
    const { container } = render(
      <UserRoomClient
        profile={{ id: "owner", username: "住民", banner_url: null, bio, show_joined_days: true, show_level: true }}
        activeTab="all"
        levelProgress={{ current: 0, percent: 0, text: "" }}
        joinedDays={161}
        isStatusExpired
        visibleBadges={[]}
        publicPosts={[]}
        publicDiaries={[]}
        publicArticles={[]}
        likeCountMapData={[]}
        commentCountMapData={[]}
      />
    );

    const biography = container.querySelector("[data-room-skin-details] .safe-pre");
    const info = container.querySelector("[aria-label='居民信息']");
    expect(biography).toHaveTextContent(bio);
    expect(biography?.className).not.toContain("line-clamp");
    expect(info?.querySelector("[data-room-joined-days]")).toHaveTextContent("已在小时代居住 161 天。");
    expect(info?.querySelector("[data-room-joined-days] + [data-room-skin-stats]")).not.toBeNull();
  });

  it("shows at most nine real badges and only a post's own image", () => {
    const badges = Array.from({ length: 11 }, (_, index) => ({
      id: index + 1,
      badges: { name: `徽章${index + 1}`, description: "" },
    }));
    const diary = {
      id: 3,
      type: "diary",
      content: "只有文字的日记。",
      created_at: "2026-10-01T00:00:00Z",
    };
    const article = {
      id: 4,
      type: "article",
      slug: "one",
      title: "带图文章",
      content: "文章内容 ![自己上传的图片](/images/own-photo.webp)",
      created_at: "2026-09-30T00:00:00Z",
    };

    const { container } = render(
      <UserRoomClient
        profile={{ id: "owner", username: "住民", banner_url: null, bio: "你好", show_badges: true }}
        activeTab="all"
        levelProgress={{ current: 0, percent: 0, text: "" }}
        joinedDays={1}
        isStatusExpired
        visibleBadges={badges}
        publicPosts={[diary, article]}
        publicDiaries={[diary]}
        publicArticles={[article]}
        likeCountMapData={[]}
        commentCountMapData={[]}
      />
    );

    expect(container.querySelectorAll("[data-room-skin-badge]")).toHaveLength(9);
    expect(screen.queryByText("徽章10")).not.toBeInTheDocument();
    expect(screen.getByText("只有文字的日记。...")).toBeVisible();
    expect(screen.getAllByRole("img", { name: /配图/ })).toHaveLength(1);
    expect(screen.getByRole("img", { name: "文章配图" })).toHaveAttribute("src", "/images/own-photo.webp");
  });
});
