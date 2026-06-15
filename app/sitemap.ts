import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://ourlittleage.com";

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/space`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/articles`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/announcements`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  const { data: articles } = await supabase
    .from("posts")
    .select("slug, published_at")
    .eq("type", "article")
    .eq("status", "published")
    .eq("visibility", "public");

  const articlePages: MetadataRoute.Sitemap =
    articles?.map((article) => ({
      url: `${baseUrl}/articles/${article.slug}`,
      lastModified: article.published_at
        ? new Date(article.published_at)
        : new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    })) || [];

  const { data: diaries } = await supabase
    .from("posts")
    .select("id, published_at")
    .eq("type", "diary")
    .eq("status", "published")
    .eq("visibility", "public");

  const diaryPages: MetadataRoute.Sitemap =
    diaries?.map((diary) => ({
      url: `${baseUrl}/diary/${diary.id}`,
      lastModified: diary.published_at
        ? new Date(diary.published_at)
        : new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    })) || [];

  const { data: users } = await supabase
    .from("profiles")
    .select("username, updated_at")
    .not("username", "is", null);

  const userPages: MetadataRoute.Sitemap =
    users?.map((user) => ({
      url: `${baseUrl}/u/${encodeURIComponent(user.username)}`,
      lastModified: user.updated_at
        ? new Date(user.updated_at)
        : new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    })) || [];

  return [
    ...staticPages,
    ...articlePages,
    ...diaryPages,
    ...userPages,
  ];
}