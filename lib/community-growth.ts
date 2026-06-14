import { supabase } from "@/lib/supabase";

function calculateLevel(exp: number) {
  if (exp >= 10) return 5;
  if (exp >= 6) return 4;
  if (exp >= 3) return 3;
  if (exp >= 1) return 2;
  return 1;
}

export async function addUserGrowth({
  userId,
  actorId = null,
  light = 0,
  trust = 0,
  reason,
}: {
  userId: string;
  actorId?: string | null;
  light?: number;
  trust?: number;
  reason: string;
}) {
  if (!userId) {
    console.error("addUserGrowth missing userId");
    return false;
  }

  if (!reason) {
    console.error("addUserGrowth missing reason");
    return false;
  }

  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("exp, trust_score, level")
    .eq("id", userId)
    .single();

  if (fetchError || !profile) {
    console.error("addUserGrowth fetch profile error:", fetchError);
    return false;
  }

  const currentExp = Number(profile.exp || 0);
  const currentTrust = Number(profile.trust_score || 0);
  const oldLevel = Number(profile.level || 1);

  const nextExp = Math.max(0, Number((currentExp + light).toFixed(3)));
  const nextTrust = Math.max(0, Number((currentTrust + trust).toFixed(3)));
  const nextLevel = calculateLevel(nextExp);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      exp: nextExp,
      trust_score: nextTrust,
      level: nextLevel,
    })
    .eq("id", userId);

  if (updateError) {
    console.error("addUserGrowth update profile error:", updateError);
    return false;
  }

  const { error: logError } = await supabase.from("growth_logs").insert([
    {
      user_id: userId,
      actor_id: actorId,
      light_change: light,
      trust_change: trust,
      reason,
    },
  ]);

  if (logError) {
    console.error("addUserGrowth insert log error:", logError);
  }

  if (nextLevel > oldLevel) {
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert([
        {
          user_id: userId,
          title: "🏆 居民等级提升",
          content: `你在小时代升到了 Lv.${nextLevel}。谢谢你慢慢留下的光。`,
          type: "system",
          is_important: true,
        },
      ]);

    if (notificationError) {
      console.error("addUserGrowth notification error:", notificationError);
    }
  }

  return true;
}