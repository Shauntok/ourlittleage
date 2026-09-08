"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { useState } from "react";

import MailboxNotificationActions from "@/components/notifications/MailboxNotificationActions";
import {
  getNotificationRelationship,
  getRelationshipNotificationType,
  type NotificationProfile,
  type NotificationRecord,
} from "@/lib/notifications/model";

type RelationshipActionResult = {
  ok: boolean;
  error?: string;
};

type RelationshipNotificationCardProps = {
  notification: NotificationRecord;
  actor: NotificationProfile | null;
  onAccept: (requestId: string) => Promise<RelationshipActionResult>;
  onReject: (requestId: string) => Promise<RelationshipActionResult>;
  onRefresh: () => Promise<void>;
  onStar: () => void;
  onImportant: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
  onRestore: () => void;
};

export default function RelationshipNotificationCard({
  notification,
  actor,
  onAccept,
  onReject,
  onRefresh,
  onStar,
  onImportant,
  onMarkRead,
  onDelete,
  onRestore,
}: RelationshipNotificationCardProps) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const type = getRelationshipNotificationType(notification);
  const relationship = getNotificationRelationship(notification);
  const actorName = actor?.username?.trim() || "有位居民";
  const roomHref = actor?.username
    ? `/u/${encodeURIComponent(actor.username)}`
    : null;
  const isRequest = type === "follow_request";
  const requestState = notification.deleted_at
    ? "ended"
    : relationship?.status === "pending"
      ? "pending"
      : relationship?.status === "accepted"
        ? "accepted"
        : "ended";

  const heading =
    type === "follow_accepted"
      ? `${actorName}接受了你的关注申请`
      : type === "follow_request"
        ? `${actorName}想关注你`
        : `${actorName}关注了你`;

  async function decide(
    action: (requestId: string) => Promise<RelationshipActionResult>
  ) {
    if (busy || requestState !== "pending" || !relationship) return;

    setBusy(true);
    setFailure("");

    try {
      const result = await action(relationship.id);
      if (!result.ok) {
        setFailure("申请暂时无法处理，已重新读取当前状态。");
      }
    } catch {
      setFailure("申请暂时无法处理，已重新读取当前状态。");
    }

    try {
      await onRefresh();
    } catch {
      setFailure("申请暂时无法处理，请稍后再试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      className={
        notification.is_read || notification.deleted_at
          ? "rounded-lg border border-white/10 bg-white/[0.025] p-5 opacity-80 md:p-7"
          : "rounded-lg border border-yellow-400/20 bg-yellow-400/[0.055] p-5 shadow-[0_0_70px_rgba(250,204,21,0.05)] md:p-7"
      }
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 gap-3.5 md:gap-4">
          {roomHref ? (
            <Link
              href={roomHref}
              aria-label={`前往${actorName}的房间`}
              className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.04] transition hover:border-white/25"
            >
              <ActorAvatar actor={actor} actorName={actorName} />
            </Link>
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/35">
              <UserRound aria-hidden="true" size={18} strokeWidth={1.6} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="safe-text text-base font-medium text-white/88 md:text-lg">
              {heading}
            </h2>
            {roomHref && (
              <Link
                href={roomHref}
                className="mt-1.5 inline-block text-sm text-white/38 transition hover:text-white/70"
              >
                走进对方的房间
              </Link>
            )}

            {isRequest && requestState === "pending" && !notification.deleted_at && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void decide(onAccept)}
                  className="min-h-11 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.08] px-4 text-sm text-emerald-100/80 transition hover:bg-emerald-300/[0.13] disabled:cursor-wait disabled:opacity-45"
                >
                  {busy ? "处理中..." : "接受关注申请"}
                </button>
                <button
                  type="button"
                  aria-label="拒绝关注申请"
                  disabled={busy}
                  onClick={() => void decide(onReject)}
                  className="min-h-11 rounded-lg border border-white/10 bg-black/20 px-4 text-sm text-white/50 transition hover:border-white/20 hover:text-white/75 disabled:cursor-wait disabled:opacity-45"
                >
                  拒绝
                </button>
              </div>
            )}

            {isRequest && requestState !== "pending" && (
              <p className="mt-3 text-sm text-white/40">
                {requestState === "accepted" ? "已接受" : "申请已结束"}
              </p>
            )}

            {failure && (
              <p role="status" className="mt-3 text-sm text-amber-100/55">
                {failure}
              </p>
            )}

            <p className="mt-3 text-xs text-white/25">
              {new Date(notification.created_at).toLocaleString("zh-CN")}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          <MailboxNotificationActions
            notificationId={notification.id}
            isRead={notification.is_read}
            isStarred={notification.is_starred}
            isImportant={notification.is_important}
            isDeleted={Boolean(notification.deleted_at)}
            onStar={onStar}
            onImportant={onImportant}
            onRead={onMarkRead}
            onDelete={onDelete}
            onRestore={onRestore}
          />
        </div>
      </div>
    </article>
  );
}

function ActorAvatar({
  actor,
  actorName,
}: {
  actor: NotificationProfile | null;
  actorName: string;
}) {
  if (!actor?.avatar_url) {
    return (
      <span className="flex h-full w-full items-center justify-center text-sm text-white/55">
        {actorName.slice(0, 1)}
      </span>
    );
  }

  return (
    // Runtime avatar URLs may come from the existing Supabase storage bucket.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={actor.avatar_url}
      alt={`${actorName}的头像`}
      className="h-full w-full object-cover"
    />
  );
}
