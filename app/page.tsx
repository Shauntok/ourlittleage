import type { Metadata } from "next";
import LandingClient from "@/components/landing/LandingClient";
import { safeReturnPath } from "@/lib/navigation/safe-return-path";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: SITE_URL },
};

type PageProps = {
  searchParams: Promise<{
    returnTo?: string | string[];
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { returnTo } = await searchParams;
  return <LandingClient returnTo={safeReturnPath(returnTo)} />;
}
