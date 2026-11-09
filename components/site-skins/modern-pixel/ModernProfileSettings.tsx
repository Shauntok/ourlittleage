"use client";

import { type ChangeEvent, type ReactNode } from "react";
import Cropper, { type Area } from "react-easy-crop";
import Image from "next/image";
import {
  BookOpen, Camera, Check, ImageIcon, Moon, Sun, UserRound, X,
} from "lucide-react";
import { getPixelRoomTime, getStoredRoomTheme, type PixelRoomTime } from "@/lib/pixel-room-theme";
import PixelCornerMarks from "./PixelCornerMarks";
import styles from "./profile.module.css";

export type ModernProfileProps = {
  profile: { avatar_url?: string | null; banner_url?: string | null } | null;
  username: string;
  bio: string;
  theme: string;
  saving: boolean;
  uploading: boolean;
  bannerUploading: boolean;
  hasUnsavedChanges: boolean;
  message: string;
  cropOpen: boolean;
  bannerPreviewUrl: string;
  crop: { x: number; y: number };
  zoom: number;
  setCrop: (crop: { x: number; y: number }) => void;
  setZoom: (zoom: number) => void;
  setCroppedAreaPixels: (area: Area | null) => void;
  setUsername: (value: string) => void;
  setBio: (value: string) => void;
  setTheme: (value: string) => void;
  setHasUnsavedChanges: (value: boolean) => void;
  chooseBannerFile: (event: ChangeEvent<HTMLInputElement>) => void;
  uploadAvatar: (event: ChangeEvent<HTMLInputElement>) => void;
  closeCropModal: () => void;
  confirmCropAndUpload: () => void;
  saveProfile: () => void;
};

const times = [
  { value: "day", label: "日间", caption: "窗边的阳光", image: "/images/pixel-room-day.webp", Icon: Sun },
  { value: "evening", label: "夜晚", caption: "房间的暖灯", image: "/images/pixel-room-evening.webp", Icon: Moon },
] as const;

function PixelPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`${styles.panel} ${className}`}><PixelCornerMarks />{children}</section>;
}

export default function ModernProfileSettings(props: ModernProfileProps) {
  const time = getPixelRoomTime(props.theme);
  const scene = times.find((item) => item.value === time) ?? times[0];
  const roomImage = props.profile?.banner_url || scene.image;

  return (
    <div className={styles.page} data-profile-skin="modern_pixel" data-moon-scene>
      <PixelCornerMarks />
      <div className={styles.heading}>
        <div>
          <h1>房间设置</h1>
          <p>自定义你的房间形象，让这里成为独一无二的小天地。</p>
        </div>
      </div>

      <div className={styles.stage} style={{ backgroundImage: `url("${scene.image}")` }} role="img" aria-label={`${scene.label}房间场景`}>
        <PixelCornerMarks />
        <div className={styles.stageIdentity}>
          <div className={styles.stageAvatar}>
            {props.profile?.avatar_url ? <img src={props.profile.avatar_url} alt="" /> : <UserRound aria-hidden="true" size={30} />}
          </div>
          <div className={styles.stageText}>
            <strong>{props.username || "居民"}</strong>
            <span>{props.bio || "在平凡的日子里，收集每一个温柔的瞬间。"}</span>
          </div>
        </div>
      </div>

      <div className={styles.columns}>
        <PixelPanel className={styles.profilePanel}>
          <div className={styles.sectionHeading}>
            <UserRound aria-hidden="true" size={21} />
            <h2>门牌与头像</h2>
          </div>
          <div className={styles.profileFields}>
            <span className={styles.fieldLabel}>头像</span>
            <div className={styles.identityRow}>
              <div className={styles.avatar}>
                {props.profile?.avatar_url ? <img src={props.profile.avatar_url} alt="当前头像" /> : <UserRound aria-hidden="true" size={34} />}
              </div>
              <div className={styles.avatarActions}>
                <label className={styles.outlineButton}>
                  <Camera size={15} aria-hidden="true" /> {props.uploading ? "上传中..." : "更换头像"}
                  <input type="file" accept="image/*" onChange={props.uploadAvatar} disabled={props.uploading} className={styles.fileInput} aria-label="更换头像" />
                </label>
              </div>
            </div>
            <label className={styles.fieldLabel} htmlFor="pixel-room-username">居民名字</label>
            <div className={styles.inputWrap}>
              <input id="pixel-room-username" type="text" value={props.username} maxLength={20} onChange={(event) => { props.setUsername(event.target.value); props.setHasUnsavedChanges(true); }} placeholder="为房间留一个名字" />
              <span>{props.username.length}/20</span>
            </div>
            <p className={styles.hint}>3–20 个字符，可使用中文、英文、数字和底线。</p>
          </div>
          <div className={styles.storySection}>
            <h3 className={styles.subheading}><BookOpen aria-hidden="true" size={16} />房间的故事</h3>
            <label className={styles.fieldLabel} htmlFor="pixel-room-bio">个人简介</label>
            <textarea id="pixel-room-bio" rows={5} maxLength={300} value={props.bio} onChange={(event) => { props.setBio(event.target.value); props.setHasUnsavedChanges(true); }} placeholder="这个房间里，有哪些想要留下的故事？" />
            <p className={styles.counter}>{props.bio.length}/300</p>
          </div>
        </PixelPanel>

        <PixelPanel className={styles.decorPanel}>
          <div className={styles.sectionHeading}>
            <ImageIcon aria-hidden="true" size={21} />
            <h2>房间装扮</h2>
          </div>
          <div className={styles.bannerHeading}><span className={styles.fieldLabel}>房间横幅</span></div>
          <div className={styles.bannerRow}>
            <div className={styles.banner} style={{ backgroundImage: `url("${roomImage.replaceAll('"', '%22')}")` }} role="img" aria-label={props.profile?.banner_url ? "当前房间横幅" : `${scene.label}默认房间横幅`} />
            <div className={styles.bannerActions}>
              <label className={`${styles.outlineButton} ${styles.bannerButton}`}>
                <ImageIcon size={16} aria-hidden="true" /> {props.bannerUploading ? "上传中..." : "更换横幅"}
                <input type="file" accept="image/*" onChange={props.chooseBannerFile} disabled={props.bannerUploading} className={styles.fileInput} aria-label="更换房间横幅" />
              </label>
              <span>支持 JPG、PNG 格式的图片</span>
            </div>
          </div>
          <div className={styles.themeHeader}><h3>房间时间</h3></div>
          <div className={styles.themeGrid} role="radiogroup" aria-label="房间时间">
            {times.map((item) => {
              const active = time === item.value;
              const Icon = item.Icon;
              return <button key={item.value} type="button" role="radio" aria-checked={active} className={`${styles.themeOption} ${active ? styles.themeActive : ""}`} onClick={() => { props.setTheme(getStoredRoomTheme(item.value as PixelRoomTime)); props.setHasUnsavedChanges(true); }}>
                <Image src={item.image} width={320} height={110} sizes="(max-width: 720px) 45vw, 200px" alt="" />
                <span className={styles.themeText}><Icon size={16} aria-hidden="true" /><strong>{item.label}</strong><small>{item.caption}</small>{active && <Check size={16} className={styles.themeCheck} aria-hidden="true" />}</span>
              </button>;
            })}
          </div>
          <p className={styles.themeHint}>自订横幅会保留；日间与夜晚会同步调整现代像素皮肤的页面和房间背景。</p>
          <div className={styles.saveBar}>
            <p aria-live="polite">{props.hasUnsavedChanges ? "有尚未保存的更改" : "房间资料已保存"}</p>
            <button type="button" disabled={props.saving || !props.hasUnsavedChanges} onClick={props.saveProfile}><span className={styles.saveSparkle} aria-hidden="true">✦</span>{props.saving ? "保存中..." : "保存设置"}<span className={styles.saveSparkle} aria-hidden="true">✧</span></button>
          </div>
        </PixelPanel>
      </div>

      {props.cropOpen && props.bannerPreviewUrl && <div className={styles.modalBackdrop}>
        <section className={styles.cropModal} role="dialog" aria-modal="true" aria-labelledby="pixel-crop-title">
          <div className={styles.modalHeader}><h2 id="pixel-crop-title">裁剪房间横幅</h2><button type="button" onClick={props.closeCropModal} aria-label="关闭裁剪"><X size={19} /></button></div>
          <div className={styles.cropCanvas}><Cropper image={props.bannerPreviewUrl} crop={props.crop} zoom={props.zoom} aspect={3 / 1} onCropChange={props.setCrop} onZoomChange={props.setZoom} onCropComplete={(_, pixels) => props.setCroppedAreaPixels(pixels)} /></div>
          <div className={styles.cropActions}><label>缩放 <input type="range" min={1} max={3} step={0.05} value={props.zoom} onChange={(event) => props.setZoom(Number(event.target.value))} /></label><div><button type="button" className={styles.outlineButton} onClick={props.closeCropModal}>取消</button><button type="button" className={styles.primaryButton} disabled={props.bannerUploading} onClick={props.confirmCropAndUpload}>{props.bannerUploading ? "上传中..." : "确认使用"}</button></div></div>
        </section>
      </div>}
      {props.message && <div className={styles.toast} role="status">{props.message}</div>}
    </div>
  );
}
