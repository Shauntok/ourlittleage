export const ROOM_VIEW_SKINS = ["modern_pixel", "classic"] as const;

export type RoomViewSkin = (typeof ROOM_VIEW_SKINS)[number];

export const DEFAULT_ROOM_VIEW_SKIN: RoomViewSkin = "classic";
export const ROOM_VIEW_SKIN_STORAGE_KEY = "ourlittleage:room-view-skin";

export function getRoomViewSkin(value: unknown): RoomViewSkin {
  return value === "classic" || value === "modern_pixel"
    ? value
    : DEFAULT_ROOM_VIEW_SKIN;
}
