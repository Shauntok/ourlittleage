"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

function PrivacySwitch({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onChange}
      className={`h-[52px] w-[150px] rounded-2xl border text-sm font-bold transition-all duration-300 ${
        disabled
          ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-white/15"
          : checked
          ? "border-violet-300/60 bg-violet-500/30 text-white shadow-[0_0_35px_rgba(139,92,246,0.22)]"
          : "border-white/10 bg-white/[0.035] text-white/35 hover:border-white/20 hover:text-white/65"
      }`}
    >
      {label}
    </button>
  );
}

export default function ProfileSettingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [showLevel, setShowLevel] = useState(true);
  const [showExp, setShowExp] = useState(true);
  const [showTrustScore, setShowTrustScore] = useState(true);
  const [showJoinedDays, setShowJoinedDays] = useState(true);

  const [moodEmoji, setMoodEmoji] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);

  useEffect(() => {
    async function getProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/home");;
        return;
      }

      setUser(user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profile);

      setUsername(profile?.username || "");
      setBio(profile?.bio || "");

      setMoodEmoji(profile?.mood_emoji || "");
      setStatusMessage(profile?.status_message || "");

      setShowLevel(profile?.show_level ?? true);
      setShowExp(profile?.show_exp ?? true);
      setShowTrustScore(profile?.show_trust_score ?? true);
      setShowJoinedDays(profile?.show_joined_days ?? true);

      setLoading(false);
    }

    getProfile();
  }, [router]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!hasUnsavedChanges) return;

      e.preventDefault();
      e.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  async function saveProfile() {
    if (!user) return;

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        username,
        bio,
        show_level: showLevel,
        show_exp: showExp,
        show_trust_score: showTrustScore,
        show_joined_days: showJoinedDays,
      })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    setProfile((current: any) => ({
      ...current,
      username,
      bio,
      show_level: showLevel,
      show_exp: showExp,
      show_trust_score: showTrustScore,
      show_joined_days: showJoinedDays,
    }));

    setHasUnsavedChanges(false);

    alert("房间资料已更新。");
  }

  async function saveMoodStatus() {
    if (!user) return;

    if (!moodEmoji && !statusMessage.trim()) {
      alert("请先选择心情或写一句状态。");
      return;
    }

    setStatusSaving(true);

    const expiresAt = new Date(
      Date.now() + 18 * 60 * 60 * 1000
    ).toISOString();

    const { error } = await supabase
      .from("profiles")
      .update({
        mood_emoji: moodEmoji,
        status_message: statusMessage,
        status_expires_at: expiresAt,
      })
      .eq("id", user.id);

    setStatusSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    setProfile((current: any) => ({
      ...current,
      mood_emoji: moodEmoji,
      status_message: statusMessage,
      status_expires_at: expiresAt,
    }));

    alert("今日状态已更新。");
  }

  async function clearMoodStatus() {
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        mood_emoji: null,
        status_message: null,
        status_expires_at: null,
      })
      .eq("id", user.id);

    if (error) {
      alert(error.message);
      return;
    }

    setMoodEmoji("");
    setStatusMessage("");

    setProfile((current: any) => ({
      ...current,
      mood_emoji: null,
      status_message: null,
      status_expires_at: null,
    }));

    alert("今日状态已取消。");
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file || !user) return;

    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, {
        upsert: true,
      });

    if (uploadError) {
      alert(uploadError.message);
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        avatar_url: publicUrl,
      })
      .eq("id", user.id);

    setUploading(false);

    if (profileError) {
      alert(profileError.message);
      return;
    }

    setProfile((current: any) => ({
      ...current,
      avatar_url: publicUrl,
    }));

    alert("头像上传成功。");
  }

  async function uploadBanner(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file || !user) return;

    setBannerUploading(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("banners")
      .upload(fileName, file, {
        upsert: true,
      });

    if (uploadError) {
      alert(uploadError.message);
      setBannerUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("banners").getPublicUrl(fileName);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        banner_url: publicUrl,
      })
      .eq("id", user.id);

    setBannerUploading(false);

    if (profileError) {
      alert(profileError.message);
      return;
    }

    setProfile((current: any) => ({
      ...current,
      banner_url: publicUrl,
    }));

    alert("背景图上传成功。");
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-white">
        <p className="text-sm tracking-[0.3em] text-white/35">
          正在打开你的房间...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <p className="text-xs tracking-[0.4em] text-white/25">
          PROFILE SETTINGS
        </p>

        <h1 className="mt-6 text-5xl font-light tracking-tight">
          编辑你的房间
        </h1>

        <p className="mt-6 max-w-xl text-sm leading-8 text-white/40">
          上传头像、设置背景、留下今日状态。这里会慢慢成为别人认识你的入口。
        </p>
      </div>

      <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.035]">
        <div className="absolute inset-0 opacity-35">
          {profile?.banner_url ? (
            <img
              src={profile.banner_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-zinc-900 via-black to-zinc-950" />
          )}
        </div>

        <div className="absolute inset-0 bg-black/60" />

        <div className="absolute bottom-6 left-8 z-[1] pointer-events-none select-none text-6xl font-black text-white/5">
          ROOM
        </div>

        <div className="relative z-10 grid grid-cols-1 gap-8 p-8 pb-20 lg:grid-cols-[220px_1fr]">
          <div className="space-y-5">
            <div className="h-32 w-32 overflow-hidden rounded-full border border-white/15 bg-black/60 shadow-[0_0_45px_rgba(255,255,255,0.08)]">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-5xl text-white/25">
                  👤
                </div>
              )}
            </div>

            <label className="inline-flex w-full cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-black/50 px-5 py-3 text-sm text-white/65 transition hover:border-white/25 hover:text-white">
              <span>{uploading ? "上传中..." : "上传头像"}</span>

              <input
                type="file"
                accept="image/*"
                onChange={uploadAvatar}
                className="hidden"
              />
            </label>

            <label className="inline-flex w-full cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-black/50 px-5 py-3 text-sm text-white/65 transition hover:border-white/25 hover:text-white">
              <span>{bannerUploading ? "上传中..." : "上传背景图"}</span>

              <input
                type="file"
                accept="image/*"
                onChange={uploadBanner}
                className="hidden"
              />
            </label>

            <p className="text-sm leading-7 text-white/35">
              背景图未来会成为你个人主页的房间背景。
            </p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm text-white/45">用户名称</p>

              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full rounded-2xl border border-white/10 bg-black/60 p-4 text-white outline-none transition focus:border-white/30"
                placeholder="别人会怎么称呼你？"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm text-white/45">个人简介</p>

              <textarea
                rows={7}
                value={bio}
                onChange={(e) => {
                  setBio(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full resize-none rounded-2xl border border-white/10 bg-black/60 p-4 leading-8 text-white outline-none transition focus:border-white/30"
                placeholder="介绍一下自己..."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[2.2rem] border border-white/10 bg-white/[0.035] p-7">
        <div>
          <h2 className="text-2xl font-light">🌙 今日状态</h2>

          <p className="mt-2 text-sm text-white/35">
            心情状态将在 18 小时后自动过期。
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {["🌙", "☁️", "🌧️", "🎧", "☕", "✨", "💭", "📖", "🌫️", "🫧"].map(
            (emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setMoodEmoji(emoji)}
                className={
                  moodEmoji === emoji
                    ? "flex h-12 w-12 items-center justify-center rounded-2xl border border-white/30 bg-white/10 text-2xl"
                    : "flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-2xl transition hover:border-white/25"
                }
              >
                {emoji}
              </button>
            )
          )}

          <input
            value={moodEmoji}
            onChange={(e) => setMoodEmoji(e.target.value)}
            placeholder="自定义"
            maxLength={2}
            className="h-12 w-24 rounded-2xl border border-white/10 bg-black/40 text-center text-xl outline-none transition focus:border-white/30"
          />
        </div>

        <textarea
          placeholder="写下今天的状态..."
          value={statusMessage}
          onChange={(e) => setStatusMessage(e.target.value)}
          rows={3}
          className="mt-5 w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-5 py-4 leading-7 outline-none transition focus:border-white/30"
        />

        {(moodEmoji || statusMessage) && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-white/70">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{moodEmoji || "🌙"}</span>

              {statusMessage && (
                <span className="text-sm text-white/80">{statusMessage}</span>
              )}
            </div>

            <p className="mt-2 text-xs text-white/30">
              今日状态将在夜里安静下来。
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={saveMoodStatus}
            disabled={statusSaving}
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
          >
            {profile?.status_expires_at &&
            new Date(profile.status_expires_at).getTime() > Date.now()
              ? "更新今日状态"
              : "设置今日状态"}
          </button>

          {(moodEmoji || statusMessage) && (
            <button
              onClick={clearMoodStatus}
              className="rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm text-white/60 transition hover:border-white/20 hover:text-white"
            >
              取消状态
            </button>
          )}
        </div>
      </div>

      <div className="rounded-[2.2rem] border border-white/10 bg-white/[0.035] p-7">
        <h2 className="text-2xl font-light">公开显示</h2>

        <p className="mt-2 text-sm leading-7 text-white/35">
          这些设置会影响未来别人进入你的房间时能看到什么。
        </p>

        <div className="mt-6 flex flex-wrap gap-4">
          <PrivacySwitch
            label="显示等级"
            checked={showLevel}
            onChange={() => {
              setShowLevel(!showLevel);
              setHasUnsavedChanges(true);
            }}
          />

          <PrivacySwitch
            label="显示经验"
            checked={showExp}
            onChange={() => {
              setShowExp(!showExp);
              setHasUnsavedChanges(true);
            }}
          />

          <PrivacySwitch
            label="显示信任值"
            checked={showTrustScore}
            onChange={() => {
              setShowTrustScore(!showTrustScore);
              setHasUnsavedChanges(true);
            }}
          />

          <PrivacySwitch
            label="显示加入天数"
            checked={showJoinedDays}
            onChange={() => {
              setShowJoinedDays(!showJoinedDays);
              setHasUnsavedChanges(true);
            }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={saveProfile}
          disabled={saving}
          className="rounded-full bg-white px-8 py-4 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-40"
        >
          {saving ? "保存中..." : "保存房间资料"}
        </button>

        {hasUnsavedChanges && (
          <p className="text-sm text-yellow-200/60">
            你有还没保存的房间资料。
          </p>
        )}
      </div>
    </div>
  );
}