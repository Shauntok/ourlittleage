export const NEIGHBOR_IMAGE_MESSAGE =
  "仅邻居可见目前只支持纯文字。请移除配图或公开图片链接，再保存。";

export function neighborVisibilityError(visibility: string, content: string): string | null {
  if (visibility !== "neighbors") return null;

  const hasEmbeddedImage = /!\[[^\]]*\]|<\s*img\b/i.test(content);
  const hasPublicUpload = /\/storage\/v1\/(?:object|render\/image)\/public\/images\//i.test(content);
  return hasEmbeddedImage || hasPublicUpload ? NEIGHBOR_IMAGE_MESSAGE : null;
}
