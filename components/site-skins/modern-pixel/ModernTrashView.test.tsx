import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  restorePost: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/app/actions/trash", () => ({ restorePost: mocks.restorePost }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

import ModernTrashView from "./ModernTrashView";

const items = [
  { id: 1, type: "diary" as const, title: "旧日记", content: "日记内容", status: "published" as const, visibility: "public", deleted_at: "2026-10-20T12:00:00Z", created_at: "2026-10-01T12:00:00Z", edited_at: null, published_at: null },
  { id: 2, type: "article" as const, title: "旧文章", content: "文章内容", status: "draft" as const, visibility: "private", deleted_at: "2026-10-19T12:00:00Z", created_at: "2026-10-01T12:00:00Z", edited_at: null, published_at: null },
];

beforeEach(() => vi.clearAllMocks());

it("separates diary and article papers and preserves restore actions", async () => {
  mocks.restorePost.mockResolvedValue({ ok: true });
  render(<ModernTrashView items={items} serverNow="2026-10-23T12:00:00Z" loadError={false} />);

  expect(screen.getByRole("region", { name: "已删除的日记" })).toHaveTextContent("旧日记");
  expect(screen.getByRole("region", { name: "已删除的文章" })).toHaveTextContent("旧文章");
  expect(screen.getByText("还剩 12 天")).toBeVisible();
  expect(screen.getByRole("img", { name: /摆尾巴的猫咪/ }).children).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "恢复这篇日记：旧日记" }));
  await waitFor(() => expect(mocks.restorePost).toHaveBeenCalledWith(1));
  await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
});

it("shows an empty paper and a load error without restoring anything", () => {
  const { rerender } = render(<ModernTrashView items={[]} serverNow="2026-10-23T12:00:00Z" loadError={false} />);
  expect(screen.getByText("这里还没有被放下的日记。")).toBeVisible();
  rerender(<ModernTrashView items={[]} serverNow="2026-10-23T12:00:00Z" loadError />);
  expect(screen.getByText("垃圾桶暂时无法打开。")).toBeVisible();
  expect(screen.queryByRole("button", { name: /恢复这篇/ })).not.toBeInTheDocument();
});
