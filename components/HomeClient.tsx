"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getHomeAtmosphere } from "@/lib/getHomeAtmosphere";
import FloatingParticles from "@/components/FloatingParticles";
import PageTransition from "@/components/PageTransition";
import MouseGlow from "@/components/MouseGlow";
import RoomStatusButton from "@/components/RoomStatusButton";

type Props = {
  currentUserId: string;
  displayName: string;
  onlineCount: number;
  onlineResidents: any[];
  latestDiary: string;
  latestArticle: string;
  latestDiaryId: number | null;
  latestArticleSlug: string | null;
  nightBroadcast: string;
  announcement: any;
  unreadCount: number;
  initialMoodEmoji: string;
  initialStatusMessage: string;
};

export default function HomeClient(props: Props) {
  const router = useRouter();
  const atmosphere = getHomeAtmosphere();

  const [moodEmoji, setMoodEmoji] = useState(props.initialMoodEmoji);
  const [statusMessage, setStatusMessage] = useState(
    props.initialStatusMessage
  );

  const profileHref =
    props.displayName && props.displayName !== "居民"
      ? `/u/${encodeURIComponent(props.displayName)}`
      : "/settings/profile";

  const quickCards = [
    {
      icon: "📬",
      title: "小时代信箱",
      desc:
        props.unreadCount > 0
          ? `你有 ${props.unreadCount} 封未读来信。`
          : "今晚暂无新来信。",
      href: "/notifications",
    },
    {
      icon: "🌙",
      title: "深夜广场",
      desc: "看看别人留下的光。",
      href: "/space",
    },
    {
      icon: "🏠",
      title: "我的房间",
      desc: "回到自己的角落。",
      href: profileHref,
    },
  ];

  const lifeCards = [
    {
      label: "深夜灯火",
      title: `🌙 ${props.onlineCount} 位居民还醒着`,
      desc: "有人正在房间里，慢慢留下今天。",
      href: "/space",
    },
    {
      label: "最新故事",
      title: "📝 " + props.latestArticle,
      desc: "有人刚刚留下了一篇新的故事。",
      href: props.latestArticleSlug
        ? `/articles/${props.latestArticleSlug}`
        : "/space/articles",
    },
    {
      label: "今晚动态",
      title: "🌙 " + props.latestDiary,
      desc: "有人刚刚留下了新的日记。",
      href: props.latestDiaryId ? `/diary/${props.latestDiaryId}` : "/space/diaries",
    },
  ];

  return (
    <PageTransition>
      <main className="relative min-h-screen overflow-x-hidden bg-black text-white">
        <MouseGlow />
        <FloatingParticles />

        <div className="fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />

        <div
          className={`fixed left-1/2 top-1/3 -z-10 h-[520px] w-[520px] -translate-x-1/2 rounded-full ${atmosphere.glow} blur-3xl`}
        />

        {/* 这里先保留你原本的 JSX 主体 */}
        {/* 下一步我可以直接帮你把完整 UI 填进去 */}

      </main>
    </PageTransition>
  );
}