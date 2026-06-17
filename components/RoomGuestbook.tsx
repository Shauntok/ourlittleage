"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type ProfileInfo = {
  username: string | null;
  avatar_url: string | null;
};

type RoomMessage = {
  id: string;
  room_owner_id: string;
  author_id: string;
  content: string;
  created_at: string;
  authorProfile?: ProfileInfo | null;
};

type Props = {
  roomOwnerId: string;
};

export default function RoomGuestbook({ roomOwnerId }: Props) {
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [content, setContent] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const [message, setMessage] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages();
    getCurrentUser();
  }, [roomOwnerId]);

  function showMessage(text: string) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 3500);
  }

  async function getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setCurrentUserId(user?.id || "");
  }

  async function fetchMessages() {
    setFetching(true);

    const { data, error } = await supabase
      .from("room_messages")
      .select("id, room_owner_id, author_id, content, created_at")
      .eq("room_owner_id", roomOwnerId)
      .eq("is_deleted", false)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      showMessage(error.message);
      setFetching(false);
      return;
    }

    const rows = data || [];
    const authorIds = Array.from(
      new Set(rows.map((item) => item.author_id).filter(Boolean))
    );

    const { data: profiles } =
      authorIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", authorIds)
        : { data: [] as any[] };

    const profileMap = new Map<string, ProfileInfo>(
      (profiles || []).map((profile: any) => [
        profile.id,
        {
          username: profile.username,
          avatar_url: profile.avatar_url,
        },
      ])
    );

    setMessages(
      rows.map((item: any) => ({
        ...item,
        authorProfile: profileMap.get(item.author_id) || null,
      }))
    );

    setFetching(false);
  }

  async function submitMessage() {
    const cleanContent = content.trim();

    if (!cleanContent) {
      showMessage("写一点点就好，再轻轻留下来。");
      return;
    }

    if (cleanContent.length < 2) {
      showMessage("留言至少需要 2 个字。");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      showMessage("先登录一下，再留下房间留言。");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("room_messages").insert([
      {
        room_owner_id: roomOwnerId,
        author_id: user.id,
        content: cleanContent,
      },
    ]);

    setLoading(false);

    if (error) {
      showMessage(error.message);
      return;
    }

    setContent("");
    fetchMessages();
  }

  function openDeleteDialog(id: string) {
    setDeleteTargetId(id);
    setShowDeleteDialog(true);
  }

  async function deleteMessage() {
    if (!deleteTargetId) return;

    setDeleting(true);

    const { error } = await supabase
      .from("room_messages")
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", deleteTargetId)
      .eq("author_id", currentUserId);

    setDeleting(false);

    if (error) {
      setShowDeleteDialog(false);
      showMessage(error.message);
      return;
    }

    setShowDeleteDialog(false);
    setDeleteTargetId(null);
    fetchMessages();
  }

  return (
    <section className="scroll-mt-28 space-y-5" id="guestbook">
      <div>
        <p className="text-xs tracking-[0.35em] text-white/25">GUESTBOOK</p>

        <h2 className="mt-2 text-2xl font-light md:mt-4 md:text-3xl">
          房间留言
        </h2>

        <p className="mt-3 text-sm leading-7 text-white/35">
          路过这个房间的人，可以轻轻留下一句话。
        </p>
      </div>

      {message && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] backdrop-blur-2xl">
        <textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="给这个房间留一句话..."
          className="w-full resize-none bg-transparent px-5 py-4 text-sm leading-7 text-white outline-none placeholder:text-white/25"
          maxLength={160}
        />

        <div className="flex items-center justify-between border-t border-white/5 bg-white/[0.015] px-5 py-4">
          <span className="text-xs text-white/25">{content.length} / 160</span>

          <button
            type="button"
            onClick={submitMessage}
            disabled={loading}
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "留下中..." : "留下留言"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {fetching && (
          <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.03] p-6 text-sm text-white/35">
            正在翻看房间留言...
          </div>
        )}

        {!fetching && messages.length === 0 && (
          <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.03] p-7 text-center text-sm text-white/35">
            这个房间暂时还没有留言。
          </div>
        )}

        {messages.map((item) => {
          const profile = item.authorProfile;
          const profileHref = profile?.username
            ? `/u/${encodeURIComponent(profile.username)}`
            : null;

          return (
            <article
              key={item.id}
              className="min-w-0 overflow-hidden rounded-[1.7rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl"
            >
              <div className="flex items-start gap-3">
                {profileHref ? (
                  <Link
                    href={profileHref}
                    className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.04]"
                  >
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.username || "居民"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm">
                        🌙
                      </div>
                    )}
                  </Link>
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm">
                    🌙
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  {profileHref ? (
                    <Link
                      href={profileHref}
                      className="safe-text text-sm text-white/70 transition hover:text-white"
                    >
                      {profile?.username || "已离开的居民"}
                    </Link>
                  ) : (
                    <p className="safe-text text-sm text-white/45">
                      已离开的居民
                    </p>
                  )}

                  <p className="mt-1 text-xs text-white/25">
                    {new Date(item.created_at).toLocaleString("zh-CN")}
                  </p>

                  <p className="safe-pre mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-white/60 [overflow-wrap:anywhere]">
                    {item.content}
                  </p>

                  {currentUserId === item.author_id && (
                    <button
                      type="button"
                      onClick={() => openDeleteDialog(item.id)}
                      className="mt-4 rounded-full border border-red-500/20 bg-red-500/[0.05] px-4 py-2 text-xs text-red-200/55 transition hover:bg-red-500/[0.1] hover:text-red-200"
                    >
                      删除留言
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        title="删除这条房间留言？"
        description="这条留言会从房间里隐藏。之后如果需要，我们可以再做管理端恢复。"
        confirmText="删除留言"
        cancelText="再想想"
        danger
        loading={deleting}
        onClose={() => {
          setShowDeleteDialog(false);
          setDeleteTargetId(null);
        }}
        onConfirm={deleteMessage}
      />
    </section>
  );
}