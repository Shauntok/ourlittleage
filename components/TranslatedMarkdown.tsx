"use client";

import ReactMarkdown from "react-markdown";
import { useLanguage } from "./LanguageProvider";
import { toSimplified, toTraditional } from "@/lib/opencc";

// ===== 自动转换 Markdown 正文 =====
export default function TranslatedMarkdown({
  content,
}: {
  content: string;
}) {
  const { mode } = useLanguage();

  const convertedContent =
    mode === "traditional"
      ? toTraditional(content)
      : toSimplified(content);

  return (
    <ReactMarkdown
      components={{
        img: ({ src, alt }) => (
          <img
            src={src || ""}
            alt={alt || ""}
            className="my-8 rounded-2xl"
          />
        ),
      }}
    >
      {convertedContent}
    </ReactMarkdown>
  );
}