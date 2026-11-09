export type SkinRelease = {
  id: string;
  publishedAt: string;
  name: string;
};

// Change the ID only for a future skin release, never for ordinary style updates.
export const ACTIVE_SKIN_RELEASE: SkinRelease | null = {
  id: "modern-pixel-1-0-0",
  publishedAt: "2026-11-09T05:04:00Z",
  name: "现代像素",
};

export function isSkinReleasePromptEligible(
  release: SkinRelease | null,
  profileCreatedAt: string | null | undefined,
  lastPromptedReleaseId: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!release?.id || !profileCreatedAt || lastPromptedReleaseId === release.id) return false;
  const publishedAt = Date.parse(release.publishedAt);
  const createdAt = Date.parse(profileCreatedAt);
  return Number.isFinite(publishedAt) && Number.isFinite(createdAt)
    && publishedAt <= now.getTime() && createdAt < publishedAt;
}
