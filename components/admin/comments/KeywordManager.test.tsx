import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  rpc: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/lib/supabase", () => {
  const query = {
    select: (...args: unknown[]) => {
      mocks.select(...args);
      return query;
    },
    order: (...args: unknown[]) => mocks.order(...args),
    insert: (...args: unknown[]) => mocks.insert(...args),
    update: (...args: unknown[]) => {
      mocks.update(...args);
      return { eq: mocks.eq };
    },
    delete: (...args: unknown[]) => {
      mocks.delete(...args);
      return { eq: mocks.eq };
    },
  };

  return {
    supabase: {
      auth: { getUser: mocks.getUser },
      from: (...args: unknown[]) => {
        mocks.from(...args);
        return query;
      },
      rpc: mocks.rpc,
    },
  };
});

import KeywordManager from "./KeywordManager";

describe("KeywordManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.order.mockResolvedValue({
      data: [
        { id: 1, keyword: "测试词", is_active: true, created_at: "2026-09-12" },
      ],
      error: null,
    });
    mocks.insert.mockResolvedValue({ error: null });
    mocks.eq.mockResolvedValue({ error: null });
    mocks.rpc.mockResolvedValue({ data: 2, error: null });
    mocks.getUser.mockResolvedValue({ data: { user: { id: "owner-id" } } });
  });

  it("keeps the close command in panel mode", async () => {
    render(
      <KeywordManager
        open
        canManage
        onClose={vi.fn()}
        onChanged={vi.fn()}
      />
    );

    expect(await screen.findByRole("button", { name: "关闭检测词库" })).toBeInTheDocument();
  });

  it("omits only the close command in embedded mode and reuses all mutations", async () => {
    const onChanged = vi.fn().mockResolvedValue(undefined);
    render(
      <KeywordManager
        open
        canManage
        onClose={vi.fn()}
        onChanged={onChanged}
        displayMode="embedded"
      />
    );

    expect(await screen.findByText("测试词")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "关闭检测词库" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("输入一个需要人工留意的字眼"), {
      target: { value: "新词" },
    });
    fireEvent.click(screen.getByRole("button", { name: "加入词库" }));
    await waitFor(() => expect(mocks.insert).toHaveBeenCalledWith({
      keyword: "新词",
      created_by: "owner-id",
    }));

    fireEvent.click(screen.getByRole("button", { name: "测试词" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: false })
    ));

    fireEvent.click(screen.getByRole("button", { name: "删除“测试词”" }));
    await waitFor(() => expect(mocks.delete).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "重新检测现有评论" }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("rescan_comment_moderation"));
    expect(mocks.from).toHaveBeenCalledWith("comment_moderation_keywords");
    expect(onChanged).toHaveBeenCalledTimes(4);
  });
});
