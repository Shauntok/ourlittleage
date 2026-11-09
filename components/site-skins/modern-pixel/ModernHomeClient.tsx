"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BookOpen,
  FileText,
  House,
  Mail,
  NotebookPen,
  Users,
} from "lucide-react";
import PageTransition from "@/components/PageTransition";
import RoomStatusButton from "@/components/RoomStatusButton";
import styles from "./home.module.css";

type OnlineResident = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  mood_emoji: string | null;
  status_message: string | null;
};

export type ModernHomeProps = {
  currentUserId: string;
  displayName: string;
  onlineCount: number;
  onlineResidents: OnlineResident[];
  latestDiary: string;
  latestDiaryId: number | null;
  latestDiaryDate: string | null;
  latestArticle: string;
  latestArticleSlug: string | null;
  latestArticleDate: string | null;
  announcement: { title: string; content: string } | null;
  unreadCount: number;
  initialMoodEmoji: string;
  initialStatusMessage: string;
};

function PixelCorners() {
  return (
    <>
      <span aria-hidden="true" className={`${styles.corner} ${styles.topLeft}`} />
      <span aria-hidden="true" className={`${styles.corner} ${styles.topRight}`} />
      <span aria-hidden="true" className={`${styles.corner} ${styles.bottomLeft}`} />
      <span aria-hidden="true" className={`${styles.corner} ${styles.bottomRight}`} />
    </>
  );
}

function shortDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric" }).format(date);
}

