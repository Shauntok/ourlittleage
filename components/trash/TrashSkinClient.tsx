"use client";

import dynamic from "next/dynamic";

import { useRoomViewSkin } from "@/components/RoomViewSkinProvider";
import type { TrashPost } from "@/lib/server/postTrash";

export type TrashSkinProps = {
  items: TrashPost[];
  serverNow: string;
  loadError: boolean;
};

const ClassicTrashView = dynamic(() => import("./ClassicTrashView"), { ssr: false });
const ModernTrashView = dynamic(
  () => import("@/components/site-skins/modern-pixel/ModernTrashView"),
  { ssr: false }
);

export default function TrashSkinClient(props: TrashSkinProps) {
  const { skin } = useRoomViewSkin();
  return skin === "classic" ? <ClassicTrashView {...props} /> : <ModernTrashView {...props} />;
}
