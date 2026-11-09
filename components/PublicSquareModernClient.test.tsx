import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PublicSquareModernClient from "./PublicSquareModernClient";
import { getFirstPostImage } from "@/lib/post-preview";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://media.example.com"));
afterEach(() => { cleanup(); refresh.mockClear(); vi.unstubAllEnvs(); });

it("only previews a post's own first uploaded image and keeps text-only posts text-only", () => {
  render(<PublicSquareModernClient kind="diary" posts={[
    { id: 1, content: "晴天。\n![院子](https://media.example.com/storage/v1/object/public/images/first.png)\n![窗户](https://media.example.com/storage/v1/object/public/images/second.png)", published_at: "2026-10-18T12:48:00Z", likeCount: 2 },
    { id: 2, content: "只写字的一天。", published_at: "2026-10-17T12:48:00Z" },
  ]} />);
  const first = screen.getByRole("link", { name: /翻开日记：晴天/ });
  expect(first).toHaveAttribute("href", "/diary/1");
  expect(first.querySelector("img")).toHaveAttribute("src", "https://media.example.com/storage/v1/object/public/images/first.png");
  expect(screen.getByRole("link", { name: /翻开日记：只写字的一天/ }).querySelector("img")).toBeNull();
  expect(screen.getAllByRole("button", { name: "最新" })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "刷新" }));
  expect(refresh).toHaveBeenCalledOnce();
});

it("uses article slug links and preserves hot sorting", () => {
  render(<PublicSquareModernClient kind="article" posts={[
    { id: 3, slug: "older", title: "旧故事", content: "正文", published_at: "2026-10-17T12:48:00Z", likeCount: 3 },
    { id: 4, slug: "newer", title: "新故事", content: "正文", published_at: "2026-10-18T12:48:00Z", likeCount: 0 },
  ]} />);
  fireEvent.click(screen.getByRole("button", { name: "热门" }));
  expect(screen.getByRole("link", { name: /阅读文章：旧故事/ })).toHaveAttribute("href", "/articles/older");
  expect(screen.getAllByRole("article")[0]).toHaveTextContent("旧故事");
});

it("rejects non-web image sources", () => {
  expect(getFirstPostImage("![x](javascript:alert)" )).toBeNull();
  expect(getFirstPostImage("![x](https://elsewhere.example/photo.png)" )).toBeNull();
  expect(getFirstPostImage("![x](https://elsewhere.example/storage/v1/object/public/images/photo.png)" )).toBeNull();
});
