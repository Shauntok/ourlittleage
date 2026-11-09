// Keep legacy link-visible posts readable while new selections are paused.
// A future VIP release must also enforce eligibility in database policies.
export const NEW_LINK_VISIBILITY_ENABLED = false;

export function canSelectLinkVisibility(originalVisibility?: string | null) {
  return NEW_LINK_VISIBILITY_ENABLED || originalVisibility === "unlisted";
}
