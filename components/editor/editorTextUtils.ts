import type { RefObject } from "react";

type InsertTextParams = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  beforeText: string;
  afterText?: string;
  setContent: (value: string) => void;
};

export function insertEditorText({
  textareaRef,
  beforeText,
  afterText = "",
  setContent,
}: InsertTextParams) {
  const textarea = textareaRef.current;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.slice(start, end);
  const insertText = beforeText + selectedText + afterText;

  textarea.setRangeText(insertText, start, end, "end");
  setContent(textarea.value);

  const newPosition = start + insertText.length;
  textarea.focus();
  textarea.setSelectionRange(newPosition, newPosition);
}