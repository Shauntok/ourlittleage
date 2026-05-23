"use client";

import { toSimplified, toTraditional } from "@/lib/opencc";
import { useLanguage } from "./LanguageProvider";

// ===== 自动转换文字组件 =====
export default function TranslatedText({
  text,
}: {
  text: string;
}) {
  const { mode } = useLanguage();

  if (mode === "traditional") {
    return <>{toTraditional(text)}</>;
  }

  return <>{toSimplified(text)}</>;
}