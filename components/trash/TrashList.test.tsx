import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  restorePost: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/app/actions/trash", () => ({ restorePost: mocks.restorePost }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

import TrashList from "./TrashList";

const items = [
  {
    id: 1,
    type: "diary" as const,
    title: null,
    content: "还没写完的夜晚",
    status: "draft" as const,
    visibility: "private",
    deleted_at: "2026-09-19T00:00:00.000Z",
    created_at: "2026-09-18T00:00:00.000Z",
    edited_at: null,
    published_at: null,
  },
  {
    id: 2,
    type: "diary" as const,
    title: null,
    content: "已经发布的日记",
    status: "published" as const,
    visibility: "public",
    deleted_at: "2026-09-18T00:00:00.000Z",
    created_at: "2026-09-17T00:00:00.000Z",
    edited_at: null,
    published_at: "2026-09-17T00:00:00.000Z",
  },
  {
    id: 3,
    type: "article" as const,
    title: "未完成的文章",
    content: "草稿内容",
    status: "draft" as const,
    visibility: "private",
    deleted_at: "2026-09-17T00:00:00.000Z",
    created_at: "2026-09-16T00:00:00.000Z",
    edited_at: null,
    published_at: null,
  },
  {
    id: 4,
    type: "article" as const,
    title: "已经发布的文章",
    content: "文章内容",
    status: "published" as const,
    visibility: "public",
    deleted_at: "2026-09-16T00:00:00.000Z",
    created_at: "2026-09-15T00:00:00.000Z",
    edited_at: null,
    published_at: "2026-09-15T00:00:00.000Z",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.restorePost.mockResolvedValue({ ok: true });
});

afterEach(cleanup);

it("shows diary and article trash without losing their original status", () => {
  render(<TrashList items={items} serverNow="2026-09-20T00:00:00.000Z" />);

  expect(screen.getByText("日记 · 草稿")).toBeVisible();
  expect(screen.getByText("日记 · 已发布")).toBeVisible();
  expect(screen.getByText("文章 · 草稿")).toBeVisible();
  expect(screen.getByText("文章 · 已发布")).toBeVisible();
  expect(screen.getByText("未完成的文章")).toBeVisible();
  expect(screen.getAllByText(/天后永久删除/).length).toBe(4);
});

it("restores through the server action and refreshes the trash", async () => {
  render(
    <TrashList items={[items[0]]} serverNow="2026-09-20T00:00:00.000Z" />
  );

  fireEvent.click(screen.getByRole("button", { name: "恢复这篇日记" }));

  await waitFor(() => {
    expect(mocks.restorePost).toHaveBeenCalledWith(1);
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });
});

it("shows the retention explanation when trash is empty", () => {
  render(<TrashList items={[]} serverNow="2026-09-20T00:00:00.000Z" />);

  expect(screen.getByText("垃圾桶现在是空的。")) .toBeVisible();
  expect(screen.getByText("被删除的内容会在这里保留 15 天。")) .toBeVisible();
});
