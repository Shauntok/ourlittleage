"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Moon, Sun } from "lucide-react";
import type { RoomViewSkin } from "@/lib/room-view-skin";
import type { PixelRoomTime } from "@/lib/pixel-room-theme";
import PixelCornerMarks from "./PixelCornerMarks";
import styles from "./skin.module.css";

type SaveState = "idle" | "saving" | "saved" | "local-only" | "error";

type Props = {
  selectedSkin: RoomViewSkin;
  selectedTime: PixelRoomTime;
  appliedTime: PixelRoomTime;
  saveState: SaveState;
  onSelectSkin: (skin: RoomViewSkin) => void;
  onSelectTime: (time: PixelRoomTime) => void;
  onSave: () => void;
};

const statusText: Record<SaveState, string> = {
  idle: "选择喜欢的风格，再保存设置。",
  saving: "正在保存你的选择…",
  saved: "已保存你的皮肤选择。",
  "local-only": "皮肤已在此设备生效；云端同步暂不可用。",
  error: "房间时间保存失败，请再试一次。",
};

const cabinetArtwork: Record<PixelRoomTime, Record<RoomViewSkin, Record<PixelRoomTime, string>>> = {
  day: {
    modern_pixel: {
      day: "/images/skin/wardrobe-cutout-day.webp",
      evening: "/images/skin/wardrobe-day-modern-night.webp",
    },
    classic: {
      day: "/images/skin/wardrobe-day-classic-day.webp",
      evening: "/images/skin/wardrobe-day-classic-night.webp",
    },
  },
  evening: {
    modern_pixel: {
      day: "/images/skin/wardrobe-cutout-evening.webp",
      evening: "/images/skin/wardrobe-evening-modern-night.webp",
    },
    classic: {
      day: "/images/skin/wardrobe-evening-classic-day.webp",
      evening: "/images/skin/wardrobe-evening-classic-night.webp",
    },
  },
};

export default function ModernSkinSettings({
  selectedSkin,
  selectedTime,
  appliedTime,
  saveState,
  onSelectSkin,
  onSelectTime,
  onSave,
}: Props) {
  const [showStatus, setShowStatus] = useState(false);

  return (
    <div className={styles.page} data-settings-skin="modern_pixel" data-moon-scene>
      <PixelCornerMarks />
      <div className={styles.wardrobe}>
        <Image
          src={cabinetArtwork[appliedTime][selectedSkin][selectedTime]}
          alt=""
          width={1536}
          height={1025}
          sizes="(max-width: 650px) 1px, (max-width: 1600px) 100vw, 1300px"
          className={styles.referenceArt}
          priority
          aria-hidden="true"
        />
        <header className={styles.canopy}>
          <Image
            src="/images/skin/wardrobe-canopy.webp"
            alt=""
            fill
            sizes="(max-width: 900px) 100vw, 1100px"
            className={styles.canopyArt}
            priority
          />
          <div className={styles.canopyCopy}>
            <h1>房间皮肤</h1>
            <p>换一种风格，收藏属于你的小时代。</p>
          </div>
        </header>

        <div className={styles.cabinet}>
          <div className={styles.doors} role="group" aria-label="选择皮肤">
            <section className={`${styles.door} ${selectedSkin === "modern_pixel" ? styles.doorSelected : ""}`} aria-label="现代像素皮肤">
              <button
                type="button"
                className={styles.doorSelect}
                aria-label="选择现代像素皮肤"
                aria-pressed={selectedSkin === "modern_pixel"}
                onClick={() => { setShowStatus(false); onSelectSkin("modern_pixel"); }}
              >
                <span className={styles.preview}>
                  <Image
                    src={selectedTime === "day" ? "/images/pixel-room-day.webp" : "/images/pixel-room-evening.webp"}
                    alt=""
                    fill
                    sizes="(max-width: 650px) 75vw, 380px"
                    className={`${styles.previewImage} ${styles.mobilePreviewImage}`}
                    aria-hidden="true"
                  />
                  <Image
                    src={selectedTime === "day" ? "/images/skin/wardrobe-reference.webp" : "/images/skin/wardrobe-reference-evening.webp"}
                    alt={selectedTime === "day" ? "现代像素日间房间实景" : "现代像素夜晚房间实景"}
                    width={1536}
                    height={1025}
                    sizes="(max-width: 650px) 1px, (max-width: 1600px) 100vw, 1300px"
                    className={styles.previewSceneArt}
                  />
                </span>
                <span className={styles.doorCopy}>
                  <strong>现代像素</strong>
                  <small>日夜街区与细致的像素边框</small>
                </span>
                <span className={styles.choiceMark} aria-hidden="true">
                  {selectedSkin === "modern_pixel" && <Check size={18} strokeWidth={3} />}
                </span>
              </button>
              <div className={styles.timeChoices} role="group" aria-label="现代像素房间时间">
                <button type="button" aria-label="日间" aria-pressed={selectedTime === "day"} className={selectedTime === "day" ? styles.timeActive : ""} onClick={() => { setShowStatus(false); onSelectTime("day"); }}>
                  <Sun size={17} aria-hidden="true" /> 日间
                </button>
                <button type="button" aria-label="夜晚" aria-pressed={selectedTime === "evening"} className={selectedTime === "evening" ? styles.timeActive : ""} onClick={() => { setShowStatus(false); onSelectTime("evening"); }}>
                  <Moon size={17} aria-hidden="true" /> 夜晚
                </button>
              </div>
            </section>

            <section className={`${styles.door} ${selectedSkin === "classic" ? styles.doorSelected : ""}`} aria-label="经典玻璃皮肤">
              <button
                type="button"
                className={styles.doorSelect}
                aria-label="选择经典玻璃皮肤"
                aria-pressed={selectedSkin === "classic"}
                onClick={() => { setShowStatus(false); onSelectSkin("classic"); }}
              >
                <span className={`${styles.preview} ${styles.glassPreview}`}>
                  <Image
                    src="/images/skin/classic-glass-space-real.webp"
                    alt="真实旧版玻璃皮肤的深夜广场页面截图"
                    fill
                    sizes="(max-width: 650px) 75vw, 380px"
                    className={styles.previewImage}
                  />
                </span>
                <span className={styles.doorCopy}>
                  <strong>经典玻璃</strong>
                  <small>原来的深夜广场与柔和玻璃质感</small>
                  <span className={styles.realShot}>真实旧版页面截图</span>
                </span>
                <span className={styles.choiceMark} aria-hidden="true">
                  {selectedSkin === "classic" && <Check size={18} strokeWidth={3} />}
                </span>
              </button>
            </section>
          </div>
          <div className={styles.drawer}>
            <span className={styles.drawerHandle} aria-hidden="true" />
            <button type="button" className={styles.saveButton} aria-label={saveState === "saving" ? "正在保存选择" : "保存选择"} disabled={saveState === "saving"} onClick={() => { setShowStatus(true); onSave(); }}>
              <span aria-hidden="true">✦</span> {saveState === "saving" ? "保存中…" : "保存选择"} <span aria-hidden="true">✧</span>
            </button>
            <span className={styles.drawerHandle} aria-hidden="true" />
          </div>
        </div>
      </div>
      <p className={styles.status} data-visible={showStatus} role="status" aria-live="polite">{statusText[saveState]}</p>
      <p className={styles.note}>现代像素使用日间与夜晚；经典玻璃沿用房间里原有的五种主题。</p>
    </div>
  );
}
