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
  light = 0,
  trust = 0,
  reason,
}: {
  userId: string;
  light?: number;
  trust?: number;
  reason: string;
}) {
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("exp, trust_score, level")
    .eq("id", userId)
    .single();

  if (fetchError || !profile) {
    console.error("读取成长资料失败:", fetchError);
    return false;
  }

  const nextExp = Math.max(
    0,
    Number((Number(profile.exp || 0) + light).toFixed(3))
  );

  const nextTrust = Math.max(
    0,
    Number((Number(profile.trust_score || 0) + trust).toFixed(3))
  );

  const nextLevel = calculateLevel(nextExp);
  const oldLevel = Number(profile.level || 1);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      exp: nextExp,
      trust_score: nextTrust,
      level: nextLevel,
    })
    .eq("id", userId);

  if (updateError) {
    console.error("更新成长资料失败:", updateError);
    return false;
  }

  await supabase.from("growth_logs").insert([
    {
      user_id: userId,
      light_change: light,
      trust_change: trust,
      reason,
    },
  ]);

  if (nextLevel > oldLevel) {
    await supabase.from("notifications").insert([
      {
        user_id: userId,
        title: "🏆 居民等级提升",
        content: `你在小时代升到了 Lv.${nextLevel}。谢谢你慢慢留下的光。`,
        type: "system",
        is_important: true,
      },
    ]);
  }

  return true;
}