import { supabase } from "@/lib/supabase";
import { pinyin } from "pinyin-pro";

export function generateArticleSlug(value: string) {
  return pinyin(value, {
    toneType: "none",
    nonZh: "consecutive",
  })
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function checkArticleSlugExists(finalSlug: string) {
  const { data } = await supabase
    .from("posts")
    .select("id")
    .eq("slug", finalSlug)
    .maybeSingle();

  return !!data;
}