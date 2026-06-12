"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

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

  useEffect(() => {
    fetchMessages();
    getCurrentUser();
  }, [roomOwnerId]);

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
      alert(error.message);
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
      alert("请先写一点东西。");
      return;
    }

    if (cleanContent.length < 2) {
      alert("留言至少需要 2 个字。");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("请先登录。");
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
      alert(error.message);
      return;
    }

    setContent("");
    fetchMessages();
  }

  async function deleteMessage(id: string) {
    const confirmed = confirm("确定删除这条房间留言吗？");
    if (!confirmed) return;

    const { error } = await supabase
      .from("room_messages")
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("author_id", currentUserId);

    if (error) {
      alert(error.message);
      return;
    }

    fetchMessages();
  }

  return (
    <section className="scroll-mt-28 space-y-5" id="guestbook">
      <div>
        <p className="text-xs tracking-[0.35em] text-white/25">
          GUESTBOOK
        </p>

        <h2 className="mt-2 text-2xl font-light md:mt-4 md:text-3xl">
          房间留言
        </h2>

        <p className="mt-3 text-sm leading-7 text-white/35">
          路过这个房间的人，可以轻轻留下一句话。
        </p>
      </div>

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

        {messages.map((message) => {
          const profile = message.authorProfile;
          const profileHref = profile?.username
            ? `/u/${encodeURIComponent(profile.username)}`
            : null;

          return (
            <article
              key={message.id}
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
                    {new Date(message.created_at).toLocaleString("zh-CN")}
                  </p>

                  <p className="safe-pre mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-white/60 [overflow-wrap:anywhere]">
                    {message.content}
                  </p>

                  {currentUserId === message.author_id && (
                    <button
                      type="button"
                      onClick={() => deleteMessage(message.id)}
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
    </section>
  );
}