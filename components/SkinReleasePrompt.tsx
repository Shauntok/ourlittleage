"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ACTIVE_SKIN_RELEASE, type SkinRelease } from "@/lib/skin-release-prompt";
import { useRoomViewSkin } from "@/components/RoomViewSkinProvider";
import styles from "./SkinReleasePrompt.module.css";

type Props = { userId: string; release?: SkinRelease | null };

export default function SkinReleasePrompt({ userId, release = ACTIVE_SKIN_RELEASE }: Props) {
  const router = useRouter();
  const { skin, pixelTime } = useRoomViewSkin();
  const [open, setOpen] = useState(false);
  const laterRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!userId || !release?.id || !/^[A-Za-z0-9_-]{1,64}$/.test(release.id)) return;
    const publishedAt = Date.parse(release.publishedAt);
    if (!Number.isFinite(publishedAt) || publishedAt > Date.now()) return;

    let active = true;
    // The guarded update claims this release before showing it. A second device
    // cannot claim the same release; later releases use a different ID.
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .update({ last_skin_release_prompt_id: release.id })
          .eq("id", userId)
          .lt("created_at", release.publishedAt)
          .or(`last_skin_release_prompt_id.is.null,last_skin_release_prompt_id.neq.${release.id}`)
          .select("id")
          .maybeSingle();
        if (active && data && !error) setOpen(true);
      } catch {
        // A failed receipt must never display an untracked reminder.
      }
    })();

    return () => { active = false; };
  }, [release, userId]);

  useEffect(() => {
    if (!open) return;
    const priorFocus = document.activeElement as HTMLElement | null;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    laterRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      } else if (event.key === "Tab" && dialogRef.current) {
        const buttons = Array.from(dialogRef.current.querySelectorAll<HTMLButtonElement>("button"));
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = priorOverflow;
      priorFocus?.focus();
    };
  }, [open]);

  if (!open || !release || typeof document === "undefined") return null;

  return createPortal(
    <div className={styles.backdrop}>
      <section
        ref={dialogRef}
        className={styles.dialog}
        data-skin={skin}
        data-pixel-time={skin === "modern_pixel" ? pixelTime : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby="skin-release-prompt-title"
      >
        {skin === "modern_pixel" && (["top-left", "top-right", "bottom-right", "bottom-left"] as const).map((corner) => (
          <span key={corner} className={`${styles.corner} ${styles[corner.replaceAll("-", "")]}`} aria-hidden="true" />
        ))}
        <p className={styles.eyebrow}>A NEW LOOK FOR YOUR ROOM</p>
        <h2 id="skin-release-prompt-title">有新的皮肤了</h2>
        <p>「{release.name}」已经来到小时代。想看看你的房间可以换上什么新模样吗？</p>
        <div className={styles.actions}>
          <button ref={laterRef} type="button" onClick={() => setOpen(false)}>等一下吧</button>
          <button type="button" onClick={() => { setOpen(false); router.push("/settings/skin"); }}>带我去看看</button>
        </div>
      </section>
    </div>,
    document.body
  );
}
