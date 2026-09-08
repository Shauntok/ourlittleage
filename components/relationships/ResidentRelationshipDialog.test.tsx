import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useState, type ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getList: vi.fn(),
  unfollow: vi.fn(),
  removeFollower: vi.fn(),
}));

vi.mock("@/app/actions/relationships", () => ({
  getPublicRelationships: mocks.getList,
  unfollowUser: mocks.unfollow,
  removeFollower: mocks.removeFollower,
}));

vi.mock("@/components/ui/ConfirmDialog", () => ({
  default: ({
    open,
    title,
    loading,
    onConfirm,
    onCancel,
  }: {
    open: boolean;
    title: string;
    loading?: boolean;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => open ? (
    <div role="alertdialog" aria-label={title}>
      <button type="button" disabled={loading} onClick={onConfirm}>
        确认名单变更
      </button>
      <button type="button" disabled={loading} onClick={onCancel}>
        返回
      </button>
    </div>
  ) : null,
}));

import ResidentRelationshipDialog from "./ResidentRelationshipDialog";
import type { PublicRelationshipItem } from "@/lib/relationships/service";

const residentId = "22222222-2222-4222-8222-222222222222";
const listedResidentId = "11111111-1111-4111-8111-111111111111";

function pageResult({
  page = 1,
  total = 21,
  items = [{
    residentId: listedResidentId,
    username: "小雨",
    avatarUrl: "https://example.com/avatar.jpg",
    relationshipAt: "2026-09-08T00:00:00Z",
  }],
}: {
  page?: number;
  total?: number;
  items?: PublicRelationshipItem[];
} = {}) {
  return { ok: true, page: { items, total, page, pageSize: 20 } };
}

function renderDialog(
  props: Partial<ComponentProps<typeof ResidentRelationshipDialog>> = {}
) {
  return render(
    <ResidentRelationshipDialog
      open
      kind="followers"
      residentId={residentId}
      username="夜雨"
      isOwner={false}
      onClose={vi.fn()}
      onChanged={vi.fn()}
      {...props}
    />
  );
}

describe("ResidentRelationshipDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getList.mockResolvedValue(pageResult());
    mocks.unfollow.mockResolvedValue({ ok: true, changed: true });
    mocks.removeFollower.mockResolvedValue({ ok: true, changed: true });
    document.body.style.overflow = "";
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
  });

  it("renders a public resident row, relationship time, and total-aware pagination", async () => {
    renderDialog();

    const dialog = await screen.findByRole("dialog", { name: "夜雨的关注者" });
    expect(within(dialog).getByRole("img", { name: "小雨的头像" })).toHaveAttribute(
      "src",
      "https://example.com/avatar.jpg"
    );
    expect(within(dialog).getByRole("link", { name: "走进小雨的房间" })).toHaveAttribute(
      "href",
      "/u/%E5%B0%8F%E9%9B%A8"
    );
    expect(within(dialog).getByText("共 21 位")).toBeVisible();
    expect(within(dialog).getByRole("time")).toHaveAttribute(
      "datetime",
      "2026-09-08T00:00:00Z"
    );
    expect(within(dialog).getByRole("button", { name: "上一页" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "下一页" })).toBeEnabled();
  });

  it("shows bounded loading, empty, and retry states", async () => {
    mocks.getList.mockReturnValueOnce(new Promise(() => {}));
    const first = renderDialog();
    expect(screen.getByLabelText("正在读取关注者名单")).toBeVisible();
    first.unmount();

    mocks.getList.mockResolvedValueOnce(pageResult({ total: 0, items: [] }));
    const second = renderDialog();
    expect(await screen.findByText("这个居民目前还没有关注者。")).toBeVisible();
    second.unmount();

    mocks.getList.mockResolvedValueOnce({
      ok: false,
      error: "关系资料暂时无法读取。",
    });
    renderDialog();
    expect(await screen.findByText("关系资料暂时无法读取。")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "重新读取关注者名单" }));
    await waitFor(() => expect(mocks.getList).toHaveBeenCalledTimes(4));
  });

  it("loads pages of 20 without crossing either boundary", async () => {
    mocks.getList
      .mockResolvedValueOnce(pageResult())
      .mockResolvedValueOnce(pageResult({ page: 2 }))
      .mockResolvedValueOnce(pageResult({ page: 1 }));
    renderDialog();

    fireEvent.click(await screen.findByRole("button", { name: "下一页" }));
    await waitFor(() => {
      expect(mocks.getList).toHaveBeenLastCalledWith(
        residentId,
        "followers",
        2
      );
    });
    expect(screen.getByText("第 2 / 2 页")).toBeVisible();
    expect(screen.getByRole("button", { name: "下一页" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "上一页" }));
    await waitFor(() => expect(mocks.getList).toHaveBeenLastCalledWith(
      residentId,
      "followers",
      1
    ));
  });

  it("closes from Escape or backdrop, not an inner click, and restores focus", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>打开关注者</button>
          <ResidentRelationshipDialog
            open={open}
            kind="followers"
            residentId={residentId}
            username="夜雨"
            isOwner={false}
            onClose={() => setOpen(false)}
            onChanged={vi.fn()}
          />
        </>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "打开关注者" });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "夜雨的关注者" });
    await waitFor(() => expect(screen.getByRole("button", { name: "关闭关注者名单" })).toHaveFocus());
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.click(dialog);
    expect(screen.getByRole("dialog", { name: "夜雨的关注者" })).toBeVisible();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    await screen.findByRole("dialog", { name: "夜雨的关注者" });
    fireEvent.click(screen.getByRole("button", { name: "关闭夜雨的关注者名单背景" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("traps keyboard focus inside the open dialog", async () => {
    renderDialog();
    const close = await screen.findByRole("button", { name: "关闭关注者名单" });
    await waitFor(() => expect(close).toHaveFocus());
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(screen.getByRole("button", { name: "下一页" })).toHaveFocus();
  });

  it("keeps rows read-only for visitors", async () => {
    renderDialog({ isOwner: false, kind: "following" });
    await screen.findByRole("dialog", { name: "夜雨正在关注" });
    expect(screen.queryByRole("button", { name: "取消关注小雨" })).toBeNull();
    expect(screen.queryByRole("button", { name: "移除关注者小雨" })).toBeNull();
  });

  it.each([
    ["following", "取消关注小雨", "取消关注？", "unfollow"],
    ["followers", "移除关注者小雨", "移除关注者？", "removeFollower"],
  ] as const)("lets the owner reduce a %s relationship after confirmation", async (
    kind,
    actionLabel,
    confirmTitle,
    operation
  ) => {
    const onChanged = vi.fn();
    renderDialog({ isOwner: true, kind, onChanged });

    fireEvent.click(await screen.findByRole("button", { name: actionLabel }));
    expect(screen.getByRole("alertdialog", { name: confirmTitle })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "确认名单变更" }));

    await waitFor(() => {
      expect(mocks[operation]).toHaveBeenCalledWith(listedResidentId);
      expect(onChanged).toHaveBeenCalledTimes(1);
      expect(mocks.getList).toHaveBeenCalledTimes(2);
    });
  });

  it("steps back after removing the final row on a later page", async () => {
    mocks.getList
      .mockResolvedValueOnce(pageResult({ page: 1 }))
      .mockResolvedValueOnce(pageResult({ page: 2, total: 21 }))
      .mockResolvedValueOnce(pageResult({ page: 2, total: 20, items: [] }))
      .mockResolvedValueOnce(pageResult({ page: 1, total: 20 }));
    renderDialog({ isOwner: true, kind: "following" });

    fireEvent.click(await screen.findByRole("button", { name: "下一页" }));
    fireEvent.click(await screen.findByRole("button", { name: "取消关注小雨" }));
    fireEvent.click(screen.getByRole("button", { name: "确认名单变更" }));

    await waitFor(() => expect(mocks.getList).toHaveBeenLastCalledWith(
      residentId,
      "following",
      1
    ));
    expect(screen.getByText("第 1 / 1 页")).toBeVisible();
  });

  it("disables only the resident whose owner action is running", async () => {
    let finish: ((value: unknown) => void) | undefined;
    mocks.getList.mockResolvedValue(pageResult({
      total: 2,
      items: [
        {
          residentId: listedResidentId,
          username: "小雨",
          avatarUrl: null,
          relationshipAt: "2026-09-08T00:00:00Z",
        },
        {
          residentId: "33333333-3333-4333-8333-333333333333",
          username: "晚风",
          avatarUrl: null,
          relationshipAt: "2026-09-07T00:00:00Z",
        },
      ],
    }));
    mocks.unfollow.mockReturnValue(new Promise((resolve) => {
      finish = resolve;
    }));
    renderDialog({ isOwner: true, kind: "following" });

    fireEvent.click(await screen.findByRole("button", { name: "取消关注小雨" }));
    fireEvent.click(screen.getByRole("button", { name: "确认名单变更" }));

    expect(screen.getByRole("button", { name: "取消关注小雨" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "取消关注晚风" })).toBeEnabled();
    finish?.({ ok: true, changed: true });
    await waitFor(() => expect(mocks.getList).toHaveBeenCalledTimes(2));
  });
});
