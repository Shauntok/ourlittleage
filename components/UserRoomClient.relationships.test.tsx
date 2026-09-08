import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/RoomStatusButton", () => ({ default: () => null }));
vi.mock("@/components/RoomAvatarEditor", () => ({ default: () => null }));
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
    expect(screen.getByText("一间安静的房间。")).toBeVisible();
  });
});
