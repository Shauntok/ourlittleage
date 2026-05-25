"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";

export default function SiteShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isAdminPage = pathname.startsWith("/admin");
  const isLandingPage = pathname === "/";
  const isResidentHomePage = pathname === "/home";

  useEffect(() => {
    async function checkBanned() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", user.id)
        .single();

      if (profile?.status === "banned") {
        alert("你的账号已被封禁。");

        await supabase.auth.signOut();

        window.location.href = "/";
      }
    }

    checkBanned();
  }, []);

  return (
    <>
      {!isAdminPage && !isLandingPage && !isResidentHomePage && <Navbar />}

      {children}
    </>
  );
}