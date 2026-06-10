"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";

type Props = {
  ownerId: string;
  initialMoodEmoji?: string | null;
  initialStatusMessage?: string | null;
  variant?: "floating" | "card";
  onStatusChange?: (emoji: string, message: string) => void;
};

export default function RoomStatusButton({
  ownerId,
  initialMoodEmoji,
  initialStatusMessage,
  variant = "floating",
  onStatusChange,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [open, setOpen] = useState(false);

  const [moodEmoji, setMoodEmoji] = useState(initialMoodEmoji || "");
  const [statusMessage, setStatusMessage] = useState(initialStatusMessage || "");
  const [saving, setSaving] = useState(false);

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
      alert("请先选择心情或写一句状态。");
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
      alert(error.message);
      return;
    }

    onStatusChange?.(moodEmoji || "", statusMessage.trim() || "");
    setOpen(false);
  }

  async function clearStatus() {
    if (!isOwner) return;

    const confirmed = confirm("确定清除今日状态吗？");
    if (!confirmed) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        mood_emoji: null,
        status_message: null,
        status_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ownerId);

    if (error) {
      alert(error.message);
      return;
    }

    setMoodEmoji("");
    setStatusMessage("");
    onStatusChange?.("", "");
    setOpen(false);
  }

  const hasStatus = moodEmoji || statusMessage;

  if (!hasStatus && !isOwner) return null;

  const modal =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/75 px-3 pb-8 pt-16 backdrop-blur-2xl md:items-center md:px-4 md:pb-0 md:pt-0">
            <button
              type="button"
              aria-label="关闭今日状态弹窗"
              onClick={() => setOpen(false)}
              className="absolute inset-0"
            />

            <div className="relative z-10 max-h-[84vh] w-full max-w-md overflow-hidden rounded-[1.8rem] border border-white/10 bg-zinc-950/95 shadow-[0_0_120px_rgba(255,255,255,0.1)] md:max-h-[92vh] md:max-w-lg">
              <div className="border-b border-white/10 p-5 md:p-7">
                <p className="text-xs tracking-[0.35em] text-white/25">
                  TODAY STATUS
                </p>

                <h2 className="mt-3 text-2xl font-light md:mt-4 md:text-3xl">
                  🫧 今日状态
                </h2>

                <p className="mt-3 text-sm leading-7 text-white/35">
                  留下一句今晚的心情，18 小时后会自动安静下来。
                </p>
              </div>

              <div className="max-h-[48vh] overflow-y-auto p-6 pb-8 md:max-h-none md:overflow-visible">
                <div className="grid grid-cols-5 gap-2">
                  {["🌙", "☁️", "🌧️", "🎧", "☕", "✨", "💭", "📖", "🌫️", "🫧"].map(
                    (emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setMoodEmoji(emoji)}
                        className={
                          moodEmoji === emoji
                            ? "flex h-10 items-center justify-center rounded-2xl border border-white/30 bg-white/10 text-lg md:h-14"
                            : "flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-lg transition hover:border-white/25 md:h-14"
                        }
                      >
                        {emoji}
                      </button>
                    )
                  )}

                  <input
                    value={moodEmoji}
                    onChange={(e) => setMoodEmoji(e.target.value)}
                    placeholder="自定义"
                    maxLength={2}
                    className="col-span-2 h-10 rounded-2xl border border-white/10 bg-black/40 text-center text-sm outline-none transition focus:border-white/30 md:h-14"
                  />
                </div>

                <textarea
                  placeholder="写下今天的状态..."
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  rows={3}
                  maxLength={80}
                  className="mt-5 w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-sm leading-7 outline-none transition whitespace-pre-wrap break-words [overflow-wrap:anywhere] focus:border-white/30"
                />

                <p className="mt-2 text-right text-xs text-white/25">
                  {statusMessage.length} / 80
                </p>
              </div>

              <div className="sticky bottom-0 flex flex-col gap-3 border-t border-white/10 bg-zinc-950/95 p-5 md:p-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm text-white/65 transition hover:border-white/20 hover:text-white"
                >
                  取消
                </button>

                {hasStatus && (
                  <button
                    type="button"
                    onClick={clearStatus}
                    className="rounded-full border border-red-500/25 bg-red-500/[0.08] px-6 py-3 text-sm text-red-100/70 transition hover:bg-red-500/[0.12] hover:text-red-100"
                  >
                    清除状态
                  </button>
                )}

                <button
                  type="button"
                  onClick={saveStatus}
                  disabled={saving}
                  className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
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
            {statusMessage || "今晚想让别人看到什么？"}
          </p>
        </button>

        {modal}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => isOwner && setOpen(true)}
        className={`
          absolute right-4 top-4 z-10 max-w-[72%] overflow-hidden
          rounded-[1.3rem] border border-violet-500/20 bg-black/60
          px-4 py-3 text-left backdrop-blur-2xl
          shadow-[0_0_45px_rgba(139,92,246,0.12)]
          md:right-6 md:top-6 md:max-w-xs md:px-5 md:py-4
          ${
            isOwner
              ? "cursor-pointer transition hover:border-violet-300/35 hover:bg-black/70"
              : "cursor-default"
          }
        `}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 text-xl md:text-2xl">
            {moodEmoji || "🫧"}
          </span>

          <span className="safe-pre line-clamp-2 text-sm leading-6 text-white/75">
            {statusMessage || (isOwner ? "设置今日状态" : "今日状态")}
          </span>
        </div>

        <p className="mt-1 text-xs text-white/30 md:mt-2">
          {isOwner ? "点击修改今日状态" : "今日状态将在夜里安静下来"}
        </p>
      </button>

      {modal}
    </>
  );
}