"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

// ===== 前台外壳：Admin 页面不显示前台 Navbar =====
export default function SiteShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isAdminPage = pathname.startsWith("/admin");

  return (
    <>
      {!isAdminPage && <Navbar />}

      {children}
    </>
  );
}