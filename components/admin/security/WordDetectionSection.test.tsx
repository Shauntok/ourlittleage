import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const keywordManager = vi.hoisted(() => vi.fn(() => <div>共享词库管理器</div>));

vi.mock("@/components/admin/comments/KeywordManager", () => ({
  default: keywordManager,
}));

import WordDetectionSection from "./WordDetectionSection";

describe("WordDetectionSection", () => {
  it("shows bounded moderation context without duplicating review actions", () => {
    render(
      <WordDetectionSection
        canManage
        onChanged={vi.fn().mockResolvedValue(undefined)}
        summary={{
          available: true,
          activeKeywords: 8,
          inactiveKeywords: 2,
          pendingComments: 3,
          recentMatches: Array.from({ length: 6 }, (_, index) => ({
            commentId: `comment-${index}`,
            residentId: `resident-${index}`,
            username: `居民${index}`,
            matchedKeywords: [`词${index}`],
            detectedAt: "2026-09-12T10:00:00.000Z",
          })),
        }}
      />
    );

    expect(screen.getByRole("heading", { name: "词语检测" })).toBeInTheDocument();
    expect(screen.getByText("启用词语").nextSibling).toHaveTextContent("8");
    expect(screen.getByText("停用词语").nextSibling).toHaveTextContent("2");
    expect(screen.getByText("待人工检查").nextSibling).toHaveTextContent("3");
    expect(screen.getAllByText(/居民\d/)).toHaveLength(5);
    expect(screen.getByText("共享词库管理器")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /前往评论管理/ })).toHaveAttribute(
      "href",
      "/admin/comments?filter=flagged"
    );
    expect(screen.queryByText(/评论正文/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /隐藏|删除|审核/ })).not.toBeInTheDocument();
    expect(keywordManager).toHaveBeenCalledWith(
      expect.objectContaining({ open: true, canManage: true, displayMode: "embedded" }),
      undefined
    );
  });

  it("keeps unavailable moderation data local to this section", () => {
    render(
      <WordDetectionSection
        canManage={false}
        onChanged={vi.fn().mockResolvedValue(undefined)}
        summary={{ available: false }}
      />
    );

    expect(screen.getByText("词语检测统计暂时无法读取。")).toBeInTheDocument();
    expect(screen.getByText("共享词库管理器")).toBeInTheDocument();
  });
});
