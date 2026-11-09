export const MAX_ARTICLE_TAGS = 5;
export const MAX_ARTICLE_TAG_LENGTH = 20;

export function parseArticleTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.trim().replace(/^#+/, "").trim())
      .filter(Boolean);
  }
  if (typeof value !== "string" || !value.trim()) return [];

  if (value.trim().startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) return parseArticleTags(parsed);
    } catch { /* Older posts may contain plain comma-separated text. */ }
  }

  return parseArticleTags(value.split(/[,，]/));
}

export function uniqueArticleTags(value: unknown): string[] {
  const seen = new Set<string>();
  return parseArticleTags(value).filter((tag) => {
    const key = tag.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function validateArticleTags(value: string): string | null {
  const tags = uniqueArticleTags(value);
  if (tags.length > MAX_ARTICLE_TAGS) return `最多填写 ${MAX_ARTICLE_TAGS} 个标签。`;
  if (tags.some((tag) => Array.from(tag).length > MAX_ARTICLE_TAG_LENGTH)) {
    return `每个标签最多 ${MAX_ARTICLE_TAG_LENGTH} 个字。`;
  }
  if (tags.some((tag) => /[\r\n]/.test(tag))) return "标签里不能换行。";
  return null;
}

export function serializeArticleTags(value: string): string {
  return uniqueArticleTags(value).join(",");
}

export function articleTagHref(tag: string): string {
  return `/tags/${encodeURIComponent(tag)}`;
}

export function articleTagPattern(tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return `(^|[,，])[[:space:]]*${escaped}[[:space:]]*([,，]|$)`;
}
