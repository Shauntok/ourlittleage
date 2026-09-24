# Security Center Phase 2A Manual Protection Design

Date: 2026-09-24

## Status

Implementation complete locally. Production migration and Vercel Firewall publication are not approved or applied.

## Goal

Extend the existing Owner/Admin Security Center with a controlled operational
workflow for network protection:

- prepare IP and CIDR block requests;
- prepare unblock requests against an existing active record;
- prepare rate-limit observation proposals;
- preserve an immutable audit trail for every lifecycle transition;
- keep Vercel Firewall as the source of truth and final publication surface.

Phase 2A is deliberately manual. It improves operational clarity without giving
the application permission to publish Vercel Firewall changes or automatically
punish residents.

## Confirmed Product Rules

- `Ban Resident != Block IP`.
- Banning a resident never creates a Firewall request.
- Blocking an IP never changes `profiles.status`.
- Security risk level remains independent from account status and Firewall
  state.
- `risk_evaluation_enabled` remains `false`.
- `automatic_enforcement_enabled` remains `false`.
- Owner may prepare and confirm protection operations.
- Admin has read-only access and sees masked IP/CIDR values.
- Moderator, resident, and anonymous access is denied server-side.
- Final Vercel publication remains an explicit Owner operation in the Vercel
  dashboard.
- The application does not store a Vercel Access Token.

## Non-goals

Phase 2A does not implement:

- direct Firewall publication from Our Little Age;
- automatic IP collection from every visitor;
- automatic risk scoring or automatic punishment;
- device fingerprinting, VPN/proxy detection, bot classification, geographic
  profiling, referral fraud, or payment abuse detection;
- Attack Mode control, system bypass control, or pausing Vercel system
  mitigations;
- resident-facing security notifications;
- changes to Auth, Relationship, VIP, content, moderation decisions, or account
  punishment behavior;
- Production migration application or Production Firewall changes.

## Existing Foundation

Phase 2A extends the Production-verified Phase 1 architecture:

- `security_feature_flags`;
- `security_risk_profiles`;
- append-only `security_events`;
- Owner/Admin protected Security Center routes and server service;
- Owner-only manual mutations with request-ID idempotency;
- atomic `security_events` and `admin_logs` writes;
- existing Word Detection integration.

The current Vercel project is linked and platform DDoS mitigation is active.
There are no project custom Firewall rules or drafts at design time. IP bypass
is unavailable on the current plan. Plan-dependent capabilities must be shown
honestly and must never render as working controls when unavailable.

## Chosen Architecture

Use a controlled hybrid workflow:

```text
Owner browser
  -> Cookie-authenticated protected API
  -> server-only Security service
  -> service-role RPC
  -> protected Firewall request + immutable event + admin log
  -> human-readable Vercel operation summary
  -> Owner publishes separately in Vercel Dashboard
  -> Owner records external rule ID and manual confirmation
```

Vercel remains the source of truth for active Firewall configuration and live
traffic. Our Little Age is the source of truth for internal intent, approvals,
reasons, and audit history.

No application route calls a Vercel mutation API. No Vercel credential is
stored in Supabase, source code, HANDOFF, Admin Changelog, browser storage, or
application environment variables for this phase.

## Data Model

### `security_firewall_requests`

Add one protected table for the current operational record. Conceptual fields:

- `id` UUID primary key;
- `request_id` UUID unique and non-null for idempotency;
- `request_fingerprint` SHA-256 non-null for mismatched retry rejection;
- `request_type`:
  - `block_ip`
  - `block_cidr`
  - `unblock`
  - `rate_limit_observation`
- `status`:
  - `awaiting_external_publish`
  - `active`
  - `resolved`
  - `cancelled`
  - `failed`
- nullable `target_network` using PostgreSQL `inet` for IP/CIDR requests;
- non-null `target_masked` safe for immutable logs and Admin display;
- non-null random `target_reference` UUID for correlating audit entries without
  deriving a persistent value from the network target;
- nullable `hostname_scope` from a strict allowlist;
- nullable `related_request_id` for unblock requests;
- rate-limit proposal fields using typed columns:
  - path match mode (`exact` or `prefix`)
  - normalized path
  - HTTP method
  - observation window seconds
  - observation request threshold
  - proposed follow-up action
- bounded, mandatory `reason`;
- `requested_by` historical actor UUID;
- nullable `external_rule_id` with strict length and character validation;
- nullable `confirmed_by` historical actor UUID;
- nullable `confirmed_at`, `resolved_at`, and `anonymized_at`;
- `created_at` and `updated_at`.

The table stores no token, password, Cookie, JWT, email content, device
identifier, or arbitrary executable rule JSON.

### Constraints and indexes

- request type and status vocabularies are enforced by constraints;
- target requirements depend on request type;
- rate-limit fields are allowed only for `rate_limit_observation`;
- unblock must reference an existing active block record;
- an active or awaiting block conflict for the same normalized target and host
  is rejected;
- timestamps follow valid lifecycle states;
- `external_rule_id` is required before a block can become `active`;
- bounded reason and text lengths;
- indexes support status, creation time, retained target, actor, retention,
  and related-request lookups;
- concurrent mutation paths lock the relevant request and retained normalized
  target.

## Network Validation

The server and database both validate normalized network input.

- accept IPv4, IPv6, and CIDR through structured parsing;
- reject malformed, loopback, unspecified, link-local, multicast, and private
  networks from the ordinary public-Firewall workflow;
- reject broad CIDR requests beyond the approved safe limit;
- require an explicit narrower network rather than silently rewriting a broad
  range;
- normalize equivalent network representations before conflict checks;
- restrict hostname scope to the project's approved Production hostnames;
- never infer a resident identity from an IP address.

Exact IPv4 and IPv6 breadth limits must be documented in the implementation
plan and covered by SQL and application tests before coding the parser.

## Rate-limit Observation Proposals

Rate-limit entries are planning records, not active protection.

- only `exact` and `prefix` path matching are supported;
- HTTP methods come from a strict allowlist;
- paths are normalized and cannot contain credentials or query values;
- request windows and thresholds have conservative bounds;
- the generated summary always starts in Vercel `log` observation mode;
- switching to challenge, rate-limit, or deny requires a separate external
  Vercel decision;
- unavailable plan capability is shown as unavailable and does not change the
  request into an active rule.

## Lifecycle

### Create

Owner creates a block or observation request with a mandatory reason. The RPC
validates actor, target, scope, conflicts, and request ID, then atomically:

1. inserts the protected request;
2. appends a Security Event;
3. appends an Admin Log.

The initial status is `awaiting_external_publish`.

### Confirm external publication

After the Owner publishes in Vercel, the Owner records the external rule ID and
confirms the action. The UI must label this as **Owner manually confirmed**,
not automatically verified.

The mutation locks the request, validates the transition, stores confirmation
metadata, and atomically appends the event and admin log.

### Unblock and resolve

An unblock request can only begin from an existing `active` block request. It
links to that record and starts as `awaiting_external_publish`. After external
removal is manually confirmed, the unblock becomes `resolved` and the original
block record becomes `resolved` in the same transaction.

### Cancel or fail

Only requests not yet active may be cancelled. External execution failures may
be marked `failed` with a mandatory reason. Neither state changes a resident or
any other Security Center risk state.

### Retention

- awaiting and active records keep the full network target;
- resolved, cancelled, and failed records keep it for 90 days;
- after 90 days, a protected daily retention task sets `target_network` to
  `NULL` and records `anonymized_at`;
- masked target, random target reference, reason, lifecycle, external rule ID, security
  event, and admin log remain;
- retention uses database time and never anonymizes an active record.

## Security Events and Audit

Extend the existing event vocabulary for Firewall request lifecycle events:

- `firewall_request_created`
- `firewall_request_confirmed`
- `firewall_request_resolved`
- `firewall_request_cancelled`
- `firewall_request_failed`
- `firewall_target_anonymized`

Use a dedicated source such as `security_center_firewall`. Event metadata may
contain only allowlisted values: request type, request status, masked target,
random target reference, hostname scope, related request ID, and external rule
ID.
It must never contain the complete IP/CIDR, reason duplication, credentials, or
free-form payloads.

Every successful lifecycle transition writes exactly one Security Event and
one Admin Log in the same transaction. If either audit write fails, the current
record mutation rolls back.

## Access Control

### Owner

- view full target while it is retained;
- create block, CIDR, unblock, and rate-limit observation requests;
- confirm external publication;
- cancel or mark a pending request failed;
- view all lifecycle and audit records.

### Admin

- view request lifecycle and masked target;
- view rate-limit proposal details that contain no sensitive network target;
- cannot create, confirm, cancel, fail, resolve, or anonymize requests.

### Moderator, resident, anonymous

- no page section;
- no API data;
- no table or RPC permission;
- direct URL and direct RPC attempts are denied.

Browser identity is never trusted. The Server Service obtains the actor from
the existing Cookie Server Session, and every privileged RPC independently
checks the actor's current role and allowed account status.

## Server Service and APIs

Extend `lib/security/service.ts` as the only application-level entry point.
The service maps database responses to strict types, masks Admin responses,
normalizes errors, and never returns the full target to non-Owner actors.

Conceptual operations:

- `getFirewallProtectionOverview(page, status)`
- `createFirewallRequest(input)`
- `transitionFirewallRequest(id, input)`
- `runFirewallRetention()` as a cron-only server operation

The API shape should follow the current Security Center route pattern and use
`Cache-Control: private, no-store`. Mutations use bounded Zod schemas and
generic client errors. Raw database errors and full targets are not logged.

## Admin UI

Add a **Traffic Protection** section to `/admin/security`; do not create a
separate security navigation system.

The section contains:

1. **Platform protection**
   - state that Vercel platform DDoS protection is active;
   - explain that Vercel is the live source of truth;
   - provide a safe external link to the project Firewall dashboard;
   - do not display stale local traffic metrics as live values.

2. **Protection requests**
   - filters for awaiting, active, and ended records;
   - bounded pagination;
   - request type, status, reason, actor, times, and external rule ID;
   - full target for Owner, masked target for Admin;
   - explicit `Owner manually confirmed` wording.

3. **Owner workflow**
   - compact dialog or panel for supported request types;
   - structured inputs instead of arbitrary JSON;
   - human-readable Vercel rule summary;
   - Vercel Dashboard link;
   - confirmation dialog for every lifecycle mutation.

4. **Capability states**
   - unsupported or unverified plan capabilities are disabled with a clear
     message;
   - no control claims a rule is active without Owner confirmation;
   - no direct Firewall publish button exists.

The layout remains black, restrained, and consistent with the existing Admin
area. It uses compact sections and familiar icons, not bright charts or a
technology-dashboard visual language. Mobile and desktop must both preserve
the same permissions and readable status hierarchy.

## Retention Task

Add a narrow daily cron route protected by the existing cron authorization
pattern. The route calls a service-role RPC that:

- uses database time;
- selects only ended records older than 90 days;
- locks rows before anonymization;
- nulls only the full target;
- appends the immutable event and admin log;
- is idempotent and bounded per run.

The route does not publish Firewall rules, inspect residents, or modify any
other security data.

## Error Handling

- unauthenticated: `401` or existing route redirect;
- insufficient role: `403`;
- invalid network or transition: generic `400`;
- missing request: `404`;
- duplicate/conflict: `409`;
- database or mapping failure: generic `500` with no target leakage;
- unavailable capability: explicit non-mutating unavailable state;
- section failure remains local and does not break Phase 1 risk review or Word
  Detection.

## Verification

### SQL

- migration applies in the isolated PostgreSQL-compatible harness;
- constraints, indexes, RLS, grants, defaults, and trigger behavior;
- Owner write, Admin masked read, and denied roles;
- full target absent from Admin result and immutable events;
- valid IPv4, IPv6, CIDR, and rate-limit proposals;
- malformed, private, special-use, and over-broad networks rejected;
- duplicate request ID returns the original result;
- mismatched request-ID reuse rejected;
- concurrent same-target requests create only one effective request;
- legal and illegal status transitions;
- unlinking a block requires an active related record;
- Security Event and Admin Log atomicity;
- 90-day boundary and active-record retention;
- automatic risk and enforcement flags remain false;
- no mutation of `profiles.status` or risk profiles.

### Application

- server service mapping, masking, validation, and fail-closed behavior;
- API role matrix and no-store responses;
- Owner forms and confirmation flow;
- Admin read-only rendering with masked targets;
- unavailable capability rendering;
- section-local loading and failure behavior;
- Vercel link and operation summary contain no credential;
- pagination and status filters;
- mobile and desktop layout;
- retention route authorization;
- Public Changelog contains no internal details.

Final local gates are targeted Vitest, SQL verification, TypeScript, focused
ESLint, production build, and `git diff --check`.

## Delivery and Changelog

Implementation must update:

- `HANDOFF.md`: complete technical state and deployment terminology;
- Admin Changelog: concise internal Security/Operations entry;
- Public Changelog: not applicable.

The implementation may be committed and pushed only after all local gates pass.
Production migration, cron activation, and any Vercel rule publication require
separate readiness review and explicit Production approval.

## Completion Boundary

Phase 2A implementation is complete when the protected request lifecycle,
role-based masking, immutable audit, 90-day anonymization, Admin UI, retention
task, and required tests pass locally.

It does not authorize:

- applying the migration to Production;
- creating or publishing a Production Firewall rule;
- adding a Vercel Access Token to the application;
- enabling automatic risk evaluation or automatic enforcement;
- starting Security Center Phase 2B.
