"use client";

import dynamic from "next/dynamic";
import AnnouncementsView from "@/components/AnnouncementsView";
import { useRoomViewSkin } from "@/components/RoomViewSkinProvider";

const ModernAnnouncementsClient = dynamic(
  () => import("@/components/site-skins/modern-pixel/ModernAnnouncementsClient"),
  { ssr: false, loading: () => <main className="min-h-screen bg-[#eef0fa]" /> }
);

export default function AnnouncementsPage() {
  const { skin } = useRoomViewSkin();
  return skin === "classic" ? <AnnouncementsView /> : <ModernAnnouncementsClient />;
}
