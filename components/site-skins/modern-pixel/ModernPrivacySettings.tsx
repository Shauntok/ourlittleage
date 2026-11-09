"use client";

import Image from "next/image";
import type { FollowMode } from "@/lib/relationships/service";
import PixelCornerMarks from "./PixelCornerMarks";
import styles from "./privacy.module.css";

type Props = {
  showLevel: boolean;
  setShowLevel: (value: boolean) => void;
  showExp: boolean;
  setShowExp: (value: boolean) => void;
  showTrust: boolean;
  setShowTrust: (value: boolean) => void;
  showBadges: boolean;
  setShowBadges: (value: boolean) => void;
  showJoinedDays: boolean;
  setShowJoinedDays: (value: boolean) => void;
  followMode: FollowMode;
  setFollowMode: (value: FollowMode) => void;
  saving: boolean;
  message: string;
  onSave: () => void;
};

function Artwork({ name, className = "" }: { name: string; className?: string }) {
  return <Image className={className} src={`/images/privacy/${name}.webp`} width={96} height={96} alt="" aria-hidden="true" />;
}

function ToggleRow({ title, description, icon, checked, onChange }: {
  title: string;
  description: string;
  icon: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return <div className={styles.toggleRow}>
    <Artwork name={icon} className={styles.rowIcon} />
    <div className={styles.rowCopy}>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
    <button
      type="button"
      className={`${styles.toggle} ${checked ? styles.toggleOn : ""}`}
      aria-label={title}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
    ><span /></button>
  </div>;
}

function FollowOption({ title, description, icon, selected, onSelect }: {
  title: string;
  description: string;
  icon: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return <button
    type="button"
    role="radio"
    aria-checked={selected}
    aria-label={title}
    className={`${styles.followOption} ${selected ? styles.followSelected : ""}`}
    onClick={onSelect}
  >
    <span className={styles.radioMark} aria-hidden="true" />
    <Artwork name={icon} className={styles.followIcon} />
    <span className={styles.followCopy}><strong>{title}</strong><small>{description}</small></span>
  </button>;
}

export default function ModernPrivacySettings(props: Props) {
  return <div className={styles.page} data-privacy-skin="modern_pixel" data-moon-scene>
    <PixelCornerMarks />
    <header className={styles.hero}>
      <PixelCornerMarks />
      <div className={styles.heroCopy}>
        <h1>隐私设置</h1>
        <p>控制别人访问你的房间时，可以看到哪些成长资料。</p>
      </div>
    </header>

    <div className={styles.columns}>
      <section className={styles.panel} aria-labelledby="privacy-growth-heading">
        <PixelCornerMarks />
        <div className={styles.panelHeading}>
          <Artwork name="growth" className={styles.headingIcon} />
          <div><h2 id="privacy-growth-heading">成长足迹</h2><p>展示你在小时代的成长历程，让其他居民更了解你。</p></div>
        </div>
        <div className={styles.rows}>
          <ToggleRow title="显示等级" description="允许其他居民查看你的等级。" icon="level" checked={props.showLevel} onChange={props.setShowLevel} />
          <ToggleRow title="显示留下的光" description="允许其他居民查看你的成长值。" icon="light" checked={props.showExp} onChange={props.setShowExp} />
          <ToggleRow title="显示社区信任" description="允许其他居民查看你的社区信任。" icon="trust" checked={props.showTrust} onChange={props.setShowTrust} />
        </div>
      </section>

      <section className={`${styles.panel} ${styles.displayPanel}`} aria-labelledby="privacy-display-heading">
        <PixelCornerMarks />
        <div className={styles.panelHeading}>
          <Artwork name="room" className={styles.headingIcon} />
          <div><h2 id="privacy-display-heading">房间展示</h2><p>展示房间内的个人足迹，让其他居民更好地认识你。</p></div>
        </div>
        <div className={styles.rows}>
          <ToggleRow title="显示徽章" description="允许其他居民查看你获得过的徽章。" icon="badge" checked={props.showBadges} onChange={props.setShowBadges} />
          <ToggleRow title="显示居住天数" description="允许其他居民查看你来到小时代多久了。" icon="days" checked={props.showJoinedDays} onChange={props.setShowJoinedDays} />
        </div>
        <Image className={styles.shelf} src="/images/privacy/shelf.webp" width={1000} height={323} sizes="(max-width: 900px) 90vw, 44vw" alt="" aria-hidden="true" />
      </section>
    </div>

    <section className={styles.followPanel} aria-labelledby="privacy-follow-heading">
      <PixelCornerMarks />
      <div className={styles.followHeading}>
        <Artwork name="follow" className={styles.headingIcon} />
        <h2 id="privacy-follow-heading">关注方式</h2>
        <p>设置其他居民关注你的方式。</p>
      </div>
      <div className={styles.followBottom}>
        <div className={styles.followChoices} role="radiogroup" aria-label="关注方式">
          <FollowOption title="任何居民可关注" description="新的关注会立即生效。" icon="trust" selected={props.followMode === "open"} onSelect={() => props.setFollowMode("open")} />
          <FollowOption title="关注需要批准" description="新的关注会先等待你的同意。" icon="follow" selected={props.followMode === "approval_required"} onSelect={() => props.setFollowMode("approval_required")} />
        </div>
        <button type="button" className={styles.saveButton} disabled={props.saving} onClick={props.onSave}>
          <Artwork name="light" className={styles.saveSparkle} />{props.saving ? "保存中..." : "保存设置"}<Artwork name="light" className={styles.saveSparkle} />
        </button>
      </div>
    </section>
    {props.message && <p className={styles.toast} role="status">{props.message}</p>}
  </div>;
}
