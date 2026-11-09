"use client";

import dynamic from "next/dynamic";
import { useRoomViewSkin } from "@/components/RoomViewSkinProvider";

const ModernArticlesClient = dynamic(
  () => import("@/components/site-skins/modern-pixel/ModernArticlesClient"),
  {
    ssr: false,
    loading: () => <main className="min-h-screen bg-[#eef0fa] px-5 py-12 text-[#68738f]">正在打开你的文章...</main>,
  }
);

const ClassicArticlesClient = dynamic(
  () => import("@/components/room-skins/classic/ClassicArticlesClient"),
  {
    ssr: false,
    loading: () => <main className="min-h-screen bg-black px-5 py-12 text-white/40">正在打开你的文章房间...</main>,
  }
);

export default function ArticlesPage() {
  const { skin } = useRoomViewSkin();
  return skin === "classic" ? <ClassicArticlesClient /> : <ModernArticlesClient />;
}
