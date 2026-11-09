import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "搜索街区里的故事",
  description: "寻找小时代居民公开留下的日记与文章。",
  alternates: { canonical: `${SITE_URL}/search` },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
