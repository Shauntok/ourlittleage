# Security Center Phase 1 Foundation Design

Date: 2026-09-12

## Status

Approved in chat for design documentation. Implementation has not started.

## Goal

Build the internal Security Center foundation for Our Little Age:

- server-side security feature flags;
- append-only security events;
- one current risk profile per resident;
- an Owner/Admin protected Security Center overview;
- a Word Detection section that reuses the existing comment moderation keyword system;
- an Owner/Admin protected Security section in Resident Detail;
- Owner-only manual risk and review actions with immutable audit history.

Phase 1 observes, records, and supports manual review. It does not automatically punish residents.

## Non-goals

Phase 1 does not implement:

- IP, CIDR, device, VPN, proxy, geographic, bot, spam, referral, or payment detection;
- automatic risk evaluation, automatic enforcement, ban, mute, logout, or content removal;
- resident-facing security notifications;
- changes to Supabase Auth, Cookie Session, `lib/supabase.ts`, or `proxy.ts`;
- changes to existing account punishment, VIP, relationship, or notification behavior;
- a second keyword table, a replacement comment-review workflow, or changes to existing word-detection semantics;
- Production migration application.

Existing account-status, VIP, and comment-moderation events are not copied into `security_events` in Phase 1. Security events originate only from manual Security Center risk and review actions. The Word Detection section is an operational view over the existing comment moderation system, not a new security-event source.

## Chosen Architecture

Use the existing protected server/API pattern established by VIP management:

```text
Admin browser
  -> Server-protected page and API
  -> server-only security service
  -> service-role RPC
  -> database role validation
  -> risk profile + immutable security event + admin log transaction
```

The browser never supplies a trusted actor ID. Actor identity comes from the existing Cookie Server Session. The database RPC receives that server-derived ID and independently verifies the actor's current profile role and that the actor status is `active` or `warned`.

Direct client access is rejected even if a resident knows table, RPC, API, or route names.

## Data Model

### `security_feature_flags`

A singleton server-side configuration row containing:

- `security_center_enabled = true`
- `security_event_collection_enabled = true`
- `risk_evaluation_enabled = false`
- `automatic_enforcement_enabled = false`
- timestamps

Missing rows, malformed values, or read errors fail closed. Risk evaluation and automatic enforcement must always resolve to `false` unless explicitly and safely enabled by a future phase.

Phase 1 does not expose a flag-editing UI or mutation API.

### `security_events`

Append-only event history with:

- UUID primary key;
- unique, non-null `request_id` for idempotency;
- non-null SHA-256 `request_fingerprint` for rejecting request-ID reuse with different parameters without storing note text;
- `event_type`;
- `category`;
- nullable target `user_id`;
- nullable `actor_id`;
- bounded, non-empty administrative `reason`;
- `severity`;
- `source`;
- object-only JSON metadata;
- `occurred_at` and `created_at`.

Allowed category vocabulary includes `auth`, `account`, `admin`, `moderation`, `permission`, `relationship`, `vip`, and `system`. Future category names may be reserved by the schema without implementing their detectors.

Phase 1 writes only these event types:

- `risk_level_changed`
- `review_marked_pending`
- `review_marked_complete`
- `internal_note_updated`

Their source is `security_center_manual`. Note content is not copied into event metadata; events record that the note changed plus the relevant risk/review state. This avoids duplicating sensitive internal notes while preserving an auditable action trail.

An append-only trigger rejects UPDATE and DELETE. No browser role receives direct table access.

### `security_risk_profiles`

One current row per resident, keyed by `user_id`, containing:

- `risk_level`: `low`, `medium`, `high`, or `critical`;
- `review_status`: `no_review_required`, `pending`, or `reviewed`;
- `last_event_at`;
- `last_reviewed_at`;
- nullable `reviewed_by`;
- nullable internal `notes` with a bounded length;
- timestamps.

Defaults are `low + no_review_required`. Existing residents receive a default row in the migration. A small profile-insert trigger creates the same default row for future residents. This trigger does not read or change `profiles.status`.

Changing a risk profile never changes `profiles.status`. Account status remains the existing independent `active / warned / muted / banned` system.

## Database Security and RPCs

All three tables enable RLS. `PUBLIC`, `anon`, and `authenticated` receive no direct read or write grants. Server access uses the existing service role, and every privileged RPC performs its own actor verification.

Planned RPC responsibilities:

- `security_get_feature_flags`: server-only flag read with fail-closed mapping in application code;
- `security_admin_get_overview`: Owner/Admin summary, risk distribution, flags, high-severity events, and paginated recent events;
- `security_admin_get_resident`: Owner/Admin current risk state plus paginated resident events;
- `security_owner_apply_risk_action`: Owner-only state transition and audit transaction.

Functions use `SECURITY DEFINER`, an empty `search_path`, schema-qualified object references, explicit validation, revoked default EXECUTE privileges, and service-role-only EXECUTE grants.

The mutation RPC:

1. validates actor, target, action, reason, request ID, risk level, review state, and note bounds;
2. checks that Security Center and event collection are enabled;
3. locks the request ID and target resident;
4. returns the prior result when the identical request is retried;
5. rejects reuse of a request ID with different parameters;
6. updates only `security_risk_profiles`;
7. writes one immutable `security_events` row;
8. writes one human-readable `admin_logs` row;
9. commits all three changes atomically.

If event recording or admin logging fails, the risk-profile mutation rolls back. Automatic enforcement remains off and no account punishment is invoked.

## Server Service and APIs

`lib/security/service.ts` is the only application-level entry point for Security Center data. It maps database values into strict TypeScript types, validates RPC responses, and returns generic errors without leaking internal metadata.

The Security Center overview service also reads a bounded comment-moderation summary from the existing `comment_moderation_keywords` and `comment_moderation_flags` tables. Keyword mutations continue to use the existing RLS-protected moderation path; Phase 1 does not duplicate those mutations in the security RPC layer.

Planned routes:

- `GET /api/admin/security`: Owner/Admin overview and paginated events;
- `GET /api/admin/users/[id]/security`: Owner/Admin resident security detail;
- `POST /api/admin/users/[id]/security`: Owner-only manual risk action.

The routes use the existing `getAdminActor()` Cookie Server Session flow. Authorization helpers will add separate read and write predicates. Moderator, resident, and anonymous requests are rejected server-side.

Responses use `Cache-Control: private, no-store`.

## Admin UI

### Security Center

Add `/admin/security` and a compact "安全中心" link under the existing internal Admin Sidebar section.

The page shows:

- the four system security flag states;
- pending-review count;
- low/medium/high/critical distribution;
- recent high-severity events;
- paginated recent security events.

The page also includes a distinct **Word Detection** section. It reuses the existing comment moderation system and shows:

- active and inactive detection-word counts;
- pending comment-review count;
- a bounded list of recent keyword matches with matched words and detection time;
- the existing keyword-library controls for adding, enabling, disabling, deleting, and rescanning;
- a clear link to `/admin/comments?filter=flagged` for the full pending-review workflow.

The existing `KeywordManager` may receive a small reusable presentation mode so it can render inside Security Center without duplicating its queries or mutation behavior. The original Comment Management entry and keyword controls remain available and continue to operate on the same records.

Security Center does not duplicate full comment text, comment cards, hide/delete controls, or moderation resolution actions. Those remain in `/admin/comments`. The comments page accepts the narrow `filter=flagged` query parameter and falls back to its current default for absent or invalid values.

Owner and Admin can manage the word library under the existing database policies. Moderator keeps the existing Comment Management permissions but cannot enter Security Center. Resident and anonymous users cannot read the keyword library or moderation summaries. Word-list changes and comment rescans do not change risk profiles, create `security_events`, or trigger automatic punishment in Phase 1.

The layout uses restrained black and neutral styling consistent with the existing Admin area. Severity colors are small status accents, not a bright dashboard palette. There are no charts, detection thresholds, trend analytics, or manual refresh control.

### Resident Detail Security Section

Add a locally isolated Security section to `/admin/users/[id]` showing:

- current risk level;
- review status;
- existing account status as separate read-only context;
- last security event;
- last review;
- internal note;
- paginated resident security events.

Owner can select a risk level, mark review pending or complete, and update the internal note. Every action requires a reason. Admin sees the same data read-only. Moderator does not receive the section.

Section loading or read failure does not crash Resident Detail. It shows a local unavailable state and a retry command.

## Pagination and Query Shape

Overview reads counts plus a small page of events, never all residents or all events. Event pagination defaults to 20 rows and has a bounded maximum page size. Resident history follows the same bounded pattern.

Counts are calculated reliably at query time in Phase 1. No denormalized dashboard counters or analytics tables are introduced.

## Privacy and Data Minimization

Security data is internal operational information. It is not exposed through Public Changelog, public APIs, public Supabase grants, resident profile responses, or client-side static data.

Phase 1 stores no IP addresses, device identifiers, passwords, tokens, cookies, JWTs, secrets, or credentials. Event metadata is allowlisted and object-only. Internal notes remain in the current risk profile and are not duplicated into event metadata or `admin_logs`.

## Error Handling

- Invalid input returns a generic 400 response.
- Missing authentication returns 401.
- Insufficient role returns 403.
- Missing resident returns 404.
- Database or mapping failures return a generic 500 response and are logged server-side without sensitive payloads.
- Disabled or unavailable flags block mutations.
- Security section failures remain local to that section.

## Verification

### SQL verification

- migration applies cleanly in the existing isolated PostgreSQL-compatible harness;
- constraints, indexes, defaults, backfill, and profile-insert initialization;
- RLS and grants for Owner, Admin, Moderator, resident, and anonymous paths;
- append-only UPDATE/DELETE rejection;
- Owner mutation and Admin read-only behavior;
- one profile/event/admin log for repeated identical `request_id`;
- rejection of mismatched request reuse;
- all automatic risk and enforcement flags remain off;
- risk changes do not alter `profiles.status`.

### Application verification

- authorization helper tests;
- server service mapping and fail-closed tests;
- overview and resident API role matrices;
- Security Center server-page guard;
- Admin Sidebar visibility;
- Word Detection summary counts and bounded recent-match mapping;
- Owner/Admin keyword management reuses the existing records and policies;
- `/admin/comments?filter=flagged` opens the existing pending-review view;
- the original Comment Management keyword and review workflow remains functional;
- no duplicate keyword or moderation tables, events, or risk-profile mutations are introduced;
- Resident Detail Security loading, error, read-only, and Owner action states;
- internal data is absent from Public Changelog and public APIs.

Final gates are targeted Vitest, TypeScript, focused ESLint, production build, and `git diff --check`.

## Changelog and Delivery

Implementation must update:

- `HANDOFF.md`: full technical state and migration status;
- Admin Changelog: concise internal Security Center foundation and Word Detection integration entry;
- Public Changelog: not applicable.

The implementation may be committed and pushed after all local gates pass. The migration must remain unapplied to Production until a separate Production Readiness Review and explicit approval.

## Completion Boundary

Phase 1 is complete when the local migration, server security boundary, Admin overview, reused Word Detection section, Resident Detail section, manual review actions, audit trail, and required tests pass.

Completion does not authorize Production migration, automatic risk evaluation, automatic enforcement, or any Phase 2 detector.
