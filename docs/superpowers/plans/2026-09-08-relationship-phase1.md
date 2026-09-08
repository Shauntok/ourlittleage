# Relationship Phase 1 Implementation Plan

Approved scope: Follow core, profiles.follow_mode, database authorization and
Owner/Admin read-only relationship section in /admin/users/[id]. No resident UI,
notifications, mentions, friendship or content changes. No production writes.

## Architecture

- One directed user_follows row per pair, pending or accepted; physical removal.
- User identity from validated Supabase session and auth.uid(), never actor input.
- Transactional RPCs enforce state transitions; ordinary roles cannot write table.
- Pair locks serialize follow/accept/cancel. Profile row locks coordinate privacy
  and account status changes. Accept/reject require the specific request ID.
- Participants read their own relationships; Owner/Admin read paginated operator
  views via guarded RPC. Pending is never included in accepted counts or mutuals.
- Existing privacy/account changes never rewrite relationship rows.
- No Block system exists. Central transaction eligibility check is its future
  integration point; no fake claim that blocking is already enforced.

## Work

- [x] Create generated migration, constraints, indexes, ACL/RLS and RPC operations.
- [x] Run real isolated PostgreSQL tests with synthetic identities, including
  permissions, states, concurrency and cancellation of pending requests.
- [x] Add reusable server services with session authentication and validation.
- [x] Add guarded Admin API, summary and paginated human-readable details.
- [x] Verify tests, focused lint, TypeScript, build and component UI states.
- [x] Document limitations, deployment instructions and self-review. Stop Phase 1.

## Existing Constraints

Repository migration history does not bootstrap its original tables. Isolated
tests must supply a documented minimal fixture for existing auth/profiles only,
including current profile policies and update guard. This is not a production
baseline migration. Never reset or test writes on the linked production database.

Account rule: both active/warned for follow and accept; all authenticated account
states may reduce their own relationships. Admin view excludes Moderator without
changing existing resident detail access. Accepted/pending rows survive bans.
