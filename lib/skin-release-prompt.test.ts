import { describe, expect, it } from "vitest";
import { isSkinReleasePromptEligible, type SkinRelease } from "./skin-release-prompt";

const release: SkinRelease = { id: "new-skin-1", name: "新皮肤", publishedAt: "2026-11-10T00:00:00Z" };

describe("one-time skin release prompt", () => {
  it("selects residents who joined before the formal release", () => {
    expect(isSkinReleasePromptEligible(release, "2026-10-01T00:00:00Z", null, new Date("2026-11-11"))).toBe(true);
    expect(isSkinReleasePromptEligible(release, "2026-11-10T00:00:00Z", null, new Date("2026-11-11"))).toBe(false);
    expect(isSkinReleasePromptEligible(release, "2026-11-12T00:00:00Z", null, new Date("2026-11-13"))).toBe(false);
  });

  it("does not show an unpublished or already claimed release, but allows the next release", () => {
    expect(isSkinReleasePromptEligible(release, "2026-10-01", null, new Date("2026-11-09"))).toBe(false);
    expect(isSkinReleasePromptEligible(release, "2026-10-01", "new-skin-1", new Date("2026-11-11"))).toBe(false);
    expect(isSkinReleasePromptEligible({ ...release, id: "new-skin-2", publishedAt: "2026-12-01" }, "2026-10-01", "new-skin-1", new Date("2026-12-02"))).toBe(true);
    expect(isSkinReleasePromptEligible(null, "2026-10-01", null)).toBe(false);
  });
});
