"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WritePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/articles/new");
  }, [router]);

  return null;
}