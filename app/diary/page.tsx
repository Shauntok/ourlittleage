"use client";

import dynamic from "next/dynamic";
import { useRoomViewSkin } from "@/components/RoomViewSkinProvider";

const ModernDiaryClient = dynamic(
  () => import("@/components/site-skins/modern-pixel/ModernDiaryClient"),
  {
    ssr: false,
    loading: () => <main className="min-h-screen bg-[#eef0fa] px-5 py-12 text-[#68738f]">正在翻找那些日子...</main>,
  }
);

const ClassicDiaryClient = dynamic(
  () => import("@/components/room-skins/classic/ClassicDiaryClient"),
  {
    ssr: false,
    loading: () => <main className="min-h-screen bg-black px-5 py-12 text-white/40">正在翻找那些日子...</main>,
  }
);

export default function DiaryPage() {
  const { skin } = useRoomViewSkin();
  return skin === "classic" ? <ClassicDiaryClient /> : <ModernDiaryClient />;
}
