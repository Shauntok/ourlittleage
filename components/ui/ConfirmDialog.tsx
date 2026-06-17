"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "确认",
  cancelText = "取消",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-5">
      <button
        type="button"
        aria-label="关闭确认窗口"
        className="absolute inset-0 bg-black/70 backdrop-blur-xl"
        onClick={onCancel}
      />

      <section className="relative z-10 w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/95 text-white shadow-[0_0_80px_rgba(255,255,255,0.08)]">
        <div className="p-6 md:p-7">
          <p className="text-xs tracking-[0.35em] text-white/25">CONFIRM</p>

          <h2 className="mt-4 text-2xl font-light text-white">{title}</h2>

          {description && (
            <p className="mt-4 text-sm leading-7 text-white/45">
              {description}
            </p>
          )}

          {children && <div className="mt-5">{children}</div>}
        </div>

        <div className="flex justify-end gap-3 border-t border-white/10 p-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm text-white/60 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={
              danger
                ? "rounded-full border border-red-400/30 bg-red-500/15 px-5 py-2.5 text-sm font-semibold text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                : "rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            }
          >
            {loading ? "处理中..." : confirmText}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}