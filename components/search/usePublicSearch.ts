"use client";

import { useEffect, useState } from "react";
import {
  normalizeSearchTerm,
  searchPublicPosts,
  type PublicSearchPage,
  type SearchKind,
} from "@/lib/search/public-posts";

const EMPTY_PAGE: PublicSearchPage = { posts: [], total: 0 };

function readSearchLocation() {
  const params = new URLSearchParams(window.location.search);
  const rawKind = params.get("type");
  const tag = Array.from((params.get("tag") || "").trim()).slice(0, 20).join("");
  return {
    query: (params.get("q") || "").slice(0, 80),
    tag,
    kind: tag ? "article" as SearchKind : rawKind === "diary" || rawKind === "article" ? rawKind : "all" as SearchKind,
    page: Math.min(1000, Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1)),
  };
}

function writeSearchLocation(query: string, kind: SearchKind, page: number, tag: string, push = false) {
  const url = new URL(window.location.href);
  if (query.trim()) url.searchParams.set("q", query.trim().slice(0, 80));
  else url.searchParams.delete("q");
  if (kind !== "all") url.searchParams.set("type", kind);
  else url.searchParams.delete("type");
  if (page > 1) url.searchParams.set("page", String(page));
  else url.searchParams.delete("page");
  if (tag) url.searchParams.set("tag", tag);
  else url.searchParams.delete("tag");
  window.history[push ? "pushState" : "replaceState"](window.history.state, "", url);
}

export function usePublicSearch() {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [kind, setKind] = useState<SearchKind>("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PublicSearchPage>(EMPTY_PAGE);
  const [resolvedTerm, setResolvedTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const term = normalizeSearchTerm(query);

  useEffect(() => {
    function syncFromLocation() {
      const location = readSearchLocation();
      setQuery(location.query);
      setTag(location.tag);
      setKind(location.kind);
      setPage(location.page);
      setLoading(Boolean(normalizeSearchTerm(location.query) || location.tag));
      setSuggestionsOpen(false);
    }
    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, []);

  useEffect(() => {
    if (!term && !tag) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const result = await searchPublicPosts({ term, kind, page, tag, signal: controller.signal });
        if (controller.signal.aborted) return;
        setData(result);
        setResolvedTerm(`${term}\0${tag}\0${kind}`);
        setError(false);
        setLoading(false);
      } catch {
        if (controller.signal.aborted) return;
        setData(EMPTY_PAGE);
        setResolvedTerm(`${term}\0${tag}\0${kind}`);
        setError(true);
        setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [term, kind, page, tag, retryKey]);

  const visibleData = (term || tag) && resolvedTerm === `${term}\0${tag}\0${kind}` ? data : EMPTY_PAGE;

  function changeQuery(next: string) {
    writeSearchLocation(next, kind, 1, tag);
    setQuery(next);
    setPage(1);
    setError(false);
    setLoading(Boolean(normalizeSearchTerm(next) || tag));
    setSuggestionsOpen(true);
  }

  function changeKind(next: SearchKind) {
    writeSearchLocation(query, next, 1, "", true);
    setTag("");
    setKind(next);
    setPage(1);
    setError(false);
    setLoading(Boolean(term));
    setSuggestionsOpen(false);
  }

  function changePage(next: number) {
    writeSearchLocation(query, kind, next, tag, true);
    setPage(next);
    setError(false);
    setLoading(true);
    setSuggestionsOpen(false);
  }

  function changeTag(next: string) {
    const selected = Array.from(next.trim()).slice(0, 20).join("");
    const nextKind = selected ? "article" : kind;
    writeSearchLocation(query, nextKind, 1, selected, true);
    setTag(selected);
    setKind(nextKind);
    setPage(1);
    setError(false);
    setLoading(Boolean(term || selected));
    setSuggestionsOpen(false);
  }

  return {
    query,
    term,
    tag,
    kind,
    page,
    data: visibleData,
    loading,
    error,
    suggestionsOpen,
    changeQuery,
    changeKind,
    changePage,
    changeTag,
    setSuggestionsOpen,
    retry: () => { setLoading(true); setRetryKey((value) => value + 1); },
  };
}
