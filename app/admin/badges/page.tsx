"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function AdminBadgesPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [userBadges, setUserBadges] = useState<any[]>([]);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedBadgeId, setSelectedBadgeId] = useState("");

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);

  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    description: string;
    danger?: boolean;
    action: (() => Promise<void>) | null;
  }>({
    title: "",
    description: "",
    danger: false,
    action: null,
  });

  const [badgeName, setBadgeName] = useState("");
  const [badgeColor, setBadgeColor] = useState("violet");
  const [badgeDescription, setBadgeDescription] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  function showMessage(text: string) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 3500);
  }

  function openConfirm(config: {
    title: string;
    description: string;
    danger?: boolean;
    action: () => Promise<void>;
  }) {
    setConfirmConfig(config);
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    if (!confirmConfig.action) return;

    setConfirmOpen(false);

    await confirmConfig.action();
  }

  async function fetchData() {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username")
      .order("username", { ascending: true });

    const { data: badgesData } = await supabase
      .from("badges")
      .select("*")
      .order("created_at", { ascending: false });

    setProfiles(profilesData || []);
    setBadges(badgesData || []);
  }

  async function writeLog(action: string, targetType: string, targetId: string, details: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("admin_logs").insert([
      {
        admin_id: user.id,
        action,
        target_type: targetType,
        target_id: targetId,
        details,
      },
    ]);
  }

  const filteredProfiles = profiles.filter((profile) => {
    const keyword = search.toLowerCase().trim();

    return (
      !keyword ||
      profile.username?.toLowerCase().includes(keyword) ||
      profile.id?.toLowerCase().includes(keyword)
    );
  });

  async function fetchUserBadges(userId: string) {
    if (!userId) {
      setUserBadges([]);
      return;
    }

    const { data } = await supabase
      .from("user_badges")
      .select(`
        id,
        created_at,
        badges (
          id,
          name,
          color,
          description
        ),
        assigner:assigned_by (
          id,
          username
        )
      `)
      .eq("user_id", userId);

    setUserBadges(data || []);
  }

  async function createBadge() {
    const cleanName = badgeName.trim();
    const cleanDescription = badgeDescription.trim();

    if (!cleanName) {
      showMessage("请输入徽章名称。");
      return;
    }

    const { data, error } = await supabase
      .from("badges")
      .insert([
        {
          name: cleanName,
          color: badgeColor,
          description: cleanDescription || null,
        },
      ])
      .select()
      .single();

    if (error) {
      showMessage(error.message);
      return;
    }

    await writeLog("create_badge", "badge", data.id, `创建徽章：${cleanName}`);

    setBadgeName("");
    setBadgeDescription("");
    setBadgeColor("violet");

    fetchData();
    showMessage("徽章已创建 🎖️");
  }

  function deleteBadge(badgeId: string) {
    openConfirm({
      title: "删除徽章？",
      description: "已发放给居民的对应记录也会一起清理。",
      danger: true,

      action: async () => {
        await supabase
          .from("user_badges")
          .delete()
          .eq("badge_id", badgeId);

        const { error } = await supabase
          .from("badges")
          .delete()
          .eq("id", badgeId);

        if (error) {
          showMessage(error.message);
          return;
        }

        await writeLog(
          "delete_badge",
          "badge",
          badgeId,
          "删除徽章"
        );

        if (selectedUserId) {
          fetchUserBadges(selectedUserId);
        }

        fetchData();

        showMessage("徽章已删除");
      },
    });
  }

  async function giveBadge() {
    if (!selectedUserId || !selectedBadgeId) {
      showMessage("请选择居民和徽章。");
      return;
    }

    setLoading(true);

    const selectedBadge = badges.find(
      (badge) => badge.id === selectedBadgeId
    );

    const { data: existingBadge } = await supabase
      .from("user_badges")
      .select("id")
      .eq("user_id", selectedUserId)
      .eq("badge_id", selectedBadgeId)
      .maybeSingle();

    if (existingBadge) {
      showMessage("这个居民已经拥有这个徽章了。");
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("user_badges").insert([
      {
        user_id: selectedUserId,
        badge_id: selectedBadgeId,
        assigned_by: user?.id || null,
      },
    ]);

    setLoading(false);

    if (error) {
      showMessage(error.message);
      return;
    }

    await writeLog(
      "give_badge",
      "user",
      selectedUserId,
      `发放徽章 ID: ${selectedBadgeId}`
    );

    await supabase.from("notifications").insert([
      {
        user_id: selectedUserId,
        title: "🎖️ 你获得了新的徽章",
        content: `你获得了「${
          selectedBadge?.name || "一枚新的徽章"
        }」。\n\n${
          selectedBadge?.description ||
          "谢谢你在小时代留下属于自己的痕迹。"
        }`,
        type: "badge",
        is_important: true,
      },
    ]);

    showMessage("徽章已颁发 🎖️");
    fetchUserBadges(selectedUserId);
  }

  function removeBadge(userBadgeId: string) {
    openConfirm({
      title: "移除徽章？",
      description: "移除后，该居民将失去这个徽章。",
      danger: true,

      action: async () => {
        const { error } = await supabase
          .from("user_badges")
          .delete()
          .eq("id", userBadgeId);

        if (error) {
          showMessage(error.message);
          return;
        }

        await writeLog(
          "remove_badge",
          "user",
          selectedUserId,
          `移除 user_badge ID: ${userBadgeId}`
        );

        setUserBadges((current) =>
          current.filter((item) => item.id !== userBadgeId)
        );

        showMessage("徽章已移除");
      },
    });
  }

  function getBadgeStyle(color: string) {
    switch (color) {
      case "gold":
        return "border-yellow-500/30 bg-yellow-500/10 text-yellow-200";
      case "emerald":
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
      case "rose":
        return "border-rose-500/30 bg-rose-500/10 text-rose-200";
      case "sky":
        return "border-sky-500/30 bg-sky-500/10 text-sky-200";
      default:
        return "border-violet-500/30 bg-violet-500/10 text-violet-200";
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">
          徽章管理 🎖️
        </h1>

        <p className="mt-2 text-zinc-500">
          创建徽章，并颁发给居民。
        </p>
      </div>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
        <h2 className="text-2xl font-bold">
          创建新徽章
        </h2>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <input
            value={badgeName}
            onChange={(e) => setBadgeName(e.target.value)}
            placeholder="徽章名称，例如 深夜居民"
            className="rounded-2xl border border-zinc-700 bg-black p-4 outline-none focus:border-white"
          />

          <select
            value={badgeColor}
            onChange={(e) => setBadgeColor(e.target.value)}
            className="rounded-2xl border border-zinc-700 bg-black p-4 outline-none focus:border-white"
          >
            <option value="violet">violet</option>
            <option value="gold">gold</option>
            <option value="emerald">emerald</option>
            <option value="rose">rose</option>
            <option value="sky">sky</option>
          </select>

          <button
            onClick={createBadge}
            className="rounded-2xl bg-white px-6 py-3 font-bold text-black transition hover:opacity-80"
          >
            创建徽章
          </button>
        </div>

        <textarea
          value={badgeDescription}
          onChange={(e) => setBadgeDescription(e.target.value)}
          placeholder="徽章说明，可选"
          rows={3}
          className="mt-4 w-full rounded-2xl border border-zinc-700 bg-black p-4 outline-none focus:border-white"
        />
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
        <h2 className="text-2xl font-bold">
          现有徽章
        </h2>

        <div className="mt-5 flex flex-wrap gap-3">
          {badges.length === 0 && (
            <p className="text-sm text-zinc-600">
              暂无徽章。
            </p>
          )}

          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`safe-text rounded-full border px-4 py-2 text-sm ${getBadgeStyle(
                badge.color
              )}`}
            >
              🎖️ {badge.name}

              <button
                onClick={() => deleteBadge(badge.id)}
                className="ml-3 text-red-200/70 hover:text-red-100"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-5 rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
        <h2 className="text-2xl font-bold">
          颁发徽章
        </h2>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索居民名称或 ID..."
          className="w-full rounded-2xl border border-zinc-700 bg-black p-4 outline-none focus:border-white"
        />

        <select
          value={selectedUserId}
          onChange={async (e) => {
            const value = e.target.value;
            setSelectedUserId(value);
            await fetchUserBadges(value);
          }}
          className="w-full rounded-2xl border border-zinc-700 bg-black p-4 outline-none focus:border-white"
        >
          <option value="">选择居民</option>

          {filteredProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.username || "无名居民"} · {profile.id}
            </option>
          ))}
        </select>

        <select
          value={selectedBadgeId}
          onChange={(e) => setSelectedBadgeId(e.target.value)}
          className="w-full rounded-2xl border border-zinc-700 bg-black p-4 outline-none focus:border-white"
        >
          <option value="">选择徽章</option>

          {badges.map((badge) => (
            <option key={badge.id} value={badge.id}>
              {badge.name}
            </option>
          ))}
        </select>

        <button
          onClick={giveBadge}
          disabled={loading}
          className="rounded-2xl bg-white px-6 py-3 font-bold text-black transition hover:opacity-80 disabled:opacity-40"
        >
          {loading ? "颁发中..." : "颁发徽章"}
        </button>

        {selectedUserId && (
          <div className="space-y-3 pt-4">
            <p className="text-sm text-zinc-500">
              该居民已拥有徽章
            </p>

            <div className="flex flex-wrap gap-3">
              {userBadges.length === 0 && (
                <p className="text-sm text-zinc-600">
                  暂无徽章。
                </p>
              )}

              {userBadges.map((item: any) => {
                const badge = item.badges;

                const assigner = Array.isArray(item.assigner)
                  ? item.assigner[0]
                  : item.assigner;
                if (!badge) return null;

                return (
                  <button
                    key={item.id}
                    onClick={() => removeBadge(item.id)}
                    className={`safe-text rounded-full border px-4 py-2 text-sm transition hover:opacity-80 ${getBadgeStyle(
                      badge.color
                    )}`}
                  >
                    🎖️ {badge.name}
                        {assigner?.username ? ` · ${assigner.username}` : ""} ×
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

        {message && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-white/10 bg-zinc-900/95 px-5 py-3 text-sm text-white shadow-2xl backdrop-blur-xl">
            {message}
          </div>
        )}

        <ConfirmDialog
          open={confirmOpen}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmText="确认"
          cancelText="取消"
          danger={confirmConfig.danger}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleConfirm}
        />

    </div>
  );
}