import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

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
  title: "小时代",
  description: "世界已经睡了，但这里还有一些人，静静留下今天。",
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
      lang="en"
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
        <Analytics />
      </body>
    </html>
  );
}