"use client";

import dynamic from "next/dynamic";
import FeedbackForm from "@/components/FeedbackForm";
import { useRoomViewSkin } from "@/components/RoomViewSkinProvider";

const ModernFeedbackClient = dynamic(
  () => import("@/components/site-skins/modern-pixel/ModernFeedbackClient"),
  { ssr: false, loading: () => <main className="min-h-screen bg-[#eef0fa]" /> }
);

export default function FeedbackPage() {
  const { skin } = useRoomViewSkin();
  return skin === "classic" ? <FeedbackForm /> : <ModernFeedbackClient />;
}
