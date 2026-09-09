import "server-only";

import { supabaseAdmin } from "@/lib/supabase-admin";

export type AgeBandKey =
  | "under_13"
  | "13_17"
  | "18_24"
  | "25_34"
  | "35_44"
  | "45_54"
  | "55_64"
  | "65_plus";

type AgeBandDefinition = {
  key: AgeBandKey;
  label: string;
  minAge: number;
  maxAge: number | null;
};

export type AgeBandRange = {
  key: AgeBandKey;
  label: string;
  after: string | null;
  onOrBefore: string;
};

export type ResidentAgeDistribution = {
  asOfDate: string;
  totalResidents: number;
  classifiedResidents: number;
  unclassifiedResidents: number;
  bands: Array<{
    key: AgeBandKey;
    label: string;
    count: number;
  }>;
};

const AGE_BANDS: AgeBandDefinition[] = [
  { key: "under_13", label: "12岁以下", minAge: 0, maxAge: 12 },
  { key: "13_17", label: "13–17岁", minAge: 13, maxAge: 17 },
  { key: "18_24", label: "18–24岁", minAge: 18, maxAge: 24 },
  { key: "25_34", label: "25–34岁", minAge: 25, maxAge: 34 },
  { key: "35_44", label: "35–44岁", minAge: 35, maxAge: 44 },
  { key: "45_54", label: "45–54岁", minAge: 45, maxAge: 54 },
  { key: "55_64", label: "55–64岁", minAge: 55, maxAge: 64 },
  { key: "65_plus", label: "65岁以上", minAge: 65, maxAge: null },
];

export function buildAgeBandRanges(today: string): AgeBandRange[] {
  assertDateOnly(today);

  return AGE_BANDS.map((band) => ({
    key: band.key,
    label: band.label,
    after:
      band.maxAge === null
        ? null
        : subtractYears(today, band.maxAge + 1),
    onOrBefore: subtractYears(today, band.minAge),
  }));
}

export function getMalaysiaDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export async function getResidentAgeDistribution(
  asOfDate = getMalaysiaDate()
): Promise<ResidentAgeDistribution> {
  const ranges = buildAgeBandRanges(asOfDate);
  const [totalResidents, ...counts] = await Promise.all([
    countProfiles(),
    ...ranges.map((range) => countProfiles(range)),
  ]);
  const bands = ranges.map((range, index) => ({
    key: range.key,
    label: range.label,
    count: counts[index],
  }));
  const classifiedResidents = bands.reduce(
    (total, band) => total + band.count,
    0
  );

  return {
    asOfDate,
    totalResidents,
    classifiedResidents,
    unclassifiedResidents: Math.max(0, totalResidents - classifiedResidents),
    bands,
  };
}

async function countProfiles(range?: AgeBandRange): Promise<number> {
  let query = supabaseAdmin.from("profiles").select("id", {
    count: "exact",
    head: true,
  });

  if (range?.after) query = query.gt("birth_date", range.after);
  if (range) query = query.lte("birth_date", range.onOrBefore);

  const { count, error } = await query;
  if (error) throw error;

  return count || 0;
}

function subtractYears(date: string, years: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const targetYear = year - years;
  const finalDay = new Date(Date.UTC(targetYear, month, 0)).getUTCDate();

  return [
    targetYear.toString().padStart(4, "0"),
    month.toString().padStart(2, "0"),
    Math.min(day, finalDay).toString().padStart(2, "0"),
  ].join("-");
}

function assertDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Expected a YYYY-MM-DD date");
  }
}
