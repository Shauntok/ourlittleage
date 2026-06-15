import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { LanguageProvider } from "@/components/LanguageProvider";
import SiteShell from "@/components/SiteShell";
import PageRouterTransition from "@/components/PageRouterTransition";
import PresenceHeartbeat from "@/components/PresenceHeartbeat";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ourlittleage.com"),
  title: {
    default: "小时代 Our Little Age｜慢节奏文字社区",
    template: "%s｜小时代 Our Little Age",
  },
  description:
    "小时代 Our Little Age 是一个给深夜居民留下文字、日记、文章和生活痕迹的慢节奏社区。进入你的深夜小屋，慢慢写下今天。",
  keywords: [
    "小时代",
    "Our Little Age",
    "文字社区",
    "日记社区",
    "慢节奏社区",
    "深夜居民",
    "写日记",
    "中文社区",
  ],
  openGraph: {
    title: "小时代 Our Little Age｜慢节奏文字社区",
    description:
      "一个给深夜居民留下文字、日记、文章和生活痕迹的慢节奏社区。",
    url: "https://www.ourlittleage.com",
    siteName: "小时代 Our Little Age",
    locale: "zh_MY",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "小时代 Our Little Age｜慢节奏文字社区",
    description:
      "一个给深夜居民留下文字、日记、文章和生活痕迹的慢节奏社区。",
  },
};

export const viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hans"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white">
        <PresenceHeartbeat />

        <LanguageProvider>
          <SiteShell>
            <PageRouterTransition>
              {children}
            </PageRouterTransition>
          </SiteShell>
        </LanguageProvider>
      </body>
    </html>
  );
}