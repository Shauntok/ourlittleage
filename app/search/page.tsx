"use client";

import dynamic from "next/dynamic";
import { useRoomViewSkin } from "@/components/RoomViewSkinProvider";

const ModernSearchClient = dynamic(
  () => import("@/components/site-skins/modern-pixel/ModernSearchClient"),
  { ssr: false, loading: () => <main className="min-h-screen bg-[#eef0fa]" /> }
);

const ClassicSearchClient = dynamic(
  () => import("@/components/room-skins/classic/ClassicSearchClient"),
  { ssr: false, loading: () => <main className="min-h-screen bg-black" /> }
);

export default function SearchPage() {
  const { skin } = useRoomViewSkin();
  return skin === "classic" ? <ClassicSearchClient /> : <ModernSearchClient />;
}
