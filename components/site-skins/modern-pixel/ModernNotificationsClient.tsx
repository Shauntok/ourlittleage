"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Bell,
  Check,
  Heart,
  Mail,
  MailOpen,
  Megaphone,
  MessageCircle,
  Reply,
  RotateCcw,
  ShieldAlert,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  getInteractionKind,
  getNotificationRelationship,
  getRelationshipNotificationType,
  isRelationshipNotification,
  type InteractionFilter,
  type MailboxFilter,
  type NotificationProfile,
  type NotificationRecord,
  type NotificationSection,
} from "@/lib/notifications/model";
import styles from "./notifications.module.css";

type ActionResult = { ok: boolean; error?: string };

export type ModernNotificationsProps = {
  section: NotificationSection;
  tab: MailboxFilter;
  interactionFilter: InteractionFilter;
  mailboxFilterCounts: Record<MailboxFilter, number>;
  interactionTabs: { key: InteractionFilter; label: string; count: number }[];
  interactionUnreadCount: number;
  filteredNotifications: NotificationRecord[];
  visibleInteractions: NotificationRecord[];
  actorsById: Record<string, NotificationProfile>;
  loading: boolean;
  message: string;
  onSectionChange: (section: NotificationSection) => void;
  onMailboxFilterChange: (filter: MailboxFilter) => void;
  onInteractionFilterChange: (filter: InteractionFilter) => void;
  onMarkRead: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
  onStar: (id: string, currentValue: boolean) => Promise<void>;
  onImportant: (id: string, currentValue: boolean) => Promise<void>;
  onAccept: (requestId: string) => Promise<ActionResult>;
  onReject: (requestId: string) => Promise<ActionResult>;
  onRefresh: () => Promise<void>;
};

const mailFolders = [
  { key: "unread", label: "未读", icon: Mail },
  { key: "read", label: "已读", icon: MailOpen },
  { key: "important", label: "重要", icon: ShieldAlert },
  { key: "starred", label: "星标", icon: Star },
  { key: "trash", label: "垃圾桶", icon: Trash2 },
] as const;

const interactionFolders = [
  { key: "all", label: "全部", icon: Bell },
  { key: "like", label: "喜欢", icon: Heart },
  { key: "comment", label: "评论", icon: MessageCircle },
  { key: "reply", label: "回复", icon: Reply },
] as const;

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

