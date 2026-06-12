export function validateArticleTitle(title: string, maxLength = 25) {
  const cleanTitle = title.trim();

  if (!cleanTitle) {
    alert("请输入文章标题。");
    return false;
  }

  if (cleanTitle.length > maxLength) {
    alert(`文章标题不能超过 ${maxLength} 个字。目前是 ${cleanTitle.length} 个字。`);
    return false;
  }

  return true;
}

export function validateArticleContent(content: string, minLength = 500) {
  const cleanContent = content.trim();

  if (!cleanContent) {
    alert("请输入文章内容。");
    return false;
  }

  if (cleanContent.length < minLength) {
    alert(`文章正文至少需要 ${minLength} 字。目前只有 ${cleanContent.length} 字。`);
    return false;
  }

  return true;
}