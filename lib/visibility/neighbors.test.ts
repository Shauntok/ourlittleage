import { describe, expect, it } from "vitest";
import { neighborVisibilityError } from "./neighbors";

describe("neighbor visibility media boundary", () => {
  it("allows text for neighbors and leaves existing visibility choices unchanged", () => {
    expect(neighborVisibilityError("neighbors", "一篇只写给邻居看的故事。")).toBeNull();
    expect(neighborVisibilityError("public", "![](https://example.com/photo.png)")).toBeNull();
  });

  it.each([
    "![窗边](https://example.com/photo.png)",
    "![窗边][photo]",
    '<img src="https://example.com/photo.png">',
    "https://example.supabase.co/storage/v1/object/public/images/user/photo.png",
    "https://example.supabase.co/storage/v1/render/image/public/images/user/photo.png",
  ])("rejects content that would expose a neighbor image through a public URL: %s", (content) => {
    expect(neighborVisibilityError("neighbors", content)).toContain("纯文字");
  });
});
