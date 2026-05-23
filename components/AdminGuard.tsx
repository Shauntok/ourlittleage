"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Props = {
  children: React.ReactNode;
};

export default function AdminGuard({
  children,
}: Props) {

  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    async function checkAccess() {

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      const { data: profile } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

      const allowedRoles = [
        "owner",
        "admin",
        "moderator",
      ];

      if (
        !profile ||
        !allowedRoles.includes(
          profile.role
        )
      ) {
        router.push("/");
        return;
      }

      setLoading(false);
    }

    checkAccess();

  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        检查后台权限中...
      </div>
    );
  }

  return <>{children}</>;
}