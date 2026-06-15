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
  metadataBase: new URL("https://ourlittleage.com"),

  title: {
    default: "小时代｜深夜故事社区",
    template: "%s｜小时代",
  },

  description:
    "小时代是一个慢节奏的深夜文字社区。在这里写日记、分享故事、留下生活痕迹，与仍未入睡的人相遇。",

  keywords: [
    "小时代",
    "深夜社区",
    "文字社区",
    "日记社区",
    "匿名日记",
    "写日记",
    "故事社区",
    "情感社区",
    "生活记录",
    "中文社区",
  ],

  openGraph: {
    title: "小时代｜深夜故事社区",
    description:
      "世界已经睡了，但这里还有一些人，静静留下今天。",
    url: "https://ourlittleage.com",
    siteName: "小时代",
    locale: "zh_CN",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "小时代｜深夜故事社区",
    description:
      "世界已经睡了，但这里还有一些人，静静留下今天。",
  },

  alternates: {
    canonical: "https://ourlittleage.com",
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
      lang="zh-CN"
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