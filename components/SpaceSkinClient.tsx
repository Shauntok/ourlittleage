"use client";

import dynamic from "next/dynamic";
import { useRoomViewSkin } from "@/components/RoomViewSkinProvider";
import type { SpacePost } from "@/components/SpaceClient";

const ModernSpaceClient = dynamic(
  () => import("@/components/SpaceClient"),
  { ssr: false }
);

const ClassicSpaceClient = dynamic(
  () => import("@/components/room-skins/classic/ClassicSpaceClient"),
  { ssr: false }
);

type Props = {
  activeFeed: string;
  latestDiaries: SpacePost[];
  latestArticles: SpacePost[];
  hotDiaries: SpacePost[];
  hotArticles: SpacePost[];
};

export default function SpaceSkinClient(props: Props) {
  const { skin } = useRoomViewSkin();
  return skin === "classic" ? (
    <ClassicSpaceClient {...props} />
  ) : (
    <ModernSpaceClient {...props} />
  );
}
