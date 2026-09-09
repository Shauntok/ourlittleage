// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: { from: mocks.from },
}));

import {
  buildAgeBandRanges,
  getResidentAgeDistribution,
} from "./age-distribution";

describe("resident age distribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds exact birthday cutoffs for the partnership age bands", () => {
    expect(buildAgeBandRanges("2026-09-09")).toEqual([
      { key: "under_13", label: "12岁以下", after: "2013-09-09", onOrBefore: "2026-09-09" },
      { key: "13_17", label: "13–17岁", after: "2008-09-09", onOrBefore: "2013-09-09" },
      { key: "18_24", label: "18–24岁", after: "2001-09-09", onOrBefore: "2008-09-09" },
      { key: "25_34", label: "25–34岁", after: "1991-09-09", onOrBefore: "2001-09-09" },
      { key: "35_44", label: "35–44岁", after: "1981-09-09", onOrBefore: "1991-09-09" },
      { key: "45_54", label: "45–54岁", after: "1971-09-09", onOrBefore: "1981-09-09" },
      { key: "55_64", label: "55–64岁", after: "1961-09-09", onOrBefore: "1971-09-09" },
      { key: "65_plus", label: "65岁以上", after: null, onOrBefore: "1961-09-09" },
    ]);
  });

  it("clamps leap-day cutoffs to the final day of February", () => {
    expect(buildAgeBandRanges("2024-02-29")[0]).toEqual({
      key: "under_13",
      label: "12岁以下",
      after: "2011-02-28",
      onOrBefore: "2024-02-29",
    });
  });

  it("returns aggregate counts without returning resident birthdays", async () => {
    mockCounts([44, 2, 3, 12, 10, 7, 4, 2, 1]);

    await expect(getResidentAgeDistribution("2026-09-09")).resolves.toEqual({
      asOfDate: "2026-09-09",
      totalResidents: 44,
      classifiedResidents: 41,
      unclassifiedResidents: 3,
      bands: [
        { key: "under_13", label: "12岁以下", count: 2 },
        { key: "13_17", label: "13–17岁", count: 3 },
        { key: "18_24", label: "18–24岁", count: 12 },
        { key: "25_34", label: "25–34岁", count: 10 },
        { key: "35_44", label: "35–44岁", count: 7 },
        { key: "45_54", label: "45–54岁", count: 4 },
        { key: "55_64", label: "55–64岁", count: 2 },
        { key: "65_plus", label: "65岁以上", count: 1 },
      ],
    });
  });
});

function mockCounts(counts: number[]) {
  let index = 0;
  mocks.from.mockImplementation(() => ({
    select: vi.fn(() => createCountQuery(counts[index++])),
  }));
}

function createCountQuery(count: number) {
  const result = Promise.resolve({ count, error: null });
  const query = {
    not: vi.fn(() => query),
    gt: vi.fn(() => query),
    lte: vi.fn(() => query),
    then: result.then.bind(result),
  };
  return query;
}
