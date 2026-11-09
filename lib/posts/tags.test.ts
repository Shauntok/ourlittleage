import { describe, expect, it } from "vitest";
import { articleTagHref, articleTagPattern, serializeArticleTags, uniqueArticleTags, validateArticleTags } from "./tags";

describe("article tags", () => {
  it("keeps old tags readable and writes a deduplicated comma list", () => {
    expect(uniqueArticleTags('["生活","故事"]')).toEqual(["生活", "故事"]);
    expect(serializeArticleTags("#生活， 故事,生活" )).toBe("生活,故事");
  });

  it("rejects tags that cannot fit the editor", () => {
    expect(validateArticleTags("一,二,三,四,五,六")).toMatch(/最多填写 5 个/);
    expect(validateArticleTags("这是一个长度超过二十个字的文章标签不能保存下来")).toMatch(/最多 20 个字/);
  });

  it("links Unicode tags and makes an exact-match database pattern", () => {
    expect(articleTagHref("慢生活")).toBe("/tags/%E6%85%A2%E7%94%9F%E6%B4%BB");
    expect(articleTagPattern("生活")).toBe("(^|[,，])[[:space:]]*生活[[:space:]]*([,，]|$)");
  });
});
