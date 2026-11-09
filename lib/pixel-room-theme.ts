export type PixelRoomTime = "day" | "evening";
export const PIXEL_TIME_STORAGE_KEY = "ourlittleage:pixel-time";

// Existing room themes remain valid for the classic skin. Pixel rooms show
// legacy themes other than midnight in daylight until the resident chooses.
export function getPixelRoomTime(theme: string | null | undefined): PixelRoomTime {
  return theme === "midnight" ? "evening" : "day";
}

export function getStoredRoomTheme(time: PixelRoomTime) {
  return time === "evening" ? "midnight" : "mist";
}
