import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import ArticleDetailClient from "@/components/articles/ArticleDetailClient";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

function stripMarkdown(value: string) {
  return value
    .replace(/!\[[^\]]*\]\(.*?\)/g, "")
    .replace(/\[[^\]]*\]\(.*?\)/g, "")
    .replace(/[#>*_`~\-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;

  const { data: article } = await supabase
    .from("posts")
    .select(
      `
        title,
        content,
        slug,
        status,
        visibility,
        deleted_at
      `
    )
    .eq("slug", slug)
    .eq("type", "article")
    .maybeSingle();

  if (
    !article ||
    article.deleted_at ||
    article.status !== "published" ||
    article.visibility === "private" ||
    article.visibility === "hidden"
  ) {
    return {
      title: "文章不存在",
      description: "这篇文章暂时无法查看。",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = article.title || "无标题文章";
  const brandedTitle = `${title}｜小时代`;

  const description =
    stripMarkdown(article.content || "").slice(0, 110) ||
    "有人在小时代留下了一篇故事。";

  const url = `https://ourlittleage.com/articles/${article.slug}`;

  const robots =
    article.visibility === "unlisted"
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
        };

  return {
    title,
    description,

    alternates: {
      canonical: url,
    },

    openGraph: {
      title: brandedTitle,
      description,
      url,
      siteName: "小时代",
      locale: "zh_CN",
      type: "article",
      images: [
        {
          url: "/og-cover.png",
          width: 1200,
          height: 630,
          alt: brandedTitle,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title: brandedTitle,
      description,
      images: ["/og-cover.png"],
    },

    robots,
  };
}

export default function ArticleDetailPage() {
  return <ArticleDetailClient />;
}