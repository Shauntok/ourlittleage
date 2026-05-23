"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [username, setUsername] =useState("");
    const [bio, setBio] =useState("");
    const [saving, setSaving] =useState(false);
    const [uploading, setUploading] =useState(false);
    const [bannerUploading, setBannerUploading] =useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] =useState(false);
    const [showLevel, setShowLevel] =useState(true);
    const [showExp, setShowExp] =useState(true);
    const [showTrustScore, setShowTrustScore] =useState(true);
    const [showJoinedDays, setShowJoinedDays] =useState(true);

  // ===== 获取当前登录用户 =====
  useEffect(() => {
    async function getUser() {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        setUser(user);

        if (user) {
            const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

            setProfile(profile);
            setUsername(profile?.username || "");
            setBio(profile?.bio || "");
            setShowLevel(profile?.show_level ?? true);
        setShowExp(profile?.show_exp ?? true);
        setShowTrustScore(
        profile?.show_trust_score ?? true
        );
        setShowJoinedDays(
        profile?.show_joined_days ?? true
        );
        }
        }

        getUser();
        }, []);

      // ===== 离开页面提醒 =====
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

        // ===== 把未保存状态交给 AdminSidebar 使用 =====
            useEffect(() => {
            (window as any).adminHasUnsavedChanges =
                hasUnsavedChanges;

            return () => {
                (window as any).adminHasUnsavedChanges = false;
            };
            }, [hasUnsavedChanges]);

     // ===== 保存个人资料 =====
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

    setHasUnsavedChanges(false);
    alert("资料已更新 🔥");
    }

  // ===== 上传头像 =====
  async function uploadAvatar(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file || !user) return;

    setUploading(true);

    const fileExt =
      file.name.split(".").pop();

    const fileName =
      `${user.id}.${fileExt}`;

    // ===== 上传到 avatars bucket =====
    const { error: uploadError } =
      await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
          upsert: true,
        });

    if (uploadError) {
      alert(uploadError.message);
      setUploading(false);
      return;
    }

    // ===== 获取公开头像链接 =====
    const {
      data: { publicUrl },
    } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    // ===== 更新 profile =====
    const { error: profileError } =
      await supabase
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
    const file = e.target.files?.[0];

    if (!file || !user) return;

    setBannerUploading(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}.${fileExt}`;

    const { error: uploadError } =
        await supabase.storage
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

        alert("Banner 上传成功 🔥");
        window.location.reload();
        }

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
            className={`w-[150px] h-[52px] rounded-2xl border text-sm font-bold transition-all duration-300
                ${
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

  return (
    <main className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-4xl font-bold">
          我的资料 👤
        </h1>

        <p className="text-zinc-500 mt-2">
          上传头像与管理个人资料。
        </p>
      </div>

        {/* ===== 资料编辑区域 ===== */}
        <div className="space-y-5">
        <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/40">
            {/* ===== Banner 背景层 ===== */}
            <div className="absolute inset-0 flex items-center justify-center opacity-35">
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

            {/* ===== 背景遮罩，确保文字清楚 ===== */}
            <div className="absolute inset-0 bg-black/55" />

            {/* ===== 背景图水印 ===== */}
            <div
            className={`absolute bottom-4 left-8 z-[1] pointer-events-none select-none text-6xl font-black ${
                profile?.banner_url
                ? "text-white/20"
                : "text-white/5"
            }`}
            >
            背景图
            </div>

            {/* ===== 第一层内容 ===== */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8 p-8 pb-20">

            {/* ===== 左边：头像 + 上传 ===== */}
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

            {/* ===== 右边：资料表单 ===== */}
            <div className="space-y-5">
                <div className="space-y-2">
                <p className="text-sm text-zinc-300">
                    用户名称
                </p>

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
                <p className="text-sm text-zinc-300">
                    个人简介
                </p>

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

        {/* ===== 居民资料公开设置 ===== */}
            <div className="flex items-start justify-between gap-4">
            <div>
                <h3 className="text-lg font-bold">
                居民资料公开设置
                </h3>

                <p className="text-sm text-zinc-500 mt-1">
                选择其他居民能否看到你的成长资料。
                </p>
            </div>

            <p className="text-xs text-zinc-500 whitespace-nowrap pt-1">
                点击以 ：亮色 = 开启 / 暗色 = 关闭
            </p>
            </div>
            </div>
            <div className="grid grid-cols-2 gap-x-24 gap-y-4">
                {/* ===== 左边：成长资料 ===== */}
                <div className="space-y-4">
                    <PrivacySwitch
                    label="显示等级"
                    checked={showLevel}
                    onChange={() => {
                        setShowLevel(!showLevel);
                        setHasUnsavedChanges(true);
                    }}
                    />

                    <PrivacySwitch
                    label="显示经验值"
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
                </div>

                {/* ===== 右边：未来资料 ===== */}
                <div className="space-y-4">
                    <PrivacySwitch
                    label="显示奖章"
                    checked={false}
                    onChange={() => {}}
                    disabled
                    />

                    <PrivacySwitch
                    label="显示加入天数"
                    checked={showJoinedDays}
                    onChange={() => {
                        setShowJoinedDays(!showJoinedDays);
                        setHasUnsavedChanges(true);
                    }}
                    />

                    <PrivacySwitch
                    label="显示房间状态"
                    checked={false}
                    onChange={() => {}}
                    disabled
                    />
                </div>
                </div>

        {/* ===== 操作按钮区：移出大框外 ===== */}
        <div className="flex justify-end gap-3">
            <button
            onClick={saveProfile}
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-white text-black font-bold hover:opacity-80 transition"
            >
            {saving ? "保存中..." : "保存资料"}
            </button>
        </div>
    </main>
  );
}