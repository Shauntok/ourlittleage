"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminBadgesPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedBadgeId, setSelectedBadgeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [userBadges, setUserBadges] =useState<any[]>([]);
  const [search, setSearch] = useState("");

  // ===== 读取用户和徽章 =====
  useEffect(() => {
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

    fetchData();
  }, []);

    // ===== 搜索过滤 =====
    const filteredProfiles = profiles.filter(
    (profile) =>
        profile.username
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||

        profile.id
        ?.toLowerCase()
        .includes(search.toLowerCase())
    );

    // ===== 读取用户已有徽章 =====
    async function fetchUserBadges(
      userId: string
    ) {
      if (!userId) {
        setUserBadges([]);
        return;
      }

      const { data } = await supabase
        .from("user_badges")
        .select(`
          id,
          badges (
            id,
            name,
            color
          )
        `)
        .eq("user_id", userId);

      setUserBadges(data || []);
    }

  // ===== 颁发徽章 =====
  async function giveBadge() {
    if (!selectedUserId || !selectedBadgeId) {
      alert("请选择用户和徽章");
      return;
    }

    setLoading(true);

    const { data: existingBadge } = await supabase
      .from("user_badges")
      .select("id")
      .eq("user_id", selectedUserId)
      .eq("badge_id", selectedBadgeId)
      .maybeSingle();

    if (existingBadge) {
      alert("这个居民已经拥有这个徽章了");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("user_badges").insert([
      {
        user_id: selectedUserId,
        badge_id: selectedBadgeId,
      },
    ]);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    // ===== 获取当前 admin =====
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // ===== 写入日志 =====
    await supabase.from("admin_logs").insert([
      {
        admin_id: user?.id,
        action: "give_badge",
        target_type: "user",
        target_id: selectedUserId,
        details: `发放徽章 ID: ${selectedBadgeId}`,
      },
    ]);

      alert("徽章已颁发 🎖️");
      fetchUserBadges(selectedUserId);
    }

      // ===== 移除徽章 =====
    async function removeBadge(
      userBadgeId: string
    ) {
      const confirmed = confirm(
        "确定移除这个徽章吗？"
      );

      if (!confirmed) return;

      const { error } = await supabase
        .from("user_badges")
        .delete()
        .eq("id", userBadgeId);

      if (error) {
        alert(error.message);
        return;
      }

      // ===== 获取当前 admin =====
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // ===== 写入日志 =====
      await supabase.from("admin_logs").insert([
        {
          admin_id: user?.id,
          action: "remove_badge",
          target_type: "user",
          target_id: selectedUserId,
          details: `移除 user_badge ID: ${userBadgeId}`,
        },
      ]);

      setUserBadges((current) =>
        current.filter((item) => item.id !== userBadgeId)
      );

      alert("徽章已移除");
    }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-4xl font-bold">
          徽章管理 🎖️
        </h1>

        <p className="text-zinc-500 mt-2">
          给居民颁发身份徽章。
        </p>
      </div>

      <div className="space-y-5 rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
      <input
        type="text"
        value={search}
        onChange={(e) =>
            setSearch(e.target.value)
        }
        placeholder="搜索居民名称或 ID..."
        className="w-full p-4 rounded-2xl bg-black border border-zinc-700 outline-none focus:border-white"
        />
        <select
          value={selectedUserId}
          onChange={async (e) => {
            const value = e.target.value;

            setSelectedUserId(value);

            await fetchUserBadges(value);
          }}
          className="w-full p-4 rounded-2xl bg-black border border-zinc-700 outline-none focus:border-white"
        >
          <option value="">选择居民</option>

          {filteredProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.username}
            </option>
          ))}
        </select>

        <select
          value={selectedBadgeId}
          onChange={(e) => setSelectedBadgeId(e.target.value)}
          className="w-full p-4 rounded-2xl bg-black border border-zinc-700 outline-none focus:border-white"
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
          className="px-6 py-3 rounded-2xl bg-white text-black font-bold hover:opacity-80 transition"
        >
          {loading ? "颁发中..." : "颁发徽章"}
        </button>

        {/* ===== 已拥有徽章 ===== */}
        {userBadges.length > 0 && (
          <div className="space-y-3 pt-4">
            <p className="text-sm text-zinc-500">
              已拥有徽章
            </p>

            <div className="flex flex-wrap gap-3">
              {userBadges.map((item: any) => {
                const badge = item.badges;

                if (!badge) return null;

                return (
                  <button
                    key={item.id}
                    onClick={() =>
                      removeBadge(item.id)
                    }
                    className="px-4 py-2 rounded-full border border-red-500 bg-red-500/10 text-red-200 hover:bg-red-500/20 transition"
                  >
                    {badge.name} ×
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}