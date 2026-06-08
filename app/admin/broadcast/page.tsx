"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type TargetMode = "self" | "single" | "all";
type MessageType = "system" | "announcement" | "event" | "reward" | "private";

export default function AdminBroadcastPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentRole, setCurrentRole] = useState("user");

  const [profiles, setProfiles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [targetMode, setTargetMode] = useState<TargetMode>("self");
  const [targetUserId, setTargetUserId] = useState("");

  const [messageType, setMessageType] = useState<MessageType>("system");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [isImportant, setIsImportant] = useState(false);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

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
        window.location.href = "/";
        return;
      }

      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, username, role, status")
        .order("username", {
          ascending: true,
        });

      setProfiles(usersData || []);
      setLoading(false);
    }

    checkPermission();
  }, []);

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

  function applyTemplate(template: string) {
    if (template === "alpha") {
      setMessageType("announcement");
      setTitle("📢 小时代 Alpha 测试提醒");
      setContent(
        "感谢你参与小时代 Alpha 测试。\n\n如果你遇到 Bug、显示异常、功能卡住，欢迎把问题反馈给管理层。\n\n这个世界还在慢慢建设，谢谢你愿意先住进来。"
      );
      setIsImportant(true);
    }

    if (template === "maintenance") {
      setMessageType("announcement");
      setTitle("🛠 系统维护通知");
      setContent(
        "小时代将进行短暂维护。\n\n维护期间部分页面可能无法正常使用。\n\n维护完成后，我们会继续把世界点亮。"
      );
      setIsImportant(true);
    }

    if (template === "reward") {
      setMessageType("reward");
      setTitle("🎖️ 你收到了一份奖励");
      setContent(
        "因为你在小时代留下了温柔而重要的痕迹，管理层向你送出一份小小的奖励。\n\n谢谢你让这个世界更像一个家。"
      );
      setIsImportant(false);
    }

    if (template === "private") {
      setMessageType("private");
      setTitle("💌 来自管理层的一封信");
      setContent(
        "你好，这是一封来自小时代管理层的私人信件。\n\n我们想和你说一些只属于你的事情。"
      );
      setIsImportant(false);
    }
  }

  const filteredProfiles = profiles.filter((profile) => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) return true;

    return (
      profile.username?.toLowerCase().includes(keyword) ||
      profile.id?.toLowerCase().includes(keyword)
    );
  });

  async function getTargetUsers() {
    if (!currentUser) return [];

    if (targetMode === "self") {
      return [
        {
          id: currentUser.id,
        },
      ];
    }

    if (targetMode === "single") {
      if (!targetUserId) {
        alert("请选择指定居民。");
        return [];
      }

      return [
        {
          id: targetUserId,
        },
      ];
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

  async function sendBroadcast() {
    if (!currentUser) return;

    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (!cleanTitle) {
      alert("请输入信件标题。");
      return;
    }

    if (!cleanContent) {
      alert("请输入信件内容。");
      return;
    }

    const targetUsers = await getTargetUsers();

    if (targetUsers.length === 0) return;

    const confirmed = confirm(
      targetMode === "self"
        ? "确定只发送给自己测试吗？"
        : targetMode === "single"
        ? "确定发送给这个指定居民吗？"
        : `确定发送给所有 active 用户吗？共 ${targetUsers.length} 位。`
    );

    if (!confirmed) return;

    setSending(true);

    const rows = targetUsers.map((user) => ({
      user_id: user.id,
      title: cleanTitle,
      content: cleanContent,
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
        details: `${getTypeLabel(messageType)}：${cleanTitle} (${targetUsers.length} users)`,
      },
    ]);

    notifyNavbar();

    setSending(false);
    setTitle("");
    setContent("");
    setIsImportant(false);
    setMessageType("system");

    alert(
      targetMode === "self"
        ? "测试信件已发送给自己。"
        : targetMode === "single"
        ? "信件已发送给指定居民。"
        : `已发送给 ${targetUsers.length} 位用户。`
    );
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
        <h1 className="text-4xl font-bold">
          📬 全站信件
        </h1>

        <p className="mt-2 text-zinc-500">
          给居民发送系统来信、活动通知、奖励通知或私人信件。
        </p>
      </div>

      <div className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-950/50 p-7">
        <section className="space-y-3">
          <p className="text-sm text-zinc-400">
            快速模板
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => applyTemplate("alpha")}
              className="rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-200 transition hover:bg-violet-500/20"
            >
              Alpha 测试提醒
            </button>

            <button
              type="button"
              onClick={() => applyTemplate("maintenance")}
              className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-200 transition hover:bg-yellow-500/20"
            >
              系统维护
            </button>

            <button
              type="button"
              onClick={() => applyTemplate("reward")}
              className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-500/20"
            >
              奖励通知
            </button>

            <button
              type="button"
              onClick={() => applyTemplate("private")}
              className="rounded-full border border-pink-500/30 bg-pink-500/10 px-4 py-2 text-sm text-pink-200 transition hover:bg-pink-500/20"
            >
              私人信件
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-sm text-zinc-400">
            发送对象
          </p>

          <div className="flex flex-wrap gap-3">
            {[
              {
                key: "self",
                label: "🧪 只发给自己测试",
              },
              {
                key: "single",
                label: "👤 指定居民",
              },
              {
                key: "all",
                label: "🌍 所有 active 居民",
              },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() =>
                  setTargetMode(item.key as TargetMode)
                }
                className={
                  targetMode === item.key
                    ? "rounded-full border border-white bg-white px-5 py-3 text-sm font-semibold text-black transition"
                    : "rounded-full border border-zinc-700 bg-black px-5 py-3 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-white"
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {targetMode === "single" && (
          <section className="space-y-4 rounded-3xl border border-zinc-800 bg-black/40 p-5">
            <p className="text-sm text-zinc-400">
              选择居民
            </p>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索居民名称或 ID..."
              className="w-full rounded-2xl border border-zinc-800 bg-black px-5 py-4 outline-none transition focus:border-white"
            />

            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-5 py-4 outline-none transition focus:border-white"
            >
              <option value="">选择一位居民</option>

              {filteredProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.username || "无名居民"} · {profile.status || "active"}
                </option>
              ))}
            </select>
          </section>
        )}

        <section className="space-y-3">
          <p className="text-sm text-zinc-400">
            信件类型
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                key: "system",
                label: "🌙 系统",
              },
              {
                key: "announcement",
                label: "📢 公告",
              },
              {
                key: "event",
                label: "🏮 活动",
              },
              {
                key: "reward",
                label: "🎖️ 奖励",
              },
              {
                key: "private",
                label: "💌 私信",
              },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() =>
                  setMessageType(item.key as MessageType)
                }
                className={
                  messageType === item.key
                    ? "rounded-2xl border border-white bg-white px-4 py-3 text-sm font-semibold text-black transition"
                    : "rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-white"
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-sm text-zinc-400">
            信件标题
          </p>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：🌙 今晚的月色很好"
            className="w-full rounded-2xl border border-zinc-800 bg-black px-5 py-4 outline-none transition focus:border-white"
          />
        </section>

        <section className="space-y-2">
          <p className="text-sm text-zinc-400">
            信件内容
          </p>

          <textarea
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写给居民的话..."
            className="safe-pre w-full resize-none rounded-2xl border border-zinc-800 bg-black px-5 py-4 leading-8 outline-none transition focus:border-white"
          />
        </section>

        <button
          type="button"
          onClick={() => setIsImportant(!isImportant)}
          className={
            isImportant
              ? "rounded-full border border-red-400/40 bg-red-500/10 px-5 py-3 text-sm text-red-200"
              : "rounded-full border border-zinc-700 bg-black px-5 py-3 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-white"
          }
        >
          {isImportant ? "🚨 已标记重要" : "标记为重要信件"}
        </button>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-black/50 p-5">
          <p className="text-sm text-zinc-500">
            预览 · {getTypeLabel(messageType)}
          </p>

          <h2 className="safe-text mt-4 text-2xl font-bold">
            {title || "信件标题会显示在这里"}
          </h2>

          <p className="safe-pre mt-4 leading-8 text-zinc-300">
            {content || "信件内容会显示在这里。"}
          </p>
        </section>

        <button
          onClick={sendBroadcast}
          disabled={sending}
          className="rounded-full bg-white px-8 py-4 text-sm font-bold text-black transition hover:bg-white/90 disabled:opacity-40"
        >
          {sending
            ? "发送中..."
            : targetMode === "self"
            ? "发送测试信"
            : targetMode === "single"
            ? "发送给指定居民"
            : "发送给所有居民"}
        </button>
      </div>
    </div>
  );
}