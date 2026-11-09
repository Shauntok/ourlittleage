import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminAnnouncementsPage from "./page";

const mocks = vi.hoisted(() => ({
  announcementPayloads: [] as Record<string, unknown>[],
  notificationError: false,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: async () => ({
        data: { user: { id: "owner-id" } },
        error: null,
      }),
    },
    from: (table: string) => {
      if (table === "announcements") {
        return {
          select: () => ({
            order: async () => ({ data: [], error: null }),
          }),
          insert: (payload: Record<string, unknown>) => {
            mocks.announcementPayloads.push(payload);
            return {
              select: () => ({
                single: async () => ({ data: { id: 10, ...payload }, error: null }),
              }),
            };
          },
        };
      }

      if (table === "profiles") {
        return { select: async () => ({ data: [{ id: "resident-id" }], error: null }) };
      }

      if (table === "notifications") {
        return {
          insert: async () => ({
            error: mocks.notificationError ? { message: "notification unavailable" } : null,
          }),
        };
      }

      return { insert: async () => ({ error: null }) };
    },
  },
}));

describe("admin announcement publishing", () => {
  beforeEach(() => {
    mocks.announcementPayloads.length = 0;
    mocks.notificationError = false;
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, published: 0 }),
    })));
  });

  async function fillAnnouncement() {
    render(<AdminAnnouncementsPage />);
    await screen.findByText("公告列表");
    fireEvent.change(screen.getByPlaceholderText("例如：今晚的世界公告"), {
      target: { value: "新公告" },
    });
    fireEvent.change(screen.getByPlaceholderText("写一点想告诉居民们的话……"), {
      target: { value: "公告内容" },
    });
  }

  it("includes the signed-in creator for immediate and scheduled inserts", async () => {
    await fillAnnouncement();
    fireEvent.click(screen.getByRole("button", { name: "立即发布" }));
    await waitFor(() => expect(mocks.announcementPayloads).toHaveLength(1));
    expect(mocks.announcementPayloads[0]).toMatchObject({
      title: "新公告",
      content: "公告内容",
      created_by: "owner-id",
      publish_mode: "now",
    });

    fireEvent.change(screen.getByPlaceholderText("例如：今晚的世界公告"), {
      target: { value: "预约公告" },
    });
    fireEvent.change(screen.getByPlaceholderText("写一点想告诉居民们的话……"), {
      target: { value: "预约内容" },
    });
    fireEvent.click(screen.getByRole("button", { name: /预约发布 先保存/ }));
    fireEvent.click(screen.getByRole("button", { name: "保存预约公告" }));

    await waitFor(() => expect(mocks.announcementPayloads).toHaveLength(2));
    expect(mocks.announcementPayloads[1]).toMatchObject({
      created_by: "owner-id",
      publish_mode: "scheduled",
      is_active: false,
    });
  });

  it("reports a notification failure without claiming the saved announcement failed", async () => {
    mocks.notificationError = true;
    await fillAnnouncement();
    fireEvent.click(screen.getByRole("button", { name: "立即发布" }));

    expect(await screen.findByText("公告已发布，但通知发送失败。请勿重复发布，请检查通知。"))
      .toBeInTheDocument();
    expect(mocks.announcementPayloads).toHaveLength(1);
  });
});
