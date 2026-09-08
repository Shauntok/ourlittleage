"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  RefreshCw,
  UserMinus,
  UserRound,
  X,
} from "lucide-react";

import {
  getPublicRelationships,
  removeFollower,
  unfollowUser,
} from "@/app/actions/relationships";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type {
  PublicRelationshipItem,
  PublicRelationshipKind,
  PublicRelationshipPage,
} from "@/lib/relationships/service";

type ResidentRelationshipDialogProps = {
  open: boolean;
  kind: PublicRelationshipKind;
  residentId: string;
  username: string;
  isOwner: boolean;
  onClose: () => void;
  onChanged: () => void;
};

type PageResult =
  | { ok: true; page: PublicRelationshipPage }
  | { ok: false; error: string };

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

async function readPage(
  residentId: string,
  kind: PublicRelationshipKind,
  page: number
): Promise<PageResult> {
  try {
    return await getPublicRelationships(residentId, kind, page);
  } catch {
    return { ok: false, error: "关系资料暂时无法读取。" };
  }
}

export default function ResidentRelationshipDialog({
  open,
  kind,
  residentId,
  username,
  isOwner,
  onClose,
  onChanged,
}: ResidentRelationshipDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [pageData, setPageData] = useState<PublicRelationshipPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingItem, setPendingItem] = useState<PublicRelationshipItem | null>(
    null
  );
  const [mutatingResidentId, setMutatingResidentId] = useState<string | null>(
    null
  );
  const pendingItemRef = useRef(pendingItem);

  useEffect(() => {
    pendingItemRef.current = pendingItem;
  }, [pendingItem]);

  const applyPage = useCallback((result: PageResult) => {
    if (result.ok) {
      setPageData(result.page);
      setPage(result.page.page);
      setError("");
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void readPage(residentId, kind, 1).then((result) => {
      if (active) applyPage(result);
    });
    return () => {
      active = false;
    };
  }, [applyPage, kind, open, residentId]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (pendingItemRef.current) return;

      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [onClose, open]);

  function loadPage(nextPage: number) {
    if (loading || nextPage < 1) return;
    setLoading(true);
    setError("");
    void readPage(residentId, kind, nextPage).then(applyPage);
  }

  async function confirmOwnerChange() {
    if (!pendingItem || mutatingResidentId) return;
    const item = pendingItem;
    setMutatingResidentId(item.residentId);
    setError("");

    try {
      const result = await (kind === "following"
        ? unfollowUser(item.residentId)
        : removeFollower(item.residentId));
      if (!result.ok) {
        setError(result.error || "关系操作暂时无法完成。");
        setPendingItem(null);
        return;
      }

      onChanged();
      setPendingItem(null);
      setLoading(true);
      const refreshed = await readPage(residentId, kind, page);
      if (
        refreshed.ok &&
        refreshed.page.items.length === 0 &&
        page > 1
      ) {
        applyPage(await readPage(residentId, kind, page - 1));
      } else {
        applyPage(refreshed);
      }
    } catch {
      setPendingItem(null);
      setError("关系操作暂时无法完成。");
    } finally {
      setMutatingResidentId(null);
    }
  }

  if (!open || typeof document === "undefined") return null;

  const title = kind === "followers" ? `${username}的关注者` : `${username}正在关注`;
  const listName = kind === "followers" ? "关注者" : "关注中";
  const totalPages = Math.max(
    1,
    Math.ceil((pageData?.total || 0) / (pageData?.pageSize || 20))
  );
  const ownerActionLabel = kind === "following" ? "取消关注" : "移除关注者";

  return createPortal(
    <div className="fixed inset-0 z-[9000] flex items-center justify-center px-4 py-6 sm:px-6">
      <button
        type="button"
        tabIndex={-1}
        aria-label={`关闭${title}名单背景`}
        className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-md"
        onClick={onClose}
      />

      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="resident-relationship-dialog-title"
        className="relative z-10 flex max-h-[min(760px,calc(100dvh-48px))] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 text-white shadow-[0_24px_90px_rgba(0,0,0,0.65)]"
      >
        <header className="flex min-h-16 items-center justify-between gap-4 border-b border-white/10 px-5 sm:px-6">
          <div className="min-w-0">
            <h2
              id="resident-relationship-dialog-title"
              className="truncate text-lg font-medium text-white/90"
            >
              {title}
            </h2>
            <p className="mt-0.5 text-xs tabular-nums text-white/35">
              共 {pageData?.total ?? 0} 位
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label={`关闭${listName}名单`}
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/45 transition hover:bg-white/[0.06] hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-[320px] flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {loading ? (
            <div
              aria-label={`正在读取${listName}名单`}
              className="flex min-h-[288px] items-center justify-center gap-3 text-sm text-white/35"
            >
              <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />
              <span>正在整理这间房的关系...</span>
            </div>
          ) : error ? (
            <div className="flex min-h-[288px] flex-col items-center justify-center gap-4 text-center">
              <p className="text-sm text-white/40">{error}</p>
              <button
                type="button"
                aria-label={`重新读取${listName}名单`}
                onClick={() => loadPage(page)}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-sm text-white/60 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
                重新读取
              </button>
            </div>
          ) : pageData?.items.length === 0 ? (
            <div className="flex min-h-[288px] items-center justify-center px-4 text-center text-sm leading-7 text-white/35">
              {kind === "followers"
                ? "这个居民目前还没有关注者。"
                : "这个居民目前还没有关注任何人。"}
            </div>
          ) : (
            <ul className="space-y-2">
              {pageData?.items.map((item) => (
                <li
                  key={item.residentId}
                  className="flex min-h-[72px] items-center gap-3 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2"
                >
                  {item.avatarUrl ? (
                    <img
                      src={item.avatarUrl}
                      alt={`${item.username}的头像`}
                      className="h-11 w-11 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      role="img"
                      aria-label={`${item.username}的头像`}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/35"
                    >
                      <UserRound aria-hidden="true" className="h-5 w-5" />
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/u/${encodeURIComponent(item.username)}`}
                      aria-label={`走进${item.username}的房间`}
                      className="block truncate text-sm font-medium text-white/80 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                    >
                      {item.username}
                    </Link>
                    <time
                      dateTime={item.relationshipAt}
                      className="mt-1 block text-xs tabular-nums text-white/30"
                    >
                      {new Date(item.relationshipAt).toLocaleDateString("zh-CN")}
                    </time>
                  </div>

                  {isOwner && (
                    <button
                      type="button"
                      aria-label={`${ownerActionLabel}${item.username}`}
                      disabled={mutatingResidentId === item.residentId}
                      onClick={() => setPendingItem(item)}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/35 transition hover:bg-rose-500/10 hover:text-rose-100/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:cursor-wait disabled:opacity-45"
                    >
                      {mutatingResidentId === item.residentId ? (
                        <LoaderCircle
                          aria-hidden="true"
                          className="h-4 w-4 animate-spin"
                        />
                      ) : (
                        <UserMinus aria-hidden="true" className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="flex min-h-16 items-center justify-between gap-3 border-t border-white/10 px-4 sm:px-5">
          <button
            type="button"
            aria-label="上一页"
            disabled={loading || page <= 1}
            onClick={() => loadPage(page - 1)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white/45 transition hover:bg-white/[0.06] hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:cursor-not-allowed disabled:opacity-25"
          >
            <ChevronLeft aria-hidden="true" className="h-5 w-5" />
          </button>
          <p className="text-xs tabular-nums text-white/35">
            第 {page} / {totalPages} 页
          </p>
          <button
            type="button"
            aria-label="下一页"
            disabled={loading || page >= totalPages}
            onClick={() => loadPage(page + 1)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white/45 transition hover:bg-white/[0.06] hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:cursor-not-allowed disabled:opacity-25"
          >
            <ChevronRight aria-hidden="true" className="h-5 w-5" />
          </button>
        </footer>
      </section>

      <ConfirmDialog
        open={Boolean(pendingItem)}
        title={kind === "following" ? "取消关注？" : "移除关注者？"}
        description={
          kind === "following"
            ? `你将不再关注${pendingItem?.username || "这位居民"}。`
            : `${pendingItem?.username || "这位居民"}将不再关注你。`
        }
        confirmText={kind === "following" ? "取消关注" : "移除"}
        loading={Boolean(mutatingResidentId)}
        onConfirm={() => void confirmOwnerChange()}
        onCancel={() => setPendingItem(null)}
      />
    </div>,
    document.body
  );
}
