"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import BroadcastTemplates from "@/components/broadcast/BroadcastTemplates";
import BroadcastTargetSelector from "@/components/broadcast/BroadcastTargetSelector";
import BroadcastMessageEditor from "@/components/broadcast/BroadcastMessageEditor";
import BroadcastPreview from "@/components/broadcast/BroadcastPreview";
import ScheduledBroadcasts from "@/components/broadcast/ScheduledBroadcasts";

type TargetMode = "self" | "single" | "all";
type MessageType = "system" | "announcement" | "event" | "reward" | "private";
type SendMode = "now" | "scheduled";

type ScheduledBroadcast = {
  id: number;
  title: string;
  content: string;
  target_mode: string;
  message_type: string;
  scheduled_for: string;
  status: string;
  sent_at: string | null;
  sent_count: number | null;
};

export default function AdminBroadcastPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentRole, setCurrentRole] = useState("user");

  const [profiles, setProfiles] = useState<any[]>([]);
  const [scheduledBroadcasts, setScheduledBroadcasts] = useState<
    ScheduledBroadcast[]
  >([]);

  const [search, setSearch] = useState("");
  const [targetMode, setTargetMode] = useState<TargetMode>("self");
  const [targetUserId, setTargetUserId] = useState("");

  const [messageType, setMessageType] = useState<MessageType>("system");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isImportant, setIsImportant] = useState(false);

  const [sendMode, setSendMode] = useState<SendMode>("now");
  const [scheduledFor, setScheduledFor] = useState("");

  const [loading, setLoading] = useState(true);
  const [scheduledLoading, setScheduledLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  useEffect(() => {
    async function checkPermission() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/";
        return;
      }

      setCurrentUser(user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const role = profile?.role || "user";
      setCurrentRole(role);

      if (!["owner", "admin"].includes(role)) {
        window.location.href = "/home";
        return;
      }

      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, username, role, status")
        .order("username", { ascending: true });

      setProfiles(usersData || []);

      setLoading(false);
      fetchScheduledBroadcasts();
    }

    checkPermission();
  }, []);

  async function fetchScheduledBroadcasts() {
    setScheduledLoading(true);

    const { data, error } = await supabase
      .from("scheduled_broadcasts")
      .select("*")
      .order("scheduled_for", { ascending: false })
      .limit(20);

    if (error) {
      console.error(error);
      setScheduledLoading(false);
      return;
    }

    setScheduledBroadcasts((data || []) as ScheduledBroadcast[]);
    setScheduledLoading(false);
  }

  function notifyNavbar() {
    window.dispatchEvent(new Event("notifications-updated"));
  }

  function getTypeLabel(type: MessageType) {
    switch (type) {
      case "announcement":
        return "📢 世界公告";
      case "event":
        return "🏮 活动通知";
      case "reward":
        return "🎖️ 奖励通知";
      case "private":
        return "💌 私人信件";
      default:
        return "🌙 系统来信";
    }
  }

  async function getTargetUsers() {
    if (!currentUser) return [];

    if (targetMode === "self") {
      return [{ id: currentUser.id }];
    }

    if (targetMode === "single") {
      if (!targetUserId) {
        alert("请选择指定居民。");
        return [];
      }

      return [{ id: targetUserId }];
    }

    const { data: users, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("status", "active");

    if (error) {
      alert(error.message);
      return [];
    }

    return users || [];
  }

  function validateMessage() {
    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (!["owner", "admin"].includes(currentRole)) {
      alert("你没有发送全站信件的权限。");
      return null;
    }

    if (!cleanTitle) {
      alert("请输入信件标题。");
      return null;
    }

    if (!cleanContent) {
      alert("请输入信件内容。");
      return null;
    }

    if (cleanTitle.length > 80) {
      alert("信件标题不能超过 80 个字符。");
      return null;
    }

    if (cleanContent.length > 2000) {
      alert("信件内容不能超过 2000 个字符。");
      return null;
    }

    if (sendMode === "scheduled") {
      if (!scheduledFor) {
        alert("请选择预约发送时间。");
        return null;
      }

      const scheduledDate = new Date(scheduledFor);

      if (Number.isNaN(scheduledDate.getTime())) {
        alert("预约发送时间无效。");
        return null;
      }

      if (scheduledDate <= new Date()) {
        alert("预约发送时间必须晚于现在。");
        return null;
      }
    }

    return {
      cleanTitle,
      cleanContent,
    };
  }

  async function sendBroadcastNow() {
    if (!currentUser) return;

    const valid = validateMessage();
    if (!valid) return;

    const targetUsers = await getTargetUsers();
    if (targetUsers.length === 0) return;

    const confirmed = confirm(
      targetMode === "self"
        ? "确定只发送给自己测试吗？"
        : targetMode === "single"
          ? "确定发送给这个指定居民吗？"
          : `你正在发送给所有 active 居民，共 ${targetUsers.length} 位。\n\n这会进入每个人的信箱，确定继续吗？`
    );

    if (!confirmed) return;

    setSending(true);

    const rows = targetUsers.map((user) => ({
      user_id: user.id,
      title: valid.cleanTitle,
      content: valid.cleanContent,
      type: messageType,
      is_read: false,
      is_important: isImportant,
      is_starred: false,
    }));

    const { error: insertError } = await supabase
      .from("notifications")
      .insert(rows);

    if (insertError) {
      alert(insertError.message);
      setSending(false);
      return;
    }

    await supabase.from("admin_logs").insert([
      {
        admin_id: currentUser.id,
        action:
          targetMode === "self"
            ? "test_broadcast"
            : targetMode === "single"
              ? "single_broadcast"
              : "broadcast",
        target_type: "notifications",
        target_id: targetMode === "single" ? targetUserId : null,
        details: `${getTypeLabel(messageType)}：${valid.cleanTitle} (${targetUsers.length} users)`,
      },
    ]);

    notifyNavbar();
    resetForm();

    setSending(false);

    alert(
      targetMode === "self"
        ? "测试信件已发送给自己。"
        : targetMode === "single"
          ? "信件已发送给指定居民。"
          : `已发送给 ${targetUsers.length} 位用户。`
    );
  }

  async function scheduleBroadcast() {
    if (!currentUser) return;

    const valid = validateMessage();
    if (!valid) return;

    if (targetMode === "single" && !targetUserId) {
      alert("请选择指定居民。");
      return;
    }

    const scheduledDate = new Date(scheduledFor);

    const confirmed = confirm(
      targetMode === "self"
        ? "确定预约一封只发给自己的测试信吗？"
        : targetMode === "single"
          ? "确定预约发送给这个指定居民吗？"
          : "你正在预约一封全站信件。\n\n到时间后会发送给所有 active 居民，确定继续吗？"
    );

    if (!confirmed) return;

    setSending(true);

    const { data, error } = await supabase
      .from("scheduled_broadcasts")
      .insert({
        created_by: currentUser.id,
        target_mode: targetMode,
        target_user_id: targetMode === "single" ? targetUserId : null,
        message_type: messageType,
        title: valid.cleanTitle,
        content: valid.cleanContent,
        is_important: isImportant,
        scheduled_for: scheduledDate.toISOString(),
        status: "scheduled",
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
      setSending(false);
      return;
    }

    await supabase.from("admin_logs").insert([
      {
        admin_id: currentUser.id,
        action: "schedule_broadcast",
        target_type: "scheduled_broadcast",
        target_id: String(data.id),
        details: `${getTypeLabel(messageType)}：${valid.cleanTitle}`,
      },
    ]);

    setScheduledBroadcasts((prev) => [data as ScheduledBroadcast, ...prev]);
    resetForm();

    setSending(false);
    alert("信件已加入待发列表。");
  }

  async function cancelScheduledBroadcast(item: ScheduledBroadcast) {
    const ok = confirm(`确定取消待发信件「${item.title}」吗？`);
    if (!ok) return;

    setCancellingId(item.id);

    const { error } = await supabase
      .from("scheduled_broadcasts")
      .update({
        status: "cancelled",
      })
      .eq("id", item.id)
      .eq("status", "scheduled");

    if (error) {
      alert(error.message);
      setCancellingId(null);
      return;
    }

    await supabase.from("admin_logs").insert([
      {
        admin_id: currentUser?.id,
        action: "cancel_scheduled_broadcast",
        target_type: "scheduled_broadcast",
        target_id: String(item.id),
        details: `取消待发信件：${item.title}`,
      },
    ]);

    setScheduledBroadcasts((prev) =>
      prev.filter((broadcast) => broadcast.id !== item.id)
    );

    setCancellingId(null);
  }

  function resetForm() {
    setTitle("");
    setContent("");
    setIsImportant(false);
    setMessageType("system");
    setSendMode("now");
    setScheduledFor("");
    setTargetMode("self");
    setTargetUserId("");
    setSearch("");
  }

  async function handleSubmit() {
    if (sendMode === "scheduled") {
      await scheduleBroadcast();
      return;
    }

    await sendBroadcastNow();
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-zinc-500">
        正在确认权限...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-4xl font-bold">📬 全站信件</h1>

        <p className="mt-2 text-zinc-500">
          给居民发送系统来信、活动通知、奖励通知或私人信件。
        </p>
      </div>

      <div className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-950/50 p-7">
        <BroadcastTemplates
          setMessageType={setMessageType}
          setTitle={setTitle}
          setContent={setContent}
          setIsImportant={setIsImportant}
        />

        <BroadcastTargetSelector
          profiles={profiles}
          search={search}
          setSearch={setSearch}
          targetMode={targetMode}
          setTargetMode={setTargetMode}
          targetUserId={targetUserId}
          setTargetUserId={setTargetUserId}
        />

        <BroadcastMessageEditor
          messageType={messageType}
          setMessageType={setMessageType}
          title={title}
          setTitle={setTitle}
          content={content}
          setContent={setContent}
          isImportant={isImportant}
          setIsImportant={setIsImportant}
          sendMode={sendMode}
          setSendMode={setSendMode}
          scheduledFor={scheduledFor}
          setScheduledFor={setScheduledFor}
        />

        <BroadcastPreview
          messageType={messageType}
          title={title}
          content={content}
        />

        <button
          onClick={handleSubmit}
          disabled={sending}
          className="rounded-full bg-white px-8 py-4 text-sm font-bold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending
            ? "处理中..."
            : sendMode === "scheduled"
              ? "加入待发列表"
              : targetMode === "self"
                ? "发送测试信"
                : targetMode === "single"
                  ? "发送给指定居民"
                  : "发送给所有居民"}
        </button>
      </div>

      <ScheduledBroadcasts
        items={scheduledBroadcasts}
        loading={scheduledLoading}
        cancellingId={cancellingId}
        onCancel={cancelScheduledBroadcast}
      />
    </div>
  );
}