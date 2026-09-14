import { describe, expect, it } from "vitest";

import { getTrashTiming } from "./trash";

describe("getTrashTiming", () => {
  const now = new Date("2026-09-20T00:00:00.000Z");

  it("retains content deleted less than 15 days ago", () => {
    expect(getTrashTiming("2026-09-19T12:00:00.000Z", now)).toEqual({
      expiresAt: "2026-10-04T12:00:00.000Z",
      remainingDays: 15,
      purgeEligible: false,
    });
  });

  it("makes content eligible exactly at the 15-day boundary", () => {
    expect(getTrashTiming("2026-09-05T00:00:00.000Z", now)).toEqual({
      expiresAt: "2026-09-20T00:00:00.000Z",
      remainingDays: 0,
      purgeEligible: true,
    });
  });

  it("keeps older content eligible without returning negative days", () => {
    expect(getTrashTiming("2026-09-01T00:00:00.000Z", now)).toEqual({
      expiresAt: "2026-09-16T00:00:00.000Z",
      remainingDays: 0,
      purgeEligible: true,
    });
  });
});
