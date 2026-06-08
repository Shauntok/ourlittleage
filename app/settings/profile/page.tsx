"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const BIO_LIMIT = 300;

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

async function getCroppedImage(imageSrc: string, crop: Area) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("无法处理图片。");

  canvas.width = crop.width;
  canvas.height = crop.height;

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("图片裁剪失败。"));
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
  const [theme, setTheme] = useState("midnight");

  const [moodEmoji, setMoodEmoji] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
        router.push("/");
        return;
      }

      setUser(user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);
      setUsername(profileData?.username || "");
      setBio(profileData?.bio || "");
      setTheme(profileData?.theme || "midnight");
      setMoodEmoji(profileData?.mood_emoji || "");
      setStatusMessage(profileData?.status_message || "");

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

    const cleanUsername = username.trim();
    const cleanBio = bio.trim();
    const usernameRegex = /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/;

    if (!cleanUsername) {
      alert("居民名字不能为空。");
      return;
    }

    if (cleanUsername.length < 3) {
      alert("居民名字至少需要 3 个字符。");
      return;
    }

    if (cleanUsername.length > 20) {
      alert("居民名字不能超过 20 个字符。");
      return;
    }

    if (!usernameRegex.test(cleanUsername)) {
      alert("居民名字只能使用中文、英文、数字和底线。");
      return;
    }

    if (cleanBio.length > BIO_LIMIT) {
      alert(`个人简介最多 ${BIO_LIMIT} 字。`);
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        username: cleanUsername,
        bio: cleanBio,
        theme,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    setProfile((current: any) => ({
      ...current,
      username: cleanUsername,
      bio: cleanBio,
      theme,
    }));

    setHasUnsavedChanges(false);
    alert("房间资料已更新。");
  }

  async function uploadAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file || !user) return;

    setUploading(true);

    const cleanName = file.name.replace(/\s+/g, "-");
    const fileName = `${user.id}-${Date.now()}-${cleanName}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, {
        upsert: true,
      });

    if (error) {
      setUploading(false);
      alert(error.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
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

    alert("头像已更新。");
  }

  function chooseBannerFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("请上传图片文件。");
      e.target.value = "";
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert("图片不能超过 8MB。");
      e.target.value = "";
      return;
    }

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
  }

  async function confirmCropAndUpload() {
    if (!user || !bannerPreviewUrl || !croppedAreaPixels) return;

    setBannerUploading(true);

    try {
      const croppedBlob = await getCroppedImage(
        bannerPreviewUrl,
        croppedAreaPixels
      );

      const fileName = `${user.id}/banner.jpg`;

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
          updated_at: new Date().toISOString(),
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
        mood_emoji: moodEmoji || null,
        status_message: statusMessage.trim() || null,
        status_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setStatusSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    setProfile((current: any) => ({
      ...current,
      mood_emoji: moodEmoji || null,
      status_message: statusMessage.trim() || null,
      status_expires_at: expiresAt,
    }));

    alert("今日状态已设置。");
  }

  async function clearMoodStatus() {
    if (!user) return;

    const confirmed = confirm("确定清除今日状态吗？");
    if (!confirmed) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        mood_emoji: null,
        status_message: null,
        status_expires_at: null,
        updated_at: new Date().toISOString(),
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

    alert("今日状态已清除。");
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
  const previewTheme =
    theme === "ocean"
      ? "from-blue-950 via-slate-950 to-black"
      : theme === "forest"
      ? "from-emerald-950 via-green-950 to-black"
      : theme === "sunset"
      ? "from-orange-950 via-amber-950 to-black"
      : theme === "mist"
      ? "from-zinc-700 via-zinc-800 to-black"
      : "from-black via-zinc-950 to-black";

  return (
    <div className="w-full overflow-hidden text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />
      <div className="pointer-events-none fixed left-1/2 top-1/3 -z-10 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="grid w-full max-w-full gap-10 xl:grid-cols-[minmax(720px,1fr)_380px] 2xl:grid-cols-[minmax(900px,1fr)_420px]">
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
                  <p className="text-sm text-white/45">居民名字</p>

                  <input
                    type="text"
                    value={username}
                    maxLength={20}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-white outline-none transition focus:border-white/30"
                    placeholder="给你的房间留一个名字"
                  />

                  <p className="text-xs text-white/25">
                    3-20 个字符，可使用中文、英文、数字和底线。
                  </p>
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
                    className="w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-4 leading-8 text-white outline-none transition whitespace-pre-wrap break-words [overflow-wrap:anywhere] focus:border-white/30"
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
              className="mt-5 w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-5 py-4 leading-7 outline-none transition whitespace-pre-wrap break-words [overflow-wrap:anywhere] focus:border-white/30"
            />

            {(moodEmoji || statusMessage) && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-white/70">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{moodEmoji || "🌙"}</span>

                  {statusMessage && (
                    <span className="break-words text-sm text-white/80 [overflow-wrap:anywhere]">
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
                {statusSaving ? "保存中..." : "设置今日状态"}
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
              ROOM THEME
            </p>

            <h2 className="mt-4 text-2xl font-light">
              🎨 房间主题
            </h2>

            <p className="mt-3 text-sm leading-7 text-white/35">
              选择别人进入你房间时看见的氛围。
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { key: "midnight", name: "🌙 深夜黑" },
                { key: "ocean", name: "🌊 深海蓝" },
                { key: "forest", name: "🌲 森林绿" },
                { key: "sunset", name: "🌇 黄昏橙" },
                { key: "mist", name: "☁️ 雾白" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setTheme(item.key);
                    setHasUnsavedChanges(true);
                  }}
                  className={`rounded-2xl border p-4 text-left transition ${
                    theme === item.key
                      ? "border-white bg-white text-black"
                      : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25"
                  }`}
                >
                  {item.name}
                </button>
              ))}
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
          <div
            className={`overflow-hidden rounded-[2.4rem] border border-white/10 bg-gradient-to-b ${previewTheme} backdrop-blur-2xl`}
          >
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

            <div className="relative px-7 pb-8">
              <div className="-mt-14 h-28 w-28 overflow-hidden rounded-full border-4 border-black bg-zinc-900 shadow-[0_0_45px_rgba(255,255,255,0.12)]">
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

              <p className="mt-6 text-xs tracking-[0.3em] text-white/25">
                ROOM PREVIEW
              </p>

              <h2 className="safe-text mt-4 text-3xl font-light">
                {previewUsername}
              </h2>

              <p className="safe-pre mt-4 text-sm leading-7 text-white/45">
                {previewBio}
              </p>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs tracking-[0.25em] text-white/25">
                  访客看到的你
                </p>

                <p className="mt-3 text-sm leading-7 text-white/40">
                  隐私显示项目已经搬到「隐私设置」。这里专心预览你的房间外观。
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {cropOpen && bannerPreviewUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-6 backdrop-blur-xl">
          <div className="w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950">
            <div className="border-b border-white/10 p-5">
              <h2 className="text-2xl font-light">
                裁剪房间横幅
              </h2>

              <p className="mt-2 text-sm text-white/35">
                拖动图片，选择别人进入你房间时看到的那一幕。
              </p>
            </div>

            <div className="relative h-[420px] bg-black">
              <Cropper
                image={bannerPreviewUrl}
                crop={crop}
                zoom={zoom}
                aspect={3 / 1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, croppedPixels) =>
                  setCroppedAreaPixels(croppedPixels)
                }
              />
            </div>

            <div className="space-y-4 border-t border-white/10 p-5">
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCropModal}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-7 py-3 text-sm text-white/65 transition hover:border-white/20 hover:text-white"
                >
                  取消
                </button>

                <button
                  type="button"
                  onClick={confirmCropAndUpload}
                  disabled={bannerUploading}
                  className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
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