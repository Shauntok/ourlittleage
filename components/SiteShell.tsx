"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";

export default function SiteShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [message, setMessage] = useState("");

  const isAdminPage = pathname.startsWith("/admin");
  const isLandingPage = pathname === "/";

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
        setMessage("你的账号已被封禁。");

        window.setTimeout(async () => {
          await supabase.auth.signOut();
          window.location.href = "/";
        }, 900);
      }
    }

    checkBanned();
  }, []);

  return (
    <>
      {message && (
        <div className="fixed left-1/2 top-6 z-[9999] -translate-x-1/2 rounded-2xl border border-red-500/20 bg-zinc-950/95 px-5 py-3 text-center text-sm text-red-100 shadow-2xl backdrop-blur-xl">
          {message}
        </div>
      )}

      {!isAdminPage && !isLandingPage && <Navbar />}

      {children}
    </>
  );
}