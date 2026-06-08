import { supabase } from "@/lib/supabase";

export async function awardBadge(
  userId: string,
  badgeName: string
) {
  const { data: badge } = await supabase
    .from("badges")
    .select("id")
    .eq("name", badgeName)
    .maybeSingle();

  if (!badge) return false;

  const { data: existing } = await supabase
    .from("user_badges")
    .select("id")
    .eq("user_id", userId)
    .eq("badge_id", badge.id)
    .maybeSingle();

  if (existing) {
    return false;
  }

  const { error } = await supabase
    .from("user_badges")
    .insert([
      {
        user_id: userId,
        badge_id: badge.id,
      },
    ]);

  if (error) {
    console.error(error);
    return false;
  }

  const { error: notificationError } = await supabase
    .from("notifications")
    .insert([
        {
        user_id: userId,
        type: "badge",
        title: "🎖️ 获得新徽章",
        content: `你获得了徽章「${badgeName}」`,
        },
    ]);

    if (notificationError) {
    console.error(notificationError);
    }

    if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("notifications-updated"));

    setTimeout(() => {
        window.dispatchEvent(new Event("notifications-updated"));
    }, 300);
    }

    return true;
}

export async function checkFirstArticleBadge(
  userId: string
) {
  const { count } = await supabase
    .from("posts")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("author_id", userId)
    .eq("type", "article")
    .eq("status", "published");

  if (count === 1) {
    await awardBadge(userId, "初次发声");
  }
}

export async function checkFirstDiaryBadge(
  userId: string
) {
  const { count } = await supabase
    .from("posts")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("author_id", userId)
    .eq("type", "diary")
    .eq("status", "published");

  if (count === 1) {
    await awardBadge(userId, "深夜记录者");
  }
}

export async function checkFirstCommentBadge(
  userId: string
) {
  const { count } = await supabase
    .from("comments")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("author_id", userId)
    .eq("is_deleted", false);

  if (count === 1) {
    await awardBadge(userId, "温柔来信");
  }
}