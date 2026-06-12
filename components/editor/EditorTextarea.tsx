import type { RefObject } from "react";

type Props = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  content: string;
  setContent: (value: string) => void;
  placeholder: string;
  onSaveShortcut: () => void;
  insertTextAtCursor: (beforeText: string, afterText?: string) => void;
  variant?: "article" | "diary";
};

export default function EditorTextarea({
  textareaRef,
  content,
  setContent,
  placeholder,
  onSaveShortcut,
  insertTextAtCursor,
  variant = "article",
}: Props) {
  const className =
    variant === "diary"
      ? `
        min-h-[220px] md:min-h-[520px] lg:min-h-[720px]
        w-full resize-y rounded-[2rem] md:rounded-[2.4rem]
        border border-white/10 bg-white/[0.045]
        p-6 md:p-10
        text-[16px] md:text-[18px]
        leading-[2.2] md:leading-[2.5]
        text-white outline-none backdrop-blur-2xl
        placeholder:text-white/20
        shadow-[0_0_80px_rgba(255,255,255,0.035)]
        transition-all duration-500
        focus:border-white/25 focus:bg-white/[0.065]
      `
      : `
        min-h-[360px] md:min-h-[560px]
        w-full resize-y rounded-2xl
        border border-white/10 bg-white/[0.04]
        p-5 leading-8 outline-none transition
        break-words whitespace-pre-wrap
        focus:border-white/40
      `;

  return (
    <textarea
      ref={textareaRef}
      value={content}
      onChange={(e) => setContent(e.target.value)}
      onKeyDown={(e) => {
        if (e.ctrlKey && e.key.toLowerCase() === "b") {
          e.preventDefault();
          insertTextAtCursor("**", "**");
        }

        if (e.ctrlKey && e.key.toLowerCase() === "s") {
          e.preventDefault();
          onSaveShortcut();
        }
      }}
      placeholder={placeholder}
      rows={variant === "diary" ? 7 : 14}
      className={className}
    />
  );
}