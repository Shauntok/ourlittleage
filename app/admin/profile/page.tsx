"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// ===== 公开设置胶囊按钮 =====
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
      className={`w-[150px] h-[52px] rounded-2xl border text-sm font-bold transition-all duration-300 ${
        disabled
          ? "border-zinc-900 bg-black/20 text-zinc-700 cursor-not-allowed"
          : checked
          ? "border-violet-400 bg-violet-500 text-white shadow-lg shadow-violet-500/40"
          : "border-zinc-800 bg-black/40 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}

export default function AdminProfilePage() {

  const [user, setUser] =
    useState<any>(null);

  const [profile, setProfile] =
    useState<any>(null);

  const [username, setUsername] =
    useState("");

  const [bio, setBio] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [bannerUploading, setBannerUploading] =
    useState(false);

  const [hasUnsavedChanges, setHasUnsavedChanges] =
    useState(false);

  const [showLevel, setShowLevel] =
    useState(true);

  const [showExp, setShowExp] =
    useState(true);

  const [showTrustScore, setShowTrustScore] =
    useState(true);

  const [showJoinedDays, setShowJoinedDays] =
    useState(true);

  // ===== 今日状态 =====
  const [moodEmoji, setMoodEmoji] =
    useState("");

  const [statusMessage, setStatusMessage] =
    useState("");

  const [statusSaving, setStatusSaving] =
    useState(false);

  // ===== 获取当前登录用户资料 =====
  useEffect(() => {

    async function getUser() {

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);

      if (!user) return;

      const { data: profile } =
        await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

      setProfile(profile);

      setUsername(
        profile?.username || ""
      );

      setBio(
        profile?.bio || ""
      );

      setMoodEmoji(
        profile?.mood_emoji || ""
      );

      setStatusMessage(
        profile?.status_message || ""
      );

      setShowLevel(
        profile?.show_level ?? true
      );

      setShowExp(
        profile?.show_exp ?? true
      );

      setShowTrustScore(
        profile?.show_trust_score ?? true
      );

      setShowJoinedDays(
        profile?.show_joined_days ?? true
      );
    }

    getUser();

  }, []);

  // ===== 刷新 / 离开页面提醒 =====
  useEffect(() => {

    function handleBeforeUnload(
      e: BeforeUnloadEvent
    ) {

      if (!hasUnsavedChanges) return;

      e.preventDefault();
      e.returnValue = "";
    }

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );
    };

  }, [hasUnsavedChanges]);

  // ===== 给 Sidebar 使用 =====
  useEffect(() => {

    (window as any)
      .adminHasUnsavedChanges =
      hasUnsavedChanges;

    return () => {

      (window as any)
        .adminHasUnsavedChanges =
        false;
    };

  }, [hasUnsavedChanges]);

  // ===== 保存资料 =====
  async function saveProfile() {

    if (!user) return;

    setSaving(true);

    const { error } =
      await supabase
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

    setHasUnsavedChanges(false);

    alert("资料已更新 🔥");
  }

  // ===== 保存今日状态 =====
  async function saveMoodStatus() {

    if (!user) return;

    if (
      !moodEmoji &&
      !statusMessage.trim()
    ) {
      alert("请先选择心情或写一句状态");
      return;
    }

    setStatusSaving(true);

    const expiresAt = new Date(
      Date.now() +
      18 * 60 * 60 * 1000
    ).toISOString();

    const { error } =
      await supabase
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

    alert("今日状态已更新 🌙");
  }

  // ===== 取消今日状态 =====
  async function clearMoodStatus() {

    if (!user) return;

    const { error } =
      await supabase
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

    alert("今日状态已取消 🌙");
  }

  // ===== 上传头像 =====
  async function uploadAvatar(
    e: React.ChangeEvent<HTMLInputElement>
  ) {

    const file =
      e.target.files?.[0];

    if (!file || !user) return;

    setUploading(true);

    const fileExt =
      file.name.split(".").pop();

    const fileName =
      `${user.id}.${fileExt}`;

    const {
      error: uploadError,
    } = await supabase.storage
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
    } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const {
      error: profileError,
    } = await supabase
      .from("profiles")
      .update({
        avatar: publicUrl,
      })
      .eq("id", user.id);

    setUploading(false);

    if (profileError) {
      alert(profileError.message);
      return;
    }

    alert("头像上传成功 🔥");

    window.location.reload();
  }

  // ===== 上传 Banner =====
  async function uploadBanner(
    e: React.ChangeEvent<HTMLInputElement>
  ) {

    const file =
      e.target.files?.[0];

    if (!file || !user) return;

    setBannerUploading(true);

    const fileExt =
      file.name.split(".").pop();

    const fileName =
      `${user.id}.${fileExt}`;

    const {
      error: uploadError,
    } = await supabase.storage
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
    } = supabase.storage
      .from("banners")
      .getPublicUrl(fileName);

    const {
      error: profileError,
    } = await supabase
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

    alert("Banner 上传成功 🔥");

    window.location.reload();
  }

  return (
    <main className="max-w-2xl space-y-8">

      {/* ===== 页面标题 ===== */}
      <div>

        <h1 className="text-4xl font-bold">
          我的资料 👤
        </h1>

        <p className="mt-2 text-zinc-500">
          上传头像、管理个人资料与今日状态。
        </p>
      </div>

      {/* ===== 资料编辑主区域 ===== */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/40">
        {/* ===== Banner 背景层 ===== */}
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

        {/* ===== 黑色遮罩 ===== */}
        <div className="absolute inset-0 bg-black/55" />

        {/* ===== 背景图水印 ===== */}
        <div
          className={`absolute bottom-4 left-8 z-[1] pointer-events-none select-none text-6xl font-black ${
            profile?.banner_url ? "text-white/20" : "text-white/5"
          }`}
        >
          背景图
        </div>

        {/* ===== 内容层 ===== */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8 p-8 pb-20">
          {/* ===== 左边：头像 + 上传按钮 ===== */}
          <div className="space-y-5">
            <div className="h-32 w-32 rounded-full overflow-hidden border border-zinc-600 bg-black/60">
              {profile?.avatar ? (
                <img
                  src={profile.avatar}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-5xl">
                  👤
                </div>
              )}
            </div>

            <label className="inline-flex items-center justify-center w-full px-5 py-3 rounded-xl bg-black/60 border border-zinc-700 cursor-pointer hover:border-white transition">
              <span>{uploading ? "上传中..." : "上传头像"}</span>

              <input
                type="file"
                accept="image/*"
                onChange={uploadAvatar}
                className="hidden"
              />
            </label>

            <label className="inline-flex items-center justify-center w-full px-5 py-3 rounded-xl bg-black/60 border border-zinc-700 cursor-pointer hover:border-white transition">
              <span>{bannerUploading ? "上传中..." : "上传背景图"}</span>

              <input
                type="file"
                accept="image/*"
                onChange={uploadBanner}
                className="hidden"
              />
            </label>

            <p className="text-sm text-zinc-400 leading-6">
              背景图会成为你个人主页的房间背景。
            </p>
          </div>

          {/* ===== 右边：基本资料表单 ===== */}
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm text-zinc-300">用户名称</p>

              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full p-4 rounded-2xl bg-black/70 border border-zinc-600 text-white outline-none focus:border-white"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm text-zinc-300">个人简介</p>

              <textarea
                rows={7}
                value={bio}
                onChange={(e) => {
                  setBio(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full p-4 rounded-2xl bg-black/70 border border-zinc-600 text-white outline-none focus:border-white"
                placeholder="介绍一下自己..."
              />
            </div>
          </div>
        </div>
      </div>

            {/* ===== 今日状态 ===== */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6 space-y-5">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">
            🌙 今日状态
          </h2>

          <p className="text-sm text-zinc-500">
            心情状态将在 18 小时后自动过期。
          </p>
        </div>

        {/* ===== Emoji 心情选择 ===== */}
        <div className="flex flex-wrap gap-3">
          {[
            "🌙",
            "☁️",
            "🌧️",
            "🎧",
            "☕",
            "✨",
            "💭",
            "📖",
            "🌫️",
            "🫧",
          ].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setMoodEmoji(emoji)}
              className={
                moodEmoji === emoji
                  ? "flex h-12 w-12 items-center justify-center rounded-2xl border border-white bg-white/10 text-2xl"
                  : "flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-black text-2xl hover:border-zinc-500"
              }
            >
              {emoji}
            </button>
          ))}

          {/* ===== 自定义 Emoji ===== */}
          <input
            value={moodEmoji}
            onChange={(e) =>
              setMoodEmoji(e.target.value)
            }
            placeholder="自定义"
            maxLength={2}
            className="h-12 w-24 rounded-2xl border border-zinc-800 bg-black text-center text-xl outline-none focus:border-white"
          />
        </div>

        {/* ===== 状态文字 ===== */}
        <textarea
          placeholder="写下今天的状态..."
          value={statusMessage}
          onChange={(e) =>
            setStatusMessage(e.target.value)
          }
          rows={3}
          className="w-full rounded-2xl border border-zinc-800 bg-black px-5 py-4 outline-none focus:border-zinc-500"
        />

        {/* ===== 状态预览 ===== */}
        {(moodEmoji || statusMessage) && (
          <div className="rounded-2xl border border-zinc-800 bg-black/50 px-5 py-4 text-zinc-300">
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {moodEmoji || "🌙"}
              </span>

              {statusMessage && (
                <span className="text-sm text-zinc-200">
                  {statusMessage}
                </span>
              )}
            </div>

            <p className="mt-2 text-xs text-zinc-500">
              今日状态将在夜里安静下来
            </p>
          </div>
        )}

        {/* ===== 状态操作按钮 ===== */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={saveMoodStatus}
            disabled={statusSaving}
            className="rounded-2xl bg-white px-6 py-3 font-bold text-black disabled:opacity-50"
          >
            {profile?.status_expires_at &&
            new Date(profile.status_expires_at).getTime() >
              Date.now()
              ? "更新今日状态"
              : "设置今日状态"}
          </button>

          {(moodEmoji || statusMessage) && (
            <button
              onClick={clearMoodStatus}
              className="rounded-2xl border border-zinc-700 px-6 py-3 font-bold text-zinc-300 hover:border-zinc-500"
            >
              取消状态
            </button>
          )}
        </div>
      </div>
    </main>
  );
}