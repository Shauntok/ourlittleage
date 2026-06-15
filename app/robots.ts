import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/space",
          "/articles",
          "/announcements",
        ],
        disallow: [
          "/home",
          "/admin",
          "/settings",
          "/notifications",
          "/drafts",
        ],
      },
    ],
    sitemap: "https://ourlittleage.com/sitemap.xml",
  };
}