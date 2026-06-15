import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import UserRoomClient from "@/components/UserRoomClient";

export const dynamic = "force-dynamic";

function getResidentTitle(level: number) {
  if (level >= 50) return "小时代长老";
  if (level >= 20) return "资深居民";
  if (level >= 10) return "深夜居民";
  if (level >= 5) return "常驻居民";
  return "新住民";
}

function getJoinedDays(joinedAt: string) {
  const joinedTime = new Date(joinedAt).getTime();
  const diffDays = Math.floor(
    (Date.now() - joinedTime) / (1000 * 60 * 60 * 24)
  );

  return Math.max(diffDays, 0);
}

function getLevelProgress(exp: number) {
  const total = Number(exp || 0);

  if (total >= 10) {
    return {
      level: 5,
      current: 0,
      percent: 100,
      text: "Lv5 已满阶",
    };
  }

  if (total >= 6) {
    return {
      level: 4,
      current: Number((total - 6).toFixed(2)),
      percent: ((total - 6) / 4) * 100,
      text: `Lv4 · ${Number(total - 6).toFixed(2)} / 4.00 光`,
    };
  }

  if (total >= 3) {
    return {
      level: 3,
      current: Number((total - 3).toFixed(2)),
      percent: ((total - 3) / 3) * 100,
      text: `Lv3 · ${Number(total - 3).toFixed(2)} / 3.00 光`,
    };
  }

  if (total >= 1) {
    return {
      level: 2,
      current: Number((total - 1).toFixed(2)),
      percent: ((total - 1) / 2) * 100,
      text: `Lv2 · ${Number(total - 1).toFixed(2)} / 2.00 光`,
    };
  }

  return {
    level: 1,
    current: Number(total.toFixed(2)),
    percent: total * 100,
    text: `Lv1 · ${total.toFixed(2)} / 1.00 光`,
  };
}

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function UserPage({ params, searchParams }: Props) {
  const { username } = await params;
  const { tab } = await searchParams;

  const activeTab = tab === "diary" || tab === "article" ? tab : "all";
  const decodedUsername = decodeURIComponent(username);

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", decodedUsername)
    .single();

  if (!profile) notFound();

  const residentTitle = getResidentTitle(profile.level || 1);
  const levelProgress = getLevelProgress(Number(profile.exp || 0));
  const joinedDays = getJoinedDays(profile.joined_at || profile.created_at);

  const isStatusExpired =
    !profile.status_expires_at ||
    new Date(profile.status_expires_at).getTime() < Date.now();

  const { data: userBadges } = await supabase
    .from("user_badges")
    .select(
      `
      id,
      created_at,
      badges (
        id,
        name,
        color,
        description
      )
    `
    )
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const visibleBadges = profile.show_badges === false ? [] : userBadges || [];

  const { data: posts } = await supabase
    .from("posts")
    .select(
      "id,title,slug,content,type,published_at,created_at,author_id,status,visibility"
    )
    .eq("author_id", profile.id)
    .eq("status", "published")
    .eq("visibility", "public")
    .order("published_at", { ascending: false })
    .limit(30);

  const publicPosts = posts || [];
  const publicDiaries = publicPosts.filter((post) => post.type === "diary");
  const publicArticles = publicPosts.filter((post) => post.type === "article");

  const postIds = publicPosts.map((post) => post.id);

  const { data: likesData } =
    postIds.length > 0
      ? await supabase
          .from("post_likes")
          .select("post_id")
          .in("post_id", postIds)
          .eq("is_active", true)
      : { data: [] as any[] };

  const { data: commentsData } =
    postIds.length > 0
      ? await supabase
          .from("comments")
          .select("post_id")
          .in("post_id", postIds)
          .eq("is_deleted", false)
          .eq("is_hidden", false)
      : { data: [] as any[] };

  const likeCountMap = new Map<number, number>();
  const commentCountMap = new Map<number, number>();

  (likesData || []).forEach((like: any) => {
    likeCountMap.set(like.post_id, (likeCountMap.get(like.post_id) || 0) + 1);
  });

  (commentsData || []).forEach((comment: any) => {
    commentCountMap.set(
      comment.post_id,
      (commentCountMap.get(comment.post_id) || 0) + 1
    );
  });

  const roomTheme =
    profile.theme === "ocean"
      ? "from-blue-950 via-slate-950 to-black"
      : profile.theme === "forest"
      ? "from-emerald-950 via-green-950 to-black"
      : profile.theme === "sunset"
      ? "from-orange-950 via-amber-950 to-black"
      : profile.theme === "mist"
      ? "from-zinc-700 via-zinc-800 to-black"
      : "from-black via-zinc-950 to-black";

  return (
    <UserRoomClient
      profile={profile}
      activeTab={activeTab}
      residentTitle={residentTitle}
      levelProgress={levelProgress}
      joinedDays={joinedDays}
      isStatusExpired={isStatusExpired}
      visibleBadges={visibleBadges}
      publicPosts={publicPosts}
      publicDiaries={publicDiaries}
      publicArticles={publicArticles}
      likeCountMapData={Array.from(likeCountMap.entries())}
      commentCountMapData={Array.from(commentCountMap.entries())}
      roomTheme={roomTheme}
    />
  );
}