export function validateArticleTitle(
  title: string,
  maxLength = 25
): string | null {
  const cleanTitle = title.trim();

  if (!cleanTitle) {
    return "请输入文章标题。";
  }

  if (cleanTitle.length > maxLength) {
    return `文章标题不能超过 ${maxLength} 个字。目前是 ${cleanTitle.length} 个字。`;
  }

  return null;
}

export function validateArticleContent(
  content: string,
  minLength = 500
): string | null {
  const cleanContent = content.trim();

  if (!cleanContent) {
    return "请输入文章内容。";
  }

  if (cleanContent.length < minLength) {
    return `文章正文至少需要 ${minLength} 字。目前只有 ${cleanContent.length} 字。`;
  }

  return null;
}

export function validateArticleDraftContent(content: string): string | null {
  const cleanContent = content.trim();

  if (!cleanContent) {
    return "写一点点就好，我帮你先收进草稿箱。";
  }

  return null;
}

export function validateArticleForPublish(
  title: string,
  content: string,
  titleMaxLength = 25,
  contentMinLength = 500
): string | null {
  return (
    validateArticleTitle(title, titleMaxLength) ||
    validateArticleContent(content, contentMinLength)
  );
}

export function validateArticleForDraft(
  title: string,
  content: string,
  titleMaxLength = 25
): string | null {
  return (
    validateArticleTitle(title, titleMaxLength) ||
    validateArticleDraftContent(content)
  );
}