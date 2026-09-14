export const POST_TRASH_RETENTION_DAYS = 15;

const DAY_MS = 24 * 60 * 60 * 1000;

export function getTrashCutoff(now = new Date()) {
  return new Date(now.getTime() - POST_TRASH_RETENTION_DAYS * DAY_MS);
}

export function getTrashTiming(deletedAt: string, now = new Date()) {
  const expiresAt = new Date(
    new Date(deletedAt).getTime() + POST_TRASH_RETENTION_DAYS * DAY_MS
  );
  const remainingMs = expiresAt.getTime() - now.getTime();

  return {
    expiresAt: expiresAt.toISOString(),
    remainingDays: Math.max(0, Math.ceil(remainingMs / DAY_MS)),
    purgeEligible: remainingMs <= 0,
  };
}
