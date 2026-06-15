import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/announcements"],
        disallow: [
          "/home",
          "/admin",
          "/settings",
          "/notifications",
          "/drafts",
        ],
      },
    ],
    sitemap: "https://www.ourlittleage.com/sitemap.xml",
  };
}