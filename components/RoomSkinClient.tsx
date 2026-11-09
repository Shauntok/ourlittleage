"use client";

import dynamic from "next/dynamic";
import type { RoomViewSkin } from "@/lib/room-view-skin";

const ModernPixelRoom = dynamic(
  () => import("@/components/UserRoomClient"),
  { ssr: false }
);
const ClassicRoom = dynamic(
  () => import("@/components/room-skins/classic/ClassicUserRoomClient"),
  { ssr: false }
);

export default function RoomSkinClient({
  skin,
  ...roomProps
}: {
  skin: RoomViewSkin;
  [key: string]: any;
}) {
  if (skin === "classic") return <ClassicRoom {...roomProps} />;
  return <ModernPixelRoom {...roomProps} roomViewSkin="modern_pixel" />;
}
