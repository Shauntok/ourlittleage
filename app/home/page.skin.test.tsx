import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "./page";

const mocks = vi.hoisted(() => ({
  skin: "modern_pixel" as "modern_pixel" | "classic",
  push: vi.fn(),
}));

vi.mock("next/dynamic", () => ({
  default: () => () => <div data-testid="modern-home">现代像素首页</div>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/components/RoomViewSkinProvider", () => ({
  useRoomViewSkin: () => ({ skin: mocks.skin }),
}));

vi.mock("@/components/PageTransition", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/FloatingParticles", () => ({ default: () => null }));
vi.mock("@/components/MouseGlow", () => ({ default: () => null }));
vi.mock("@/components/RoomStatusButton", () => ({ default: () => null }));

vi.mock("@/lib/getHomeAtmosphere", () => ({
  getHomeAtmosphere: () => ({ glow: "", heroTitle: "夜晚慢慢降临。", heroText: "今天快结束了。", quote: "一句话" }),
}));
vi.mock("@/lib/getNightBroadcast", () => ({ getNightBroadcast: () => "街区近况" }));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "resident-a", email: "resident@example.com" } } }) },
    from: (table: string) => {
      let fields = "";
      let isCount = false;
      const query = {
        select: (nextFields: string, options?: { count?: string }) => {
          fields = nextFields;
          isCount = Boolean(options?.count);
          return query;
        },
        gte: () => query,
        eq: () => query,
        is: () => query,
        not: () => query,
        order: () => query,
        limit: () => query,
        single: async () => ({ data: { username: "测试居民", mood_emoji: null, status_message: null } }),
        maybeSingle: async () => {
          if (table === "announcements") return { data: null };
          if (fields.includes("content")) return { data: { id: 1, content: "新日记", published_at: null } };
          return { data: { id: 2, slug: "new-article", title: "新文章", published_at: null } };
        },
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve(isCount ? { count: 0 } : { data: [] }).then(resolve),
      };
      return query;
    },
  },
}));

describe("HomePage skin routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.skin = "modern_pixel";
  });

  it("loads the modern home only for the modern skin", async () => {
    render(<HomePage />);
    await waitFor(() => expect(screen.getByTestId("modern-home")).not.toBeNull());
    expect(screen.queryByRole("heading", { name: "夜晚慢慢降临。" })).toBeNull();
  });

  it("keeps the existing classic home for the classic skin", async () => {
    mocks.skin = "classic";
    render(<HomePage />);
    expect(await screen.findByRole("heading", { name: "夜晚慢慢降临。" })).not.toBeNull();
    expect(screen.queryByTestId("modern-home")).toBeNull();
  });
});
