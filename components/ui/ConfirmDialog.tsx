"use client";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "确定",
  cancelText = "再看看",
  danger = false,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-md">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 shadow-[0_0_90px_rgba(168,85,247,0.2)]">
        <div className="border-b border-white/10 px-6 py-6">
          <p className="text-xs tracking-[0.35em] text-white/25">
            CONFIRM
          </p>

          <h2 className="mt-3 text-2xl font-light text-white">
            {title}
          </h2>

          {description && (
            <p className="mt-3 text-sm leading-7 text-white/45">
              {description}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm text-white/60 transition hover:border-white/25 hover:text-white disabled:opacity-40"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-full px-6 py-3 text-sm font-semibold transition disabled:opacity-40 ${
              danger
                ? "border border-red-500/30 bg-red-500/15 text-red-100 hover:bg-red-500/25"
                : "bg-white text-black hover:bg-white/90"
            }`}
          >
            {loading ? "处理中..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}