"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useRoomViewSkin } from "@/components/RoomViewSkinProvider";
import ModernSkinSettings from "@/components/site-skins/modern-pixel/ModernSkinSettings";
import { getPixelRoomTime, getStoredRoomTheme, type PixelRoomTime } from "@/lib/pixel-room-theme";
import {
  DEFAULT_ROOM_VIEW_SKIN,
  getRoomViewSkin,
  ROOM_VIEW_SKIN_STORAGE_KEY,
  type RoomViewSkin,
} from "@/lib/room-view-skin";

type SaveState = "idle" | "saving" | "saved" | "local-only" | "error";

export default function SkinSettingsPage() {
  const router = useRouter();
  const { setSkin: setViewerSkin, setPixelTime } = useRoomViewSkin();
  const [skin, setSkin] = useState<RoomViewSkin>(DEFAULT_ROOM_VIEW_SKIN);
  const [draftSkin, setDraftSkin] = useState<RoomViewSkin>(DEFAULT_ROOM_VIEW_SKIN);
  const [roomTime, setRoomTime] = useState<PixelRoomTime>("day");
  const [draftTime, setDraftTime] = useState<PixelRoomTime>("day");
  const [timeTouched, setTimeTouched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    let active = true;

    async function loadPreference() {
      const localPreference = getRoomViewSkin(
        window.localStorage.getItem(ROOM_VIEW_SKIN_STORAGE_KEY)
      );
      setSkin(localPreference);
      setDraftSkin(localPreference);
      setViewerSkin(localPreference);

      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.replace("/");
        return;
      }

      const [skinResult, themeResult] = await Promise.all([
        supabase.from("profiles").select("room_view_skin").eq("id", authData.user.id).maybeSingle(),
        supabase.from("profiles").select("theme").eq("id", authData.user.id).maybeSingle(),
      ]);

      if (!active) return;

      if (!skinResult.error && skinResult.data?.room_view_skin) {
        const savedSkin = getRoomViewSkin(skinResult.data.room_view_skin);
        setSkin(savedSkin);
        setDraftSkin(savedSkin);
        setViewerSkin(savedSkin);
        setSaveState("saved");
      } else if (skinResult.error) {
        setSaveState("local-only");
      }
      if (!themeResult.error && themeResult.data) {
        const savedTime = getPixelRoomTime(themeResult.data.theme);
        setRoomTime(savedTime);
        setDraftTime(savedTime);
        setPixelTime(savedTime);
      }

      setLoading(false);
    }

    void loadPreference();
    return () => {
      active = false;
    };
  }, [router, setViewerSkin, setPixelTime]);

  async function savePreference(nextSkin: RoomViewSkin, nextTime: PixelRoomTime, saveTime: boolean) {
    setSkin(nextSkin);
    setViewerSkin(nextSkin);
    setSaveState("saving");

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setSaveState("local-only");
      return;
    }

    let themeError = false;
    if (nextSkin === "modern_pixel" && saveTime) {
      const { error } = await supabase
        .from("profiles")
        .update({ theme: getStoredRoomTheme(nextTime) })
        .eq("id", authData.user.id);
      themeError = Boolean(error);
      if (!themeError) {
        setRoomTime(nextTime);
        setPixelTime(nextTime);
        setTimeTouched(false);
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({ room_view_skin: nextSkin })
      .eq("id", authData.user.id);

    setSaveState(themeError ? "error" : error ? "local-only" : "saved");
  }

  function chooseSkin(nextSkin: RoomViewSkin) {
    setDraftSkin(nextSkin);
    setDraftTime(roomTime);
    setTimeTouched(false);
    void savePreference(nextSkin, roomTime, false);
  }

  if (loading) {
    return <p className="py-10 text-sm opacity-60">正在读取皮肤设置...</p>;
  }

  if (skin === "modern_pixel") {
    return <ModernSkinSettings
      selectedSkin={draftSkin}
      selectedTime={draftTime}
      saveState={saveState}
      onSelectSkin={(nextSkin) => { setDraftSkin(nextSkin); setSaveState("idle"); }}
      onSelectTime={(nextTime) => { setDraftSkin("modern_pixel"); setDraftTime(nextTime); setTimeTouched(true); setSaveState("idle"); }}
      onSave={() => void savePreference(draftSkin, draftTime, timeTouched)}
    />;
  }

  return (
    <div className="max-w-3xl text-white">
      <p className="text-xs text-white/35">ROOM APPEARANCE</p>
      <h1 className="mt-3 text-3xl font-semibold">皮肤</h1>
      <p className="mt-3 max-w-xl text-sm leading-7 text-white/55">
        这里选择的是你看到的界面风格。目前会应用到导航、广场、日记、文章和你访问的所有居民房间，不会改变房间主人的设置。
      </p>

      <fieldset className="mt-8 grid gap-4 sm:grid-cols-2">
        <legend className="sr-only">选择房间皮肤</legend>
        {([
          { value: "modern_pixel", label: "现代像素", description: "晴天街区与细致的像素边框" },
          { value: "classic", label: "旧版", description: "柔和圆角与原有的深夜玻璃质感" },
        ] as const).map((option) => (
          <label
            key={option.value}
            className={`block cursor-pointer border p-4 transition ${
              skin === option.value
                ? "border-violet-200/70 bg-violet-200/[0.08]"
                : "border-white/10 bg-white/[0.025] hover:border-white/25"
            }`}
          >
            <input
              type="radio"
              name="room-view-skin"
              value={option.value}
              checked={skin === option.value}
              onChange={() => chooseSkin(option.value)}
              className="sr-only"
            />
            <span className="block text-base font-medium">{option.label}</span>
            <span className="mt-2 block text-sm text-white/50">
              {option.description}
            </span>
            <span className="mt-4 block h-16 border border-white/10 bg-black/40 p-2">
              <span
                className={`block h-full border bg-zinc-950/90 ${
                  option.value === "modern_pixel"
                    ? ""
                    : "rounded-xl"
                }`}
                style={
                  option.value === "modern_pixel"
                    ? {
                        clipPath:
                          "polygon(0 5px, 5px 5px, 5px 0, calc(100% - 5px) 0, calc(100% - 5px) 5px, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 5px calc(100% - 5px), 0 calc(100% - 5px))",
                      }
                    : undefined
                }
              />
            </span>
          </label>
        ))}
      </fieldset>

      <p aria-live="polite" className="mt-5 min-h-6 text-sm text-white/45">
        {saveState === "saving" && "正在保存..."}
        {saveState === "saved" && "已保存，会应用到导航、广场和你浏览的房间。"}
        {saveState === "local-only" && "当前数据库尚未启用皮肤同步；选择暂存在这台设备。"}
        {saveState === "error" && "保存失败，请稍后重试。"}
      </p>
    </div>
  );
}
