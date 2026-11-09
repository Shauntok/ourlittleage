"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
} from "react";
import {
  DEFAULT_ROOM_VIEW_SKIN,
  getRoomViewSkin,
  ROOM_VIEW_SKIN_STORAGE_KEY,
  type RoomViewSkin,
} from "@/lib/room-view-skin";
import { PIXEL_TIME_STORAGE_KEY, type PixelRoomTime } from "@/lib/pixel-room-theme";

type RoomViewSkinContextValue = {
  skin: RoomViewSkin;
  setSkin: (skin: RoomViewSkin) => void;
  pixelTime: PixelRoomTime;
  setPixelTime: (time: PixelRoomTime) => void;
  clearSkinPreference: () => void;
};

const RoomViewSkinContext = createContext<RoomViewSkinContextValue | null>(null);

export default function RoomViewSkinProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [skin, setSkinState] = useState<RoomViewSkin>(DEFAULT_ROOM_VIEW_SKIN);
  const [pixelTime, setPixelTimeState] = useState<PixelRoomTime>("day");

  const setPixelTime = useCallback((time: PixelRoomTime) => {
    const normalized = time === "evening" ? "evening" : "day";
    try {
      window.localStorage.setItem(PIXEL_TIME_STORAGE_KEY, normalized);
    } catch {
      // Keep the chosen time in memory when storage is unavailable.
    }
    document.body.dataset.pixelTime = normalized;
    setPixelTimeState(normalized);
  }, []);

  const setSkin = useCallback((nextSkin: RoomViewSkin) => {
    const normalized = getRoomViewSkin(nextSkin);
    try {
      window.localStorage.setItem(ROOM_VIEW_SKIN_STORAGE_KEY, normalized);
    } catch {
      // The in-memory preference still applies when browser storage is blocked.
    }
    document.body.dataset.roomViewSkin = normalized;
    setSkinState(normalized);
  }, []);

  const clearSkinPreference = useCallback(() => {
    try {
      window.localStorage.removeItem(ROOM_VIEW_SKIN_STORAGE_KEY);
    } catch {
      // Clearing the active preference must not depend on browser storage.
    }
    document.body.dataset.roomViewSkin = DEFAULT_ROOM_VIEW_SKIN;
    document.body.dataset.pixelTime = "day";
    setSkinState(DEFAULT_ROOM_VIEW_SKIN);
    setPixelTimeState("day");
  }, []);

  useLayoutEffect(() => {
    let savedSkin = DEFAULT_ROOM_VIEW_SKIN;
    try {
      savedSkin = getRoomViewSkin(
        window.localStorage.getItem(ROOM_VIEW_SKIN_STORAGE_KEY)
      );
    } catch {
      // The default skin is used when browser storage is blocked.
    }
    setSkinState(savedSkin);
    document.body.dataset.roomViewSkin = savedSkin;
    let savedTime: PixelRoomTime = "day";
    try {
      savedTime = window.localStorage.getItem(PIXEL_TIME_STORAGE_KEY) === "evening" ? "evening" : "day";
    } catch {
      // Default to daylight when storage is unavailable.
    }
    setPixelTimeState(savedTime);
    document.body.dataset.pixelTime = savedTime;
  }, []);

  useLayoutEffect(() => {
    document.body.dataset.roomViewSkin = skin;
  }, [skin]);

  useLayoutEffect(() => {
    document.body.dataset.pixelTime = pixelTime;
  }, [pixelTime]);

  return (
    <RoomViewSkinContext.Provider value={{ skin, setSkin, pixelTime, setPixelTime, clearSkinPreference }}>
      {children}
    </RoomViewSkinContext.Provider>
  );
}

export function useRoomViewSkin() {
  const context = useContext(RoomViewSkinContext);
  if (!context) {
    throw new Error("useRoomViewSkin must be used within RoomViewSkinProvider");
  }
  return context;
}
