"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const BIO_LIMIT = 300;

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
      className={`rounded-2xl border px-5 py-4 text-left text-sm transition-all duration-300 ${
        disabled
          ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-white/15"
          : checked
          ? "border-white/25 bg-white/[0.09] text-white shadow-[0_0_35px_rgba(255,255,255,0.06)]"
          : "border-white/10 bg-white/[0.035] text-white/45 hover:border-white/20 hover:text-white/70"
      }`}
    >
      {label}
    </button>
  );
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.src = url;
  });
}

async function getCroppedImage(
  imageSrc: string,
  cropPixels: Area
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("无法处理图片。");
  }

  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("裁剪图片失败。"));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      0.9
    );
  });
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

  const [bannerPreviewUrl, setBannerPreviewUrl] = useState("");
  const [cropOpen, setCropOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] =
    useState<Area | null>(null);

  useEffect(() => {
    async function getProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/home");
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

    if (!username.trim()) {
      alert("用户名称不能为空。");
      return;
    }

    if (bio.length > BIO_LIMIT) {
      alert(`个人简介最多 ${BIO_LIMIT} 字。`);
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        username: username.trim(),
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
      username: username.trim(),
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

  async function uploadAvatar(e: ChangeEvent<HTMLInputElement>) {
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

    const freshAvatarUrl = `${publicUrl}?v=${Date.now()}`;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        avatar_url: freshAvatarUrl,
      })
      .eq("id", user.id);

    setUploading(false);

    if (profileError) {
      alert(profileError.message);
      return;
    }

    setProfile((current: any) => ({
      ...current,
      avatar_url: freshAvatarUrl,
    }));

    alert("头像上传成功。");
  }

  function chooseBannerFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    const previewUrl = URL.createObjectURL(file);

    setBannerPreviewUrl(previewUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCropOpen(true);

    e.target.value = "";
  }

  function closeCropModal() {
    if (bannerPreviewUrl) {
      URL.revokeObjectURL(bannerPreviewUrl);
    }

    setBannerPreviewUrl("");
    setCropOpen(false);
    setCroppedAreaPixels(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  }

  async function confirmCropAndUpload() {
    if (!user || !bannerPreviewUrl || !croppedAreaPixels) return;

    setBannerUploading(true);

    try {
      const croppedBlob = await getCroppedImage(
        bannerPreviewUrl,
        croppedAreaPixels
      );

      const fileName = `${user.id}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("banners")
        .upload(fileName, croppedBlob, {
          contentType: "image/jpeg",
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

      const freshBannerUrl = `${publicUrl}?v=${Date.now()}`;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          banner_url: freshBannerUrl,
        })
        .eq("id", user.id);

      if (profileError) {
        alert(profileError.message);
        setBannerUploading(false);
        return;
      }

      setProfile((current: any) => ({
        ...current,
        banner_url: freshBannerUrl,
      }));

      closeCropModal();

      alert("横幅已更新。");
    } catch (error: any) {
      alert(error.message || "裁剪图片失败。");
    }

    setBannerUploading(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm tracking-[0.3em] text-white/35">
          正在打开你的房间...
        </p>
      </main>
    );
  }

  const previewUsername = username || "居民";
  const previewBio = bio || "这个房间暂时还很安静。";

  return (
    <div className="w-full overflow-hidden text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />
      <div className="pointer-events-none fixed left-1/2 top-1/3 -z-10 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="grid w-full max-w-full gap-10 xl:grid-cols-[minmax(760px,1fr)_380px] 2xl:grid-cols-[minmax(900px,1fr)_420px]">
        <section className="space-y-8">
          <div>
            <p className="text-xs tracking-[0.4em] text-white/25">
              ROOM SETTINGS
            </p>

            <h1 className="mt-6 text-5xl font-light tracking-tight">
              装修你的房间
            </h1>

            <p className="mt-6 max-w-xl text-sm leading-8 text-white/40">
              头像、横幅、简介和今日状态，都会成为别人进入你房间时看见的第一束光。
            </p>
          </div>

          <section className="overflow-hidden rounded-[2.4rem] border border-white/10 bg-white/[0.035] backdrop-blur-2xl">
            <div className="relative z-20 h-56 overflow-hidden border-b border-white/10 bg-black/40">
              {profile?.banner_url ? (
                <img
                  src={profile.banner_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-zinc-900 via-black to-zinc-950" />
              )}

              <div className="pointer-events-none absolute inset-0 bg-black/50" />

              <label className="absolute bottom-5 right-5 z-30 cursor-pointer rounded-full border border-white/15 bg-black/65 px-5 py-3 text-sm text-white/70 backdrop-blur-xl transition hover:border-white/30 hover:text-white">
                {bannerUploading ? "上传中..." : "更换横幅"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={chooseBannerFile}
                  className="hidden"
                />
              </label>
            </div>

            <div className="relative z-10 p-7">
              <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-start">
                <div className="space-y-4">
                  <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-black bg-zinc-900 shadow-[0_0_45px_rgba(255,255,255,0.12)]">
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

                  <label className="inline-flex cursor-pointer rounded-full border border-white/10 bg-black/60 px-5 py-3 text-sm text-white/65 transition hover:border-white/25 hover:text-white">
                    {uploading ? "上传中..." : "更换头像"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={uploadAvatar}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="pb-2">
                  <p className="text-xs tracking-[0.35em] text-white/25">
                    ROOM PROFILE
                  </p>

                  <h2 className="mt-4 text-3xl font-light">
                    🏠 房间资料
                  </h2>

                  <p className="mt-3 max-w-xl text-sm leading-7 text-white/35">
                    头像、横幅、名字和简介，会一起组成别人进入你房间时的第一印象。
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-5">
                <div className="space-y-2">
                  <p className="text-sm text-white/45">用户名称</p>

                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white outline-none transition focus:border-white/30"
                    placeholder="别人会怎么称呼你？"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-white/45">个人简介</p>

                    <p className="text-xs text-white/25">
                      {bio.length} / {BIO_LIMIT}
                    </p>
                  </div>

                  <textarea
                    rows={6}
                    value={bio}
                    maxLength={BIO_LIMIT}
                    onChange={(e) => {
                      setBio(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-4 leading-8 text-white outline-none transition focus:border-white/30"
                    placeholder="介绍一下自己，或者写一句这个房间的门牌。"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2.4rem] border border-white/10 bg-white/[0.035] p-7 backdrop-blur-2xl">
            <p className="text-xs tracking-[0.35em] text-white/25">
              TODAY STATUS
            </p>

            <h2 className="mt-4 text-2xl font-light">
              🌙 今日状态
            </h2>

            <p className="mt-3 text-sm leading-7 text-white/35">
              状态会在 18 小时后自动消失，像夜里慢慢暗下来的灯。
            </p>

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
                    <span className="text-sm text-white/80">
                      {statusMessage}
                    </span>
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
          </section>

          <section className="rounded-[2.4rem] border border-white/10 bg-white/[0.035] p-7 backdrop-blur-2xl">
            <p className="text-xs tracking-[0.35em] text-white/25">
              VISITOR PRIVACY
            </p>

            <h2 className="mt-4 text-2xl font-light">
              🔒 访客能看到
            </h2>

            <p className="mt-3 text-sm leading-7 text-white/35">
              这些设置会影响别人进入你的房间时，能看到哪些成长痕迹。
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
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
                label="显示居住天数"
                checked={showJoinedDays}
                onChange={() => {
                  setShowJoinedDays(!showJoinedDays);
                  setHasUnsavedChanges(true);
                }}
              />
            </div>
          </section>

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
        </section>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-[2.4rem] border border-white/10 bg-white/[0.035] backdrop-blur-2xl">
            <div className="relative h-48">
              {profile?.banner_url ? (
                <img
                  src={profile.banner_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-zinc-900 via-black to-zinc-950" />
              )}

              <div className="absolute inset-0 bg-black/50" />

              {(moodEmoji || statusMessage) && (
                <div className="absolute right-4 top-4 max-w-[220px] rounded-2xl border border-violet-500/20 bg-black/60 px-4 py-3 backdrop-blur-2xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{moodEmoji || "🌙"}</span>
                    {statusMessage && (
                      <span className="truncate text-xs text-white/75">
                        {statusMessage}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative px-6 pb-7">
              <div className="-mt-12 h-24 w-24 overflow-hidden rounded-full border-4 border-black bg-zinc-900 shadow-[0_0_45px_rgba(255,255,255,0.1)]">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl text-white/25">
                    👤
                  </div>
                )}
              </div>

              <p className="mt-5 text-xs tracking-[0.3em] text-white/25">
                ROOM PREVIEW
              </p>

              <h3 className="mt-3 text-3xl font-light">
                {previewUsername}
              </h3>

              <p className="mt-4 text-sm leading-7 text-white/45">
                {previewBio}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {showLevel && (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/40">
                    Lv.{profile?.level || 1}
                  </span>
                )}

                {showExp && (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/40">
                    经验 {profile?.exp || 0}
                  </span>
                )}

                {showTrustScore && (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/40">
                    信任 {profile?.trust_score || 0}
                  </span>
                )}

                {showJoinedDays && (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/40">
                    居住天数
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 text-sm leading-7 text-white/35 backdrop-blur-2xl">
            <p className="text-xs tracking-[0.3em] text-white/25">
              TIP
            </p>

            <p className="mt-4">
              以后这里可以继续扩展：房间主题、背景音乐、称号、访客记录和收藏柜。
            </p>
          </div>
        </aside>
      </div>

      {cropOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-xl">
          <div className="w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 shadow-2xl">
            <div className="border-b border-white/10 px-6 py-5">
              <p className="text-xs tracking-[0.35em] text-white/25">
                CROP BANNER
              </p>

              <h2 className="mt-3 text-2xl font-light">
                调整横幅显示范围
              </h2>
            </div>

            <div className="relative h-[420px] bg-black">
              <Cropper
                image={bannerPreviewUrl}
                crop={crop}
                zoom={zoom}
                aspect={16 / 5}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, croppedPixels) =>
                  setCroppedAreaPixels(croppedPixels)
                }
              />
            </div>

            <div className="space-y-5 border-t border-white/10 px-6 py-5">
              <div>
                <p className="mb-3 text-sm text-white/40">
                  缩放
                </p>

                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCropModal}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm text-white/60 transition hover:border-white/20 hover:text-white"
                >
                  取消
                </button>

                <button
                  type="button"
                  onClick={confirmCropAndUpload}
                  disabled={bannerUploading}
                  className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-40"
                >
                  {bannerUploading ? "上传中..." : "确认使用"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}