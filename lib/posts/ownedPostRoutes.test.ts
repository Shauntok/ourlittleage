import { describe, expect, it } from "vitest";

import { getOwnedPostDestination } from "./ownedPostRoutes";

describe("getOwnedPostDestination", () => {
  it("opens diary drafts in the diary editor", () => {
    expect(
      getOwnedPostDestination({ id: 12, slug: "ignored", type: "diary", status: "draft" })
    ).toBe("/diary/12/edit");
  });

  it("opens published diaries in the reader", () => {
    expect(
      getOwnedPostDestination({ id: 12, slug: "ignored", type: "diary", status: "published" })
    ).toBe("/diary/12");
  });

  it("opens article drafts in the article editor", () => {
    expect(
      getOwnedPostDestination({ id: 24, slug: "quiet-night", type: "article", status: "draft" })
    ).toBe("/articles/edit/24");
  });

  it("opens published articles by slug", () => {
    expect(
      getOwnedPostDestination({ id: 24, slug: "quiet-night", type: "article", status: "published" })
    ).toBe("/articles/quiet-night");
  });
});