function EnvelopeSeams() {
  return (
    <svg className={styles.envelopeSeams} viewBox="0 0 72 112" preserveAspectRatio="none" aria-hidden="true">
      <path d="M72 0 8 56 72 112" />
    </svg>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("zh-CN", {
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}

function getMailLabel(item: NotificationRecord) {
  switch (item.type) {
    case "announcement": return "街区公告";
    case "badge":
    case "badge_award": return "徽章来信";
    case "system": return "系统来信";
    case "follow":
    case "follow_request":
    case "follow_accepted": return "居民动态";
    default: return "小时代来信";
  }
}

function MailIcon({ type }: { type: string | null }) {
  const Icon = type === "announcement" ? Megaphone
    : type === "badge" || type === "badge_award" ? Award
    : type === "follow" || type === "follow_request" || type === "follow_accepted" ? UserRound
    : Mail;
  return <Icon aria-hidden="true" size={19} strokeWidth={1.8} />;
}

function FollowAvatar({ avatarUrl, actorName }: { avatarUrl: string | null; actorName: string | null }) {
  const [failed, setFailed] = useState(false);

  if (!avatarUrl || failed) {
    return <span role="img" aria-label="默认居民头像"><UserRound aria-hidden="true" size={19} strokeWidth={1.8} /></span>;
  }

  return (
    // Resident avatar URLs come from the existing profile and avatar storage flow.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarUrl} alt={`${actorName || "居民"}的头像`} loading="lazy" onError={() => setFailed(true)} />
  );
}

function getRelationshipHeading(
  item: NotificationRecord,
  actor: NotificationProfile | undefined
) {
  const name = actor?.username?.trim() || "有位居民";
  const type = getRelationshipNotificationType(item);
  if (type === "follow_request") return `${name}想关注你`;
  if (type === "follow_accepted") return `${name}接受了你的关注申请`;
  return `${name}关注了你`;
}

function getMailHeading(item: NotificationRecord, actorsById: ModernNotificationsProps["actorsById"]) {
  return isRelationshipNotification(item)
    ? getRelationshipHeading(item, item.actor_id ? actorsById[item.actor_id] : undefined)
    : item.title || "一封来自小时代的信";
}

function getInteractionHeading(item: NotificationRecord, actorsById: ModernNotificationsProps["actorsById"]) {
  const kind = getInteractionKind(item);
  if (!item.actor_id && !item.post_id && !item.comment_id && !item.recent_actor_ids?.length) {
    return item.title || "社区互动";
  }
  const actorIds = item.recent_actor_ids?.length ? item.recent_actor_ids : item.actor_id ? [item.actor_id] : [];
  const names = actorIds.map((id) => actorsById[id]?.username).filter((name): name is string => Boolean(name));
  const count = Math.max(item.actor_count || 1, 1);
  const name = names.length === 0 ? count > 1 ? `${count} 位居民` : "有位居民"
    : count === 1 ? names[0]
    : count === 2 && names.length > 1 ? `${names[0]}、${names[1]}`
    : `${names[0]}和另外 ${count - 1} 位居民`;
  const post = Array.isArray(item.post) ? item.post[0] : item.post;
  const postType = post?.type === "diary" ? "日记" : post?.type === "article" ? "文章" : "内容";
  if (kind === "like") return `${name}喜欢了你的${item.comment_id ? "留言" : postType}`;
  if (kind === "reply") return `${name}回复了你的评论`;
  if (kind === "comment") return `${name}评论了你的${postType}`;
  return item.title || "社区互动";
}

function getInteractionHref(item: NotificationRecord) {
  const post = Array.isArray(item.post) ? item.post[0] : item.post;
  if (!post) return null;
  if (post.type === "diary") return `/diary/${post.id}`;
  if (post.type === "article" && post.slug) return `/articles/${post.slug}`;
  return null;
}

export default function ModernNotificationsClient(props: ModernNotificationsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileReading, setMobileReading] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestError, setRequestError] = useState("");
  const isMailbox = props.section === "mailbox";
  const items = isMailbox ? props.filteredNotifications : props.visibleInteractions;
  const selected = items.find((item) => item.id === selectedId) || items[0] || null;

  function selectItem(id: string) {
    setSelectedId(id);
    setMobileReading(true);
    setRequestError("");
  }

  async function decideRequest(action: (id: string) => Promise<ActionResult>, requestId: string) {
    if (requestBusy) return;
    setRequestBusy(true);
    setRequestError("");
    try {
      const result = await action(requestId);
      if (!result.ok) setRequestError("申请暂时无法处理，已重新读取当前状态。");
      await props.onRefresh();
    } catch {
      setRequestError("申请暂时无法处理，请稍后再试。");
    } finally {
      setRequestBusy(false);
    }
  }

  const mailUnread = props.mailboxFilterCounts.unread;

  return (
    <main data-moon-scene data-nav-scene="notifications" className={styles.page}>
      {props.message && <div role="status" className={styles.toast}>{props.message}</div>}
      <div className={styles.shell}>
        <Link href="/home" className={styles.backHome}><ArrowLeft size={16} aria-hidden="true" /> 回到首页</Link>

        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>POST DESK / 街区分拣台</p>
            <h1>{isMailbox ? "你的信箱" : "互动回声"}</h1>
            <p>{isMailbox ? "一封一封读，重要的事也不会错过。" : "喜欢、评论与回复，都收在这里。"}</p>
          </div>
        </header>

        <div role="tablist" aria-label="通知区域" className={styles.sectionTabs}>
          <button type="button" role="tab" aria-selected={isMailbox} className={isMailbox ? styles.sectionActive : ""} onClick={() => props.onSectionChange("mailbox")}>
            <Mail size={16} aria-hidden="true" /> 信箱 <span className={styles.count}>{mailUnread}</span>
          </button>
          <button type="button" role="tab" aria-selected={!isMailbox} className={!isMailbox ? styles.sectionActive : ""} onClick={() => props.onSectionChange("interactions")}>
            <MessageCircle size={16} aria-hidden="true" /> 互动 <span className={styles.count}>{props.interactionUnreadCount}</span>
          </button>
        </div>

        <div className={styles.desk}>
          <aside className={styles.folders}>
            <p className={styles.smallLabel}>{isMailbox ? "LETTER FOLDERS / 信件分类" : "ECHO FOLDERS / 互动分类"}</p>
            <div role="tablist" aria-label={isMailbox ? "信箱筛选" : "互动筛选"} className={styles.folderList}>
              {isMailbox
                ? mailFolders.map(({ key, label, icon: Icon }) => (
                    <button key={key} type="button" role="tab" aria-label={label} aria-selected={props.tab === key} className={`${styles.folder} ${props.tab === key ? styles.folderActive : ""}`} onClick={() => props.onMailboxFilterChange(key)}>
                      <Icon size={16} aria-hidden="true" /><span>{label}</span><span className={styles.folderCount}>{props.mailboxFilterCounts[key]}</span>
                    </button>
                  ))
                : interactionFolders.map(({ key, label, icon: Icon }) => (
                    <button key={key} type="button" role="tab" aria-label={label} aria-selected={props.interactionFilter === key} className={`${styles.folder} ${props.interactionFilter === key ? styles.folderActive : ""}`} onClick={() => props.onInteractionFilterChange(key)}>
                      <Icon size={16} aria-hidden="true" /><span>{label}</span><span className={styles.folderCount}>{props.interactionTabs.find((tab) => tab.key === key)?.count || 0}</span>
                    </button>
                  ))}
            </div>
          </aside>

          <section className={`${styles.listPane} ${mobileReading ? styles.mobileHidden : ""}`} aria-label={isMailbox ? "来信列表" : "互动列表"}>
            <div className={styles.paneHeading}>
              <h2>{isMailbox ? `${mailFolders.find((folder) => folder.key === props.tab)?.label}来信` : `${interactionFolders.find((folder) => folder.key === props.interactionFilter)?.label}互动`} <span>/ {items.length}</span></h2>
              <span>{isMailbox ? "最近送达" : "最近发生"}</span>
            </div>
            {props.loading ? <div className={styles.empty}>正在整理来信...</div>
              : items.length === 0 ? <div className={styles.empty}><MailOpen size={28} aria-hidden="true" /><strong>{isMailbox ? "这里暂时没有来信" : "这里暂时没有新的回声"}</strong><span>新的消息到达时，会出现在这里。</span></div>
              : <div className={styles.letterList}>
                  {items.map((item, index) => {
                    const active = selected?.id === item.id;
                    const heading = isMailbox ? getMailHeading(item, props.actorsById) : getInteractionHeading(item, props.actorsById);
                    const kind = getInteractionKind(item);
                    const Icon = !isMailbox ? kind === "like" ? Heart : kind === "reply" ? Reply : MessageCircle : null;
                    const actor = item.actor_id ? props.actorsById[item.actor_id] : undefined;
                    return <button key={item.id} type="button" aria-label={`阅读：${heading}`} aria-pressed={active} className={`${styles.letter} ${isMailbox ? styles.envelopeLetter : ""} ${active ? styles.letterActive : ""}`} onClick={() => selectItem(item.id)}>
                      {isMailbox && <EnvelopeSeams />}
                      <span className={`${styles.letterIcon} ${isMailbox && isRelationshipNotification(item) ? styles.followIcon : ""}`}>
                        {Icon ? <Icon size={19} aria-hidden="true" />
                          : isMailbox && isRelationshipNotification(item)
                            ? <FollowAvatar key={actor?.avatar_url || "default"} avatarUrl={actor?.avatar_url || null} actorName={actor?.username || null} />
                            : <MailIcon type={item.type} />}
                      </span>
                      <span className={styles.letterBody}>
                        <span className={styles.letterMeta}>{isMailbox ? getMailLabel(item) : "居民互动"} · {formatDate(item.last_activity_at || item.created_at)}</span>
                        <strong>{heading}</strong>
                        <span className={styles.letterExcerpt}>{item.content || (isMailbox ? "打开看看这封来信。" : "打开看看这次互动。")}</span>
                      </span>
                      {!item.is_read && !item.deleted_at && <span className={styles.unreadDot} aria-label="未读" />}
                      {isMailbox && <span className={styles.envelopeAddress} aria-hidden="true">TO YOU · {String(index + 1).padStart(2, "0")}</span>}
                    </button>;
                  })}
                </div>}
          </section>

          <section className={`${styles.readerPane} ${mobileReading ? styles.mobileReader : ""} ${isMailbox && selected && !props.loading ? styles.openEnvelope : ""}`} aria-label="读信区">
            <PixelCorners />
            {isMailbox && selected && !props.loading && <><span className={styles.openFlap} aria-hidden="true" /><span className={styles.envelopeSeal} aria-hidden="true" /></>}
            <div className={styles.readerSheet}>
            <div className={styles.readerTop}>
              <button type="button" className={styles.mobileBack} onClick={() => setMobileReading(false)}><ArrowLeft size={16} aria-hidden="true" /> 返回列表</button>
              <span>{selected ? (isMailbox ? getMailLabel(selected) : "互动回声") : "读信区"}</span>
              {selected && <time dateTime={selected.created_at}>{formatDate(selected.created_at)}</time>}
            </div>
            {props.loading ? <div className={styles.readerEmpty}>正在整理来信...</div>
              : !selected ? <div className={styles.readerEmpty}><MailOpen size={32} aria-hidden="true" /><p>选一封信，在这里慢慢读。</p></div>
              : <div className={styles.readerContent}>
                  <p className={styles.smallLabel}>{isMailbox ? "SYSTEM LETTER / 小时代来信" : "NEIGHBORHOOD ECHO / 街区回声"}</p>
                  <h2>{isMailbox ? getMailHeading(selected, props.actorsById) : getInteractionHeading(selected, props.actorsById)}</h2>
                  {selected.is_important && <span className={styles.importantFlag}>重要来信</span>}
                  <p className={styles.letterContent}>{selected.content || "这封信没有附上更多文字。"}</p>
                  {isMailbox && isRelationshipNotification(selected) && (
                    <RelationshipDetail item={selected} actor={selected.actor_id ? props.actorsById[selected.actor_id] : undefined} busy={requestBusy} error={requestError} onAccept={(id) => void decideRequest(props.onAccept, id)} onReject={(id) => void decideRequest(props.onReject, id)} />
                  )}
                  {!isMailbox && getInteractionHref(selected) && <Link className={styles.targetLink} href={getInteractionHref(selected)!}>查看相关内容 →</Link>}
                  <div className={styles.letterSignature}><Mail size={15} aria-hidden="true" /> 小时代邮局 · 寄来</div>
                </div>}
            {selected && <div className={styles.readerActions}>
              {isMailbox && !selected.deleted_at && <>
                <ActionButton icon={<Star size={16} fill={selected.is_starred ? "currentColor" : "none"} />} label={selected.is_starred ? "取消星标" : "星标"} onClick={() => void props.onStar(selected.id, selected.is_starred)} active={selected.is_starred} />
                <ActionButton icon={<ShieldAlert size={16} />} label={selected.is_important ? "取消重要" : "重要"} onClick={() => void props.onImportant(selected.id, selected.is_important)} active={selected.is_important} />
              </>}
              {!selected.is_read && !selected.deleted_at && <ActionButton icon={<Check size={16} />} label="标记为已读" onClick={() => void props.onMarkRead(selected.id)} />}
              {selected.deleted_at
                ? <ActionButton icon={<RotateCcw size={16} />} label="恢复" onClick={() => void props.onRestore(selected.id)} />
                : <ActionButton icon={<Trash2 size={16} />} label={isMailbox ? "移到垃圾桶" : "移除互动通知"} onClick={() => void props.onDelete(selected.id)} danger />}
            </div>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function ActionButton({ icon, label, onClick, active = false, danger = false }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean; danger?: boolean }) {
  return <button type="button" title={label} aria-label={label} onClick={onClick} className={`${styles.action} ${active ? styles.actionActive : ""} ${danger ? styles.actionDanger : ""}`}>
    {icon}<span>{label}</span>
  </button>;
}

function RelationshipDetail({ item, actor, busy, error, onAccept, onReject }: {
  item: NotificationRecord;
  actor: NotificationProfile | undefined;
  busy: boolean;
  error: string;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const relationship = getNotificationRelationship(item);
  const type = getRelationshipNotificationType(item);
  const pending = !item.deleted_at && relationship?.status === "pending";
  const accepted = !item.deleted_at && relationship?.status === "accepted";
  return <div className={styles.relationship}>
    {actor?.username && <Link href={`/u/${encodeURIComponent(actor.username)}`}>走进对方的房间 →</Link>}
    {type === "follow_request" && pending && relationship && <div className={styles.requestActions}>
      <button type="button" disabled={busy} onClick={() => onAccept(relationship.id)}>接受关注申请</button>
      <button type="button" disabled={busy} onClick={() => onReject(relationship.id)}>拒绝关注申请</button>
    </div>}
    {type === "follow_request" && !pending && <p>{accepted ? "已接受" : "申请已结束"}</p>}
    {error && <p role="status" className={styles.error}>{error}</p>}
  </div>;
}
