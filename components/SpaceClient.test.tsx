import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import SpaceClient, { type SpacePost } from "./SpaceClient";
import styles from "./site-skins/modern-pixel/space.module.css";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("presents the daytime pixel town while preserving its destinations and feeds", () => {
  const { container } = render(
    <SpaceClient
      activeFeed="latest-diaries"
      latestDiaries={[]}
      latestArticles={[]}
      hotDiaries={[]}
      hotArticles={[]}
    />
  );

  expect(screen.getByRole("img", { name: "广场的喷泉、树荫和街区公告栏" })).toBeInTheDocument();
  expect(container.querySelector('main[data-nav-scene="space"]')).not.toBeNull();
  expect(screen.getByRole("heading", { name: "广场" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /日记广场/ })).toHaveAttribute(
    "href",
    "/space/diaries"
  );
  expect(screen.getByRole("link", { name: /文章广场/ })).toHaveAttribute(
    "href",
    "/space/articles"
  );
  const headings = screen.getAllByRole("heading").map((heading) => heading.textContent);
  expect(headings).toContain("最新日记");
  expect(headings).toContain("热门日记");
  expect(headings).not.toContain("最新文章");
  expect(headings).toContain("热门文章");
  expect(screen.getByRole("link", { name: "最新文章" })).toHaveAttribute("href", "/space?feed=latest-articles");
  const lowerSections = container.querySelector(`.${styles.desktopSections}`);
  expect(lowerSections).not.toBeNull();
  expect(within(lowerSections as HTMLElement).queryByRole("heading", { name: "最新文章" })).not.toBeInTheDocument();
});

it("keeps diary IDs and article slugs in the quick-browse layout", () => {
  const diary: SpacePost = {
    id: 42,
    title: "晴天的一页",
    slug: null,
    content: "今天去了广场。",
    type: "diary",
    published_at: "2026-10-20T08:00:00.000Z",
    created_at: "2026-10-20T08:00:00.000Z",
    author_id: "resident-1",
  };
  const article: SpacePost = {
    ...diary,
    id: 43,
    title: "街角的故事",
    slug: "street-story",
    type: "article",
  };

  render(
    <SpaceClient
      activeFeed="latest-diaries"
      latestDiaries={[diary]}
      latestArticles={[article]}
      hotDiaries={[]}
      hotArticles={[]}
    />
  );

  expect(screen.getAllByRole("link", { name: /晴天的一页/ })[0]).toHaveAttribute("href", "/diary/42");
  const carousel = screen.getByRole("region", { name: "最新内容轮播" });
  fireEvent.click(within(carousel).getByRole("button", { name: "显示最新文章" }));
  expect(within(carousel).getByRole("link", { name: /街角的故事/ })).toHaveAttribute("href", "/articles/street-story");
});

it("keeps the latest article feed available on mobile", () => {
  render(
    <SpaceClient
      activeFeed="latest-articles"
      latestDiaries={[]}
      latestArticles={[]}
      hotDiaries={[]}
      hotArticles={[]}
    />
  );

  expect(screen.getByRole("link", { name: "最新文章" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("heading", { name: "最新文章" })).toBeInTheDocument();
});

it("rotates latest content after ten seconds and pauses while hovered", () => {
  vi.useFakeTimers();
  render(
    <SpaceClient
      activeFeed="latest-diaries"
      latestDiaries={[]}
      latestArticles={[]}
      hotDiaries={[]}
      hotArticles={[]}
    />
  );

  const carousel = screen.getByRole("region", { name: "最新内容轮播" });
  expect(within(carousel).getByRole("heading", { name: "最新日记" })).toBeInTheDocument();

  act(() => vi.advanceTimersByTime(5000));
  fireEvent.mouseEnter(carousel);
  act(() => vi.advanceTimersByTime(15000));
  expect(within(carousel).getByRole("heading", { name: "最新日记" })).toBeInTheDocument();

  fireEvent.mouseLeave(carousel);
  act(() => vi.advanceTimersByTime(9999));
  expect(within(carousel).getByRole("heading", { name: "最新日记" })).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1));
  expect(within(carousel).getByRole("heading", { name: "最新文章" })).toBeInTheDocument();
  expect(within(carousel).getByRole("button", { name: "显示最新文章" })).toHaveAttribute("aria-pressed", "true");
});

it("lets the reader switch slides and holds the timer while controls have focus", () => {
  vi.useFakeTimers();
  render(
    <SpaceClient
      activeFeed="latest-diaries"
      latestDiaries={[]}
      latestArticles={[]}
      hotDiaries={[]}
      hotArticles={[]}
    />
  );

  const carousel = screen.getByRole("region", { name: "最新内容轮播" });
  const articleControl = within(carousel).getByRole("button", { name: "显示最新文章" });
  fireEvent.click(articleControl);
  expect(within(carousel).getByRole("heading", { name: "最新文章" })).toBeInTheDocument();

  fireEvent.focus(articleControl);
  act(() => vi.advanceTimersByTime(15000));
  expect(within(carousel).getByRole("heading", { name: "最新文章" })).toBeInTheDocument();

  fireEvent.blur(articleControl, { relatedTarget: null });
  act(() => vi.advanceTimersByTime(10000));
  expect(within(carousel).getByRole("heading", { name: "最新日记" })).toBeInTheDocument();
});