export default function ModernHomeClient(props: ModernHomeProps) {
  const [moodEmoji, setMoodEmoji] = useState(props.initialMoodEmoji);
  const [statusMessage, setStatusMessage] = useState(props.initialStatusMessage);
  const profileHref =
    props.displayName && props.displayName !== "居民"
      ? `/u/${encodeURIComponent(props.displayName)}`
      : "/settings/profile";
  const diaryHref = props.latestDiaryId ? `/diary/${props.latestDiaryId}` : "/space/diaries";
  const articleHref = props.latestArticleSlug
    ? `/articles/${props.latestArticleSlug}`
    : "/space/articles";

  const actions = [
    { icon: NotebookPen, title: "写日记", description: "把今天留在自己的日历里", href: "/diary/new", tone: styles.mint },
    { icon: FileText, title: "写文章", description: "慢慢讲一个完整的故事", href: "/articles/new", tone: styles.lilac },
    {
      icon: Mail,
      title: "信箱与互动",
      description: props.unreadCount > 0 ? `${props.unreadCount} 条新的回声等着你` : "看看有没有新的回声",
      href: "/notifications",
      tone: styles.peach,
    },
    { icon: House, title: "我的房间", description: "回到属于自己的角落", href: profileHref, tone: styles.blue },
  ];

  return (
    <PageTransition>
      <main data-home-skin="modern_pixel" data-moon-scene className={styles.page}>
        <div className={styles.shell}>
          <header className={styles.hero}>
            <div className={styles.heroCopy}>
              <span className={styles.eyebrow}>RESIDENT HOME / 街区入口</span>
              <h1 className="safe-text">欢迎回来，{props.displayName}。</h1>
              <p>今天想写点什么，或者先去街区走走？</p>
            </div>
          </header>

          <section className={styles.startSection} aria-labelledby="home-start-title">
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.eyebrow}>YOUR PLACE / 你的日常</span>
                <h2 id="home-start-title">从这里开始</h2>
              </div>
              <Link className={styles.moreLink} href={profileHref}>
                看看我的房间 <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </div>

            <div className={styles.startGrid}>
              <div className={styles.actionGrid}>
                {actions.map(({ icon: Icon, title, description, href, tone }) => (
                  <Link key={title} href={href} className={`${styles.action} ${styles.pixelFrame}`}>
                    <PixelCorners />
                    <span className={`${styles.actionIcon} ${tone}`}><Icon aria-hidden="true" size={25} strokeWidth={1.8} /></span>
                    <span className={styles.actionText}>
                      <strong>{title}</strong>
                      <span>{description}</span>
                    </span>
                    <ArrowRight aria-hidden="true" className={styles.actionArrow} size={16} />
                  </Link>
                ))}
              </div>

              <aside className={styles.announcement} data-home-announcement-board aria-label="街区公告">
                <div className={styles.announcementBoard}>
                  <span className={styles.eyebrow}>街区公告</span>
                  <h3 className="safe-text">{props.announcement?.title || "欢迎来到小时代"}</h3>
                  <p className="safe-pre">{props.announcement?.content || "这里是一座让故事慢慢留下的小镇。新的消息，会在公告栏与你见面。"}</p>
                  <Link className={styles.moreLink} href="/announcements">
                    查看全部公告 <ArrowRight aria-hidden="true" size={15} />
                  </Link>
                </div>
              </aside>
            </div>
          </section>

          <section className={styles.recentSection} aria-labelledby="home-recent-title">
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.eyebrow}>AROUND THE BLOCK / 街区近况</span>
                <h2 id="home-recent-title">刚刚发生</h2>
              </div>
              <Link className={styles.moreLink} href="/space">
                前往广场 <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </div>
            <div className={styles.recentGrid}>
              <Link href={diaryHref} className={`${styles.recentCard} ${styles.pixelFrame}`}>
                <PixelCorners />
                <span className={styles.cardMeta}>新日记{shortDate(props.latestDiaryDate) ? ` · ${shortDate(props.latestDiaryDate)}` : ""}</span>
                <strong className="safe-text">{props.latestDiary}</strong>
                <span>看看居民留下的今天 <ArrowRight aria-hidden="true" size={14} /></span>
              </Link>
              <Link href={articleHref} className={`${styles.recentCard} ${styles.pixelFrame}`}>
                <PixelCorners />
                <span className={styles.cardMeta}>新文章{shortDate(props.latestArticleDate) ? ` · ${shortDate(props.latestArticleDate)}` : ""}</span>
                <strong className="safe-text">{props.latestArticle}</strong>
                <span>坐下来读一段故事 <ArrowRight aria-hidden="true" size={14} /></span>
              </Link>
              <div className={`${styles.statusCard} ${styles.pixelFrame}`}>
                <PixelCorners />
                <RoomStatusButton
                  ownerId={props.currentUserId}
                  initialMoodEmoji={moodEmoji}
                  initialStatusMessage={statusMessage}
                  variant="card"
                  cardEmptyDescription="给房间留一个此刻"
                  onStatusChange={(emoji, message) => {
                    setMoodEmoji(emoji);
                    setStatusMessage(message);
                  }}
                />
              </div>
            </div>
          </section>

          {props.onlineResidents.length > 0 && (
            <section className={styles.residentsSection} aria-labelledby="home-residents-title">
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.eyebrow}>NEIGHBORS / 街区邻居</span>
                  <h2 id="home-residents-title">此刻在街区里</h2>
                </div>
                <span className={styles.onlineCount}><Users aria-hidden="true" size={15} /> {props.onlineCount} 位居民在线</span>
              </div>
              <div className={styles.residentList}>
                {props.onlineResidents.map((resident) => (
                  <Link
                    key={resident.id}
                    href={resident.username ? `/u/${encodeURIComponent(resident.username)}` : "/space"}
                    className={styles.resident}
                  >
                    {resident.avatar_url ? (
                      <Image src={resident.avatar_url} alt="" width={35} height={35} unoptimized className={styles.residentAvatar} />
                    ) : (
                      <span className={styles.residentAvatarFallback}><BookOpen aria-hidden="true" size={18} /></span>
                    )}
                    <span className={styles.residentText}>
                      <strong className="safe-text">{resident.username || "无名居民"}</strong>
                      <span className="safe-text">{resident.mood_emoji ? `${resident.mood_emoji} ${resident.status_message || "正在街区里"}` : "正在街区里"}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
