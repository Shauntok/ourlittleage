"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useRoomViewSkin } from "@/components/RoomViewSkinProvider";
import {
  ROOM_STATUS_HEART_COLORS,
  ROOM_STATUS_HEART_PATHS,
} from "@/components/room-status-heart";

type Props = {
  ownerId: string;
  initialMoodEmoji?: string | null;
  initialStatusMessage?: string | null;
  variant?: "floating" | "card";
  cardEmptyDescription?: string;
  onStatusChange?: (emoji: string, message: string) => void;
};

const MOOD_OPTIONS = [
  { emoji: "🌙", label: "月光" },
  { emoji: "☁️", label: "云朵" },
  { emoji: "🌧️", label: "小雨" },
  { emoji: "🎧", label: "听歌" },
  { emoji: "☕", label: "咖啡" },
  { emoji: "✨", label: "闪光" },
  { emoji: "💭", label: "发呆" },
  { emoji: "📖", label: "阅读" },
  { emoji: "🌫️", label: "起雾" },
  { emoji: "🫧", label: "泡泡" },
];

export default function RoomStatusButton({
  ownerId,
  initialMoodEmoji,
  initialStatusMessage,
  variant = "floating",
  cardEmptyDescription = "今晚想让别人看到什么？",
  onStatusChange,
}: Props) {
  const { skin, pixelTime } = useRoomViewSkin();
  const modernPixel = skin === "modern_pixel";
  const [mounted, setMounted] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [open, setOpen] = useState(false);

  const [moodEmoji, setMoodEmoji] = useState(initialMoodEmoji || "");
  const [statusMessage, setStatusMessage] = useState(initialStatusMessage || "");
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [clearing, setClearing] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMoodEmoji(initialMoodEmoji || "");
    setStatusMessage(initialStatusMessage || "");
  }, [initialMoodEmoji, initialStatusMessage]);

  useEffect(() => {
    async function checkOwner() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setIsOwner(user?.id === ownerId);
    }

    checkOwner();
  }, [ownerId]);

  async function saveStatus() {
    if (!isOwner) return;

    if (!moodEmoji && !statusMessage.trim()) {
      showMessage("先选一个心情，或写一句今天的状态。");
      return;
    }

    setSaving(true);

    const expiresAt = new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from("profiles")
      .update({
        mood_emoji: moodEmoji || null,
        status_message: statusMessage.trim() || null,
        status_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ownerId);

    setSaving(false);

    if (error) {
      showMessage(error.message);
      return;
    }

    onStatusChange?.(moodEmoji || "", statusMessage.trim() || "");
    setOpen(false);
  }

  async function clearStatus() {
    if (!isOwner) return;

    setClearing(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        mood_emoji: null,
        status_message: null,
        status_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ownerId);

    setClearing(false);

    if (error) {
      showMessage(error.message);
      setShowClearDialog(false);
      return;
    }

    setMoodEmoji("");
    setStatusMessage("");
    onStatusChange?.("", "");
    setShowClearDialog(false);
    setOpen(false);
  }

  const hasStatus = moodEmoji || statusMessage;

  if (!hasStatus && !isOwner) return null;

  function showMessage(text: string) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 3500);
  }

  const modal =
    open && mounted
      ? createPortal(
          <div data-room-status-overlay={modernPixel ? pixelTime : undefined} className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/75 px-3 pb-8 pt-16 backdrop-blur-2xl md:items-center md:px-4 md:pb-0 md:pt-0">
            <button
              type="button"
              aria-label="关闭今日状态弹窗"
              onClick={() => setOpen(false)}
              className="absolute inset-0"
            />

            <div data-room-status-dialog data-room-status-modern={modernPixel ? "" : undefined} data-pixel-time={modernPixel ? pixelTime : undefined} role="dialog" aria-modal="true" aria-labelledby="room-status-title" className="relative z-10 max-h-[84vh] w-full max-w-md overflow-hidden bg-zinc-950/95 md:max-h-[92vh] md:max-w-lg">
              {modernPixel && (["top-left", "top-right", "bottom-right", "bottom-left"] as const).map((corner) => (
                <span key={corner} data-status-painted-corner={corner} aria-hidden="true" />
              ))}
              <div data-room-status-header className="p-5 md:p-7">
                <p className="text-xs tracking-[0.35em] text-white/25">
                  {modernPixel ? "A NOTE FROM YOUR ROOM" : "TODAY STATUS"}
                </p>

                <h2 id="room-status-title" className="mt-3 text-2xl font-light md:mt-4 md:text-3xl">
                  {modernPixel ? "今日状态" : "🫧 今日状态"}
                </h2>

                <p className="mt-3 text-sm leading-7 text-white/35">
                  {modernPixel ? "留下一句今天的心情，18 小时后会轻轻收起。" : "留下一句今晚的心情，18 小时后会自动安静下来。"}
                </p>
                {modernPixel && (
                  <button type="button" data-room-status-close aria-label="关闭今日状态弹窗" onClick={() => setOpen(false)}>×</button>
                )}
              </div>

              <div data-room-status-body className="max-h-[48vh] overflow-y-auto p-6 pb-8 md:max-h-none md:overflow-visible">
                {modernPixel && <p data-room-status-section-title>选一枚今天的心情 <span>选一个，也可以留空</span></p>}
                <div className="grid grid-cols-5 gap-2" data-room-status-moods>
                  {MOOD_OPTIONS.map(({ emoji, label }) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setMoodEmoji(emoji)}
                      aria-pressed={moodEmoji === emoji}
                      className={
                        moodEmoji === emoji
                          ? "room-status-mood-option flex h-11 items-center justify-center border text-lg md:h-14"
                          : "room-status-mood-option flex h-11 items-center justify-center border text-lg transition md:h-14"
                      }
                    >
                      <span className="room-status-emoji" aria-hidden="true">{emoji}</span>
                      {modernPixel && <span className="room-status-emoji-label">{label}</span>}
                    </button>
                  ))}

                  {!modernPixel && <input
                    value={moodEmoji}
                    onChange={(e) => setMoodEmoji(e.target.value)}
                    placeholder="自定义"
                    maxLength={2}
                    className="room-status-custom-emoji col-span-2 h-11 border text-center text-sm outline-none transition md:h-14"
                  />}
                </div>

                {modernPixel && <input aria-label="自定义心情" value={moodEmoji} onChange={(e) => setMoodEmoji(e.target.value)} placeholder="＋ 自定义心情" maxLength={2} className="room-status-custom-emoji" />}

                {modernPixel && <p data-room-status-section-title data-room-status-writing-title>写一句今天的故事</p>}
                <textarea
                  placeholder={modernPixel ? "今天想留下些什么？" : "写下今天的状态..."}
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  rows={3}
                  maxLength={80}
                  className="room-status-message mt-5 w-full resize-none border px-5 py-4 text-sm leading-7 outline-none transition whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                />

                {message && (
                  <div data-room-status-error className="mt-5 border px-4 py-3 text-sm text-amber-200">
                    {message}
                  </div>
                )}

                <p data-room-status-counter className="mt-2 text-right text-xs text-white/35">
                  {statusMessage.length} / 80
                </p>
              </div>

              <div data-room-status-footer className="sticky bottom-0 flex flex-col gap-3 bg-zinc-950/95 p-5 sm:flex-row sm:justify-end md:p-6">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="room-status-action room-status-action-cancel border px-6 py-3 text-sm transition"
                >
                  取消
                </button>

                {hasStatus && (
                  <button
                    type="button"
                    onClick={() => setShowClearDialog(true)}
                    className="room-status-action room-status-action-clear border px-6 py-3 text-sm transition"
                  >
                    清除状态
                  </button>
                )}

                <button
                  type="button"
                  onClick={saveStatus}
                  disabled={saving}
                  className="room-status-action room-status-action-save px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ? "保存中..." : "设置今日状态"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  if (variant === "card") {
    return (
      <>
        <button
          type="button"
          onClick={() => isOwner && setOpen(true)}
          className="min-w-0 overflow-hidden rounded-[1.7rem] border border-white/10 bg-white/[0.035] p-5 text-left backdrop-blur-2xl shadow-[0_0_50px_rgba(255,255,255,0.04)] transition-all duration-700 ease-out hover:-translate-y-2 hover:scale-[1.015] hover:border-white/20 hover:bg-white/[0.055] hover:shadow-[0_0_80px_rgba(255,255,255,0.06)] md:rounded-[2rem] md:p-6"
        >
          <div className="mb-6 text-2xl md:mb-8 md:text-3xl">
            {moodEmoji || "🫧"}
          </div>

          <h2 className="safe-text text-base font-light text-white/85 md:text-lg">
            今日状态
          </h2>

          <p className="safe-pre mt-3 line-clamp-2 text-xs leading-6 text-white/35 md:mt-4 md:text-sm">
            {statusMessage || cardEmptyDescription}
          </p>
        </button>

        {modal}

        <ConfirmDialog
          open={showClearDialog}
          title="清除今日状态？"
          description="清除后，房间里就不会再显示这句今日状态。之后你还是可以重新设置。"
          confirmText="清除状态"
          cancelText="再想想"
          danger
          loading={clearing}
          onClose={() => setShowClearDialog(false)}
          onConfirm={clearStatus}
        />
      </>
    );
  }

  return (
    <>
      <button
        data-room-status-trigger={variant === "floating" ? "" : undefined}
        type="button"
        style={
          variant === "floating"
            ? {
                "--room-heart-outer-line": ROOM_STATUS_HEART_COLORS.outer,
                "--room-heart-inner-line": ROOM_STATUS_HEART_COLORS.inner,
                "--room-heart-center-highlight": ROOM_STATUS_HEART_COLORS.centerLight,
                "--room-heart-center": ROOM_STATUS_HEART_COLORS.center,
              } as CSSProperties
            : undefined
        }
        aria-label={isOwner ? (hasStatus ? "修改今日心情" : "设置心情") : "查看今日心情"}
        onClick={() => isOwner && setOpen(true)}
        className={
          variant === "floating"
            ? `relative z-10 inline-flex h-[124px] w-[156px] max-w-none items-center justify-center overflow-hidden p-0 text-center md:h-[145px] md:w-[182px] ${isOwner ? "cursor-pointer" : "cursor-default"}`
            : `z-10 inline-flex max-w-[170px] items-center gap-2 overflow-hidden rounded-full border border-violet-500/25 bg-black/60 px-3 py-2 text-left backdrop-blur-2xl shadow-[0_0_45px_rgba(139,92,246,0.12)] md:max-w-xs md:gap-3 md:rounded-[1.3rem] md:px-5 md:py-4 ${isOwner ? "cursor-pointer transition hover:border-violet-300/35 hover:bg-black/70" : "cursor-default"}`
        }
      >
        {variant === "floating" ? (
          <>
            <svg
              data-room-status-heart-grid
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[60.17%] w-[60.17%] -translate-x-1/2 -translate-y-1/2 opacity-80"
              viewBox="0 0 44 35"
              preserveAspectRatio="none"
              shapeRendering="crispEdges"
            >
              <defs>
                <radialGradient id="room-status-heart-fill" cx="50%" cy="45%" r="70%">
                  <stop data-room-heart-pixel-stop="light" offset="0%" />
                  <stop data-room-heart-pixel-stop="base" offset="100%" />
                </radialGradient>
              </defs>
              <path data-room-heart-pixel-layer="outer" d={ROOM_STATUS_HEART_PATHS.outer} />
              <path data-room-heart-pixel-layer="inner" d={ROOM_STATUS_HEART_PATHS.inner} />
              <path data-room-heart-pixel-layer="center" d={ROOM_STATUS_HEART_PATHS.center} fill="url(#room-status-heart-fill)" />
            </svg>
            <span data-room-status-heart-content className="relative z-10 flex max-w-[74%] -translate-y-1 flex-col items-center justify-center gap-1 px-1">
              {moodEmoji && <span className="text-base leading-none md:text-lg">{moodEmoji}</span>}
              <span className="safe-text line-clamp-2 text-xs font-semibold leading-4 text-[#302522] md:text-[15px] md:leading-5">
                {statusMessage || (isOwner ? "设置心情" : "今日状态")}
              </span>
              {isOwner && <span className="text-[9px] leading-3 text-[#806c67] md:text-[10px]">{hasStatus ? "点击修改" : "点击设置"}</span>}
            </span>
          </>
        ) : (
          <>
            <span className="shrink-0 text-lg md:text-2xl">{moodEmoji || "🫧"}</span>
            <span className="safe-text min-w-0 truncate text-xs text-white/75 md:line-clamp-2 md:whitespace-normal md:text-sm md:leading-6">
              {statusMessage || (isOwner ? "设置状态" : "今日状态")}
            </span>
            {isOwner && <span className="hidden text-xs text-white/30 md:inline">点击修改</span>}
          </>
        )}
      </button>

      {modal}

      <ConfirmDialog
        open={showClearDialog}
        title="清除今日状态？"
        description="清除后，房间里就不会再显示这句今日状态。之后你还是可以重新设置。"
        confirmText="清除状态"
        cancelText="再想想"
        danger
        loading={clearing}
        onClose={() => setShowClearDialog(false)}
        onConfirm={clearStatus}
      />
    </>
  );
}
