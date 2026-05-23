// ===== 支持的文字模式 =====
export type LanguageMode = "simplified" | "traditional";

// ===== localStorage key =====
export const LANGUAGE_STORAGE_KEY = "site-language-mode";

// ===== 根据浏览器语言自动判断 =====
export function detectLanguageMode(): LanguageMode {
  if (typeof window === "undefined") {
    return "simplified";
  }

  const language = navigator.language.toLowerCase();

  if (
    language.includes("zh-tw") ||
    language.includes("zh-hk") ||
    language.includes("zh-mo")
  ) {
    return "traditional";
  }

  return "simplified";
}