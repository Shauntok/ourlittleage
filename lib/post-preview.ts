const MARKDOWN_IMAGE = /!\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["'][^"']*["'])?\s*\)/g;

export function getFirstPostImage(content: string): string | null {
  const storageOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  for (const match of content.matchAll(MARKDOWN_IMAGE)) {
    const source = (match[1] || match[2] || "").trim();
    try {
      const url = new URL(source);
      if (storageOrigin &&
          url.origin === new URL(storageOrigin).origin &&
          url.pathname.startsWith("/storage/v1/object/public/images/")) {
        return url.href;
      }
    } catch {
      // Ignore malformed or unsupported image references.
    }
  }
  return null;
}

export function getPostPreviewLines(content: string) {
  const plain = content
    .replace(MARKDOWN_IMAGE, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/^[\s#>*_`-]+/gm, "")
    .trim();
  return plain.split(/\n+/).map((line) => line.trim()).filter(Boolean);
}
