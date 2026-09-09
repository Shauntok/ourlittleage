"use client";

import { CakeSlice, ChevronDown, LoaderCircle, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";

type AgeDistribution = {
  totalResidents: number;
  classifiedResidents: number;
  unclassifiedResidents: number;
  bands: Array<{
    key: string;
    label: string;
    count: number;
  }>;
};

type DistributionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "available"; data: AgeDistribution }
  | { status: "unavailable" };

export default function AgeDistributionPanel() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<DistributionState>({ status: "idle" });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function loadDistribution() {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: "loading" });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Admin session unavailable");

      const response = await fetch("/api/admin/homepage/age-distribution", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Unable to load age distribution");

      const data = readDistribution(await response.json());
      if (!controller.signal.aborted) setState({ status: "available", data });
    } catch {
      if (!controller.signal.aborted) setState({ status: "unavailable" });
    }
  }

  function toggle() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && state.status === "idle") void loadDistribution();
  }

  const summary =
    state.status === "available"
      ? `${state.data.classifiedResidents} / ${state.data.totalResidents} 位有记录`
      : "查看分布";

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/60">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="resident-age-distribution"
        aria-label={`${open ? "收起" : "查看"}居民年龄分布`}
        onClick={toggle}
        className="flex min-h-20 w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50 md:px-6"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-black text-zinc-300">
          <CakeSlice aria-hidden="true" className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-zinc-300">居民年龄</span>
          <span className="mt-1 block text-xs text-zinc-600">{summary}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 text-zinc-500 transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        id="resident-age-distribution"
        aria-hidden={!open}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-zinc-800 px-5 py-6 md:px-6 md:py-7">
            {state.status === "loading" && (
              <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-zinc-500">
                <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                正在整理年龄资料...
              </div>
            )}

            {state.status === "unavailable" && (
              <div className="flex min-h-48 flex-col items-center justify-center gap-4 text-center">
                <p className="text-sm text-zinc-500">年龄资料暂时无法读取。</p>
                <button
                  type="button"
                  aria-label="重新读取年龄资料"
                  onClick={() => void loadDistribution()}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-700 px-3 text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                  重新读取
                </button>
              </div>
            )}

            {state.status === "available" && (
              <AgeBars data={state.data} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function AgeBars({ data }: { data: AgeDistribution }) {
  const largestCount = Math.max(1, ...data.bands.map((band) => band.count));

  return (
    <div>
      <div
        role="img"
        aria-label="居民年龄分布图"
        className="grid grid-cols-4 gap-x-3 gap-y-7 md:grid-cols-8 md:gap-x-4"
      >
        {data.bands.map((band) => {
          const height = band.count === 0
            ? 3
            : Math.max(12, Math.round((band.count / largestCount) * 100));

          return (
            <div key={band.key} className="min-w-0 text-center">
              <p className="mb-2 text-sm font-semibold tabular-nums text-zinc-300">
                {band.count}
              </p>
              <div className="flex h-28 items-end justify-center border-b border-zinc-700 md:h-36">
                <div
                  className="w-full max-w-12 rounded-t bg-zinc-300/65 transition-[height] duration-500 ease-out"
                  style={{ height: `${height}%` }}
                />
              </div>
              <p className="mt-2 min-h-8 text-xs leading-4 text-zinc-500">
                {band.label}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 pt-4 text-xs text-zinc-600">
        <span>{data.classifiedResidents} 位居民已归类</span>
        <span>{data.unclassifiedResidents} 位未记录或无法归类</span>
      </div>
    </div>
  );
}

function readDistribution(value: unknown): AgeDistribution {
  if (!value || typeof value !== "object") throw new Error("Invalid response");
  const data = value as Partial<AgeDistribution>;
  const validNumber = (input: unknown) =>
    typeof input === "number" && Number.isSafeInteger(input) && input >= 0;

  if (
    !validNumber(data.totalResidents) ||
    !validNumber(data.classifiedResidents) ||
    !validNumber(data.unclassifiedResidents) ||
    !Array.isArray(data.bands) ||
    data.bands.some(
      (band) =>
        !band ||
        typeof band.key !== "string" ||
        typeof band.label !== "string" ||
        !validNumber(band.count)
    )
  ) {
    throw new Error("Invalid response");
  }

  return data as AgeDistribution;
}
