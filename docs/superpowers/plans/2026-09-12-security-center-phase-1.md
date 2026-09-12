# Security Center Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Owner/Admin-only Security Center foundation with manual resident risk review, immutable audit history, and a convenient view over the existing comment word-detection system.

**Architecture:** Follow the existing VIP security boundary: Cookie-authenticated Admin routes call a server-only service, which uses service-role RPCs whose database functions independently verify the actor. The Security Center owns its feature flags, security events, and current risk profiles; the Word Detection section reuses `comment_moderation_keywords`, `comment_moderation_flags`, and the existing comment-review page without duplicating moderation data or behavior.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase PostgreSQL/RLS/RPC, Zod, Tailwind CSS, Lucide React, Vitest, Testing Library, Supabase SQL tests.

**Spec:** `docs/superpowers/specs/2026-09-12-security-center-phase-1-design.md`

## Global Constraints

- Read `PROJECT_CONTEXT.md`, `HANDOFF.md`, and the linked spec before implementation.
- Preserve the black, restrained, late-night Admin visual language; no bright dashboard palette, charts, gradients, or page-level refresh button.
- Security Center read access is Owner/Admin only; manual risk mutations are Owner only; Moderator, resident, and anonymous access is denied server-side.
- Actor identity comes only from the Cookie Server Session and is verified again by database RPCs.
- `risk_evaluation_enabled` and `automatic_enforcement_enabled` remain `false`.
- Manual risk changes never mutate `profiles.status` and never trigger ban, mute, logout, content removal, or resident notification.
- Reuse the existing comment moderation tables, RLS, rescan RPC, and review page; do not create a second keyword or moderation system.
- Word-detection actions do not create `security_events` or change `security_risk_profiles` in Phase 1.
- No IP, device, VPN, proxy, bot, spam, referral, payment, Relationship, VIP, Mention, Friend, or Auth architecture work.
- Create a new migration; do not modify historical migrations and do not apply the migration to Production in this implementation task.
- Every implementation change updates `HANDOFF.md`; internal changes update Admin Changelog; Public Changelog is not applicable.

## File Map

- Create `supabase/migrations/20260912150000_security_center_foundation.sql`: three security tables, constraints, indexes, initialization trigger, append-only protection, protected read RPCs, and Owner mutation RPC.
- Create `supabase/tests/security_center_foundation.test.sql`: schema, role matrix, append-only, idempotency, audit, and account-status independence tests.
- Create `lib/security/service.ts`: strict application types, RPC mapping, moderation-summary reads, role checks, and risk mutation entry point.
- Create `lib/security/service.test.ts`: mapping, fail-closed, validation, and database-error tests.
- Modify `lib/admin/authorization.ts` and `lib/admin/authorization.test.ts`: add explicit Security Center read/write predicates.
- Create `app/api/admin/security/route.ts` and `.test.ts`: protected overview endpoint.
- Create `app/api/admin/users/[id]/security/route.ts` and `.test.ts`: protected resident detail and Owner mutation endpoint.
- Create `app/admin/security/page.tsx` and `.test.tsx`: server-guarded Security Center route.
- Create `components/admin/security/SecurityCenterClient.tsx` and `.test.tsx`: overview, event pagination, section-local states, and Word Detection composition.
- Create `components/admin/security/WordDetectionSection.tsx` and `.test.tsx`: moderation summary, keyword manager, and full-review link.
- Modify `components/admin/comments/KeywordManager.tsx` and add `.test.tsx`: reusable embedded rendering while preserving the existing panel mode and mutations.
- Modify `app/admin/comments/page.tsx` and `lib/admin/commentModeration.ts`; extend `lib/admin/commentModeration.test.ts`: accept only the `filter=flagged` deep link and preserve the current default.
- Modify `components/AdminSidebar.tsx`: add the Owner/Admin-only Security Center entry.
- Create `components/AdminSidebar.test.tsx`: verify role visibility and active navigation state.
- Create `components/admin/users/UserSecuritySection.tsx` and `.test.tsx`: resident risk state, Owner actions, event history, pagination, and local errors.
- Modify `app/admin/users/[id]/page.tsx`: mount the Security section only for Owner/Admin.
- Modify `lib/admin/changelog.ts` and `HANDOFF.md`: record implementation and migration state internally.

---

### Task 1: Security Database Foundation

**Files:**
- Create: `supabase/migrations/20260912150000_security_center_foundation.sql`
- Create: `supabase/tests/security_center_foundation.test.sql`

**Interfaces:**
- Produces: `security_get_feature_flags()`, `security_admin_get_overview(uuid, integer, integer)`, `security_admin_get_resident(uuid, uuid, integer, integer)`, and `security_owner_apply_risk_action(uuid, uuid, text, text, text, text, text, uuid)`.
- Produces JSON keys consumed by Task 2: `flags`, `risk_counts`, `pending_review_count`, `events`, `profile`, and pagination metadata.

- [ ] **Step 1: Write failing SQL tests for schema, defaults, and initialization**

Create pgTAP assertions that require:

```sql
select has_table('public', 'security_feature_flags');
select has_table('public', 'security_events');
select has_table('public', 'security_risk_profiles');
select col_default_is(
  'public', 'security_risk_profiles', 'risk_level', '''low''::text'
);
select col_default_is(
  'public', 'security_risk_profiles', 'review_status',
  '''no_review_required''::text'
);
select results_eq(
  $$ select count(*) from public.security_risk_profiles $$,
  $$ select count(*) from public.profiles $$,
  'every existing resident has one risk profile'
);
```

Insert an isolated profile fixture and assert its risk row is created as `low + no_review_required` without changing the profile's `status`.

- [ ] **Step 2: Run the SQL test and verify it fails**

Run: `npx supabase test db supabase/tests/security_center_foundation.test.sql`

Expected: FAIL because the security tables and functions do not exist.

- [ ] **Step 3: Add the three tables, constraints, indexes, and triggers**

Ensure `pgcrypto` exists in the `extensions` schema, then use this exact structural contract:

```sql
create extension if not exists pgcrypto with schema extensions;

create table public.security_feature_flags (
  id smallint primary key default 1 check (id = 1),
  security_center_enabled boolean not null default true,
  security_event_collection_enabled boolean not null default true,
  risk_evaluation_enabled boolean not null default false,
  automatic_enforcement_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.security_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  request_fingerprint text not null check (char_length(request_fingerprint) = 64),
  event_type text not null check (event_type in (
    'risk_level_changed',
    'review_marked_pending',
    'review_marked_complete',
    'internal_note_updated'
  )),
  category text not null check (category in (
    'auth', 'account', 'admin', 'moderation', 'permission',
    'relationship', 'vip', 'system'
  )),
  user_id uuid references public.profiles(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  source text not null check (source = 'security_center_manual'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.security_risk_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high', 'critical')),
  review_status text not null default 'no_review_required' check (
    review_status in ('no_review_required', 'pending', 'reviewed')
  ),
  last_event_at timestamptz,
  last_reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Add indexes for `(severity, occurred_at desc)`, `(user_id, occurred_at desc)`, `(review_status, updated_at desc)`, and `(risk_level, updated_at desc)`. Enable RLS on all three tables, revoke table access from `PUBLIC`, `anon`, and `authenticated`, and grant only the service role the minimum table/function access used by the server.

Backfill all `profiles` with `insert ... on conflict do nothing`, and attach an `after insert` profile trigger that inserts only the default risk row. Add an append-only trigger that raises SQLSTATE `42501` for UPDATE or DELETE on `security_events`.

- [ ] **Step 4: Add protected read and mutation RPCs**

Every function must use:

```sql
security definer
set search_path = ''
```

Each Admin read function verifies `p_actor_id` against `public.profiles` with role `owner` or `admin` and status `active` or `warned`. The Owner mutation function requires role `owner` with status `active` or `warned` and validates:

```text
p_action: set_risk | set_review | set_note
p_risk_level: low | medium | high | critical when action=set_risk
p_review_status: no_review_required | pending | reviewed when action=set_review
p_note: null or at most 2000 characters when action=set_note
p_reason: trimmed, 1..500 characters
p_request_id: non-null UUID
```

Use `pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0))`. Compute `request_fingerprint` with `encode(extensions.digest(canonical_payload::text, 'sha256'), 'hex')`, where the canonical JSON object contains actor, target, action, normalized risk/review values, the exact normalized note value, and reason. Read an existing event with the request ID and return its prior result only when the stored fingerprint matches. Reject mismatched reuse. Lock the target risk row `for update`, update only `security_risk_profiles`, insert one `security_events` row without copying note text into metadata, and insert one `admin_logs` row in the same transaction.

Read RPCs remain available to authorized actors so the page can report disabled flags. The mutation RPC rejects all writes unless both `security_center_enabled` and `security_event_collection_enabled` are true. It never consults or enables the automatic evaluation/enforcement flags.

Apply state transitions exactly as follows:

```text
set_risk: change only risk_level; preserve review fields and note
set_review pending: set review_status=pending and clear last_reviewed_at/reviewed_by
set_review reviewed: set review_status=reviewed, last_reviewed_at=now, reviewed_by=actor
set_review no_review_required: set review_status=no_review_required and clear last_reviewed_at/reviewed_by
set_note: change only notes after converting an empty trimmed value to null
all actions: set last_event_at=now and updated_at=now
```

Map actions to event types `risk_level_changed`, `review_marked_pending`, `review_marked_complete`, and `internal_note_updated`. Use category `admin`, the resulting profile risk level as severity, and metadata containing only old/new risk and review states plus `note_changed: true` for note actions. Write Admin Log actions `security_set_risk`, `security_set_review`, or `security_set_note`; include target, action, reason, and request ID, but never note text.

The overview RPC returns bounded event pages and current counts. The resident RPC returns one profile plus bounded resident events. Enforce page size `1..100`; application code will request 20 for overview and 10 for resident history.

- [ ] **Step 5: Extend SQL tests for security and behavior**

Add exact assertions for:

```text
Owner: overview read, resident read, mutation allowed
Admin: overview read, resident read, mutation denied
Moderator/user/anonymous: all Security Center access denied
security_events: direct insert/update/delete denied outside service role
identical request_id retry: one event, one admin log, same result
mismatched request_id reuse: rejected
set_risk: risk changes, profiles.status unchanged
set_review reviewed: last_reviewed_at and reviewed_by set
set_note: note stored only in risk profile, absent from event metadata/admin log
all automatic flags: false
```

- [ ] **Step 6: Run the SQL test and verify it passes**

Run: `npx supabase test db supabase/tests/security_center_foundation.test.sql`

Expected: PASS with all planned assertions and rolled-back fixtures.

- [ ] **Step 7: Commit the database foundation**

```bash
git add supabase/migrations/20260912150000_security_center_foundation.sql supabase/tests/security_center_foundation.test.sql
git commit -m "feat(db): add security center foundation"
```

---

### Task 2: Authorization and Server Security Service

**Files:**
- Modify: `lib/admin/authorization.ts`
- Modify: `lib/admin/authorization.test.ts`
- Create: `lib/security/service.ts`
- Create: `lib/security/service.test.ts`

**Interfaces:**
- Produces: `canViewSecurityCenter(role)`, `canManageSecurityRisk(role)`.
- Produces: `getSecurityOverview(page)`, `getResidentSecurity(userId, page)`, and `applyResidentSecurityAction(userId, input)`.
- Produces: `SecurityOverview`, `ResidentSecurityOverview`, `SecurityRiskActionInput`, and `SecurityServiceError`.

- [ ] **Step 1: Write failing authorization tests**

Add matrix tests:

```ts
it.each([
  ["owner", true],
  ["admin", true],
  ["moderator", false],
  ["user", false],
  [null, false],
])("allows Security Center reads for %s: %s", (role, expected) => {
  expect(canViewSecurityCenter(role)).toBe(expected);
});

it.each([
  ["owner", true],
  ["admin", false],
  ["moderator", false],
  ["user", false],
  [null, false],
])("allows Security Center writes for %s: %s", (role, expected) => {
  expect(canManageSecurityRisk(role)).toBe(expected);
});
```

- [ ] **Step 2: Run the authorization test and verify it fails**

Run: `npm test -- lib/admin/authorization.test.ts`

Expected: FAIL because both helpers are missing.

- [ ] **Step 3: Implement the two role predicates**

```ts
export function canViewSecurityCenter(role: unknown): boolean {
  return role === "owner" || role === "admin";
}

export function canManageSecurityRisk(role: unknown): boolean {
  return role === "owner";
}
```

- [ ] **Step 4: Write failing service tests**

Mock `getAdminActor` and an injected RPC/query client. Cover valid snake-case mapping, invalid UUID/page/action rejection, Owner/Admin read rules, Owner-only mutation, fail-closed flags, bounded moderation summary, and generic database errors. Assert recent matches are limited to five and contain only:

```ts
type WordDetectionMatch = {
  commentId: string;
  residentId: string;
  username: string | null;
  matchedKeywords: string[];
  detectedAt: string;
};
```

- [ ] **Step 5: Run the service tests and verify they fail**

Run: `npm test -- lib/security/service.test.ts`

Expected: FAIL because `lib/security/service.ts` does not exist.

- [ ] **Step 6: Implement strict service types and mapping**

Define:

```ts
export type SecurityRiskLevel = "low" | "medium" | "high" | "critical";
export type SecurityReviewStatus =
  | "no_review_required"
  | "pending"
  | "reviewed";

export type SecurityFeatureFlags = {
  securityCenterEnabled: boolean;
  securityEventCollectionEnabled: boolean;
  riskEvaluationEnabled: boolean;
  automaticEnforcementEnabled: boolean;
};

export type SecurityEvent = {
  id: string;
  eventType:
    | "risk_level_changed"
    | "review_marked_pending"
    | "review_marked_complete"
    | "internal_note_updated";
  userId: string | null;
  username: string | null;
  actorId: string | null;
  actorUsername: string | null;
  severity: SecurityRiskLevel;
  occurredAt: string;
  metadata: Record<string, unknown>;
};

export type PagedSecurityEvents = {
  items: SecurityEvent[];
  total: number;
  page: number;
  pageSize: number;
};

export type WordDetectionMatch = {
  commentId: string;
  residentId: string;
  username: string | null;
  matchedKeywords: string[];
  detectedAt: string;
};

export type SecurityOverview = {
  flags: SecurityFeatureFlags;
  pendingReviewCount: number;
  riskCounts: Record<"low" | "medium" | "high" | "critical", number>;
  events: PagedSecurityEvents;
  wordDetection:
    | { available: true; activeKeywords: number; inactiveKeywords: number; pendingComments: number; recentMatches: WordDetectionMatch[] }
    | { available: false };
};

export type ResidentSecurityOverview = {
  profile: {
    userId: string;
    riskLevel: SecurityRiskLevel;
    reviewStatus: SecurityReviewStatus;
    lastEventAt: string | null;
    lastReviewedAt: string | null;
    reviewedBy: string | null;
    notes: string | null;
    updatedAt: string;
  };
  events: PagedSecurityEvents;
};

export type SecurityRiskActionInput =
  | { action: "set_risk"; riskLevel: SecurityRiskLevel; reason: string; requestId: string }
  | { action: "set_review"; reviewStatus: SecurityReviewStatus; reason: string; requestId: string }
  | { action: "set_note"; note: string | null; reason: string; requestId: string };

export class SecurityServiceError extends Error {
  constructor(
    public readonly kind:
      | "invalid_input"
      | "forbidden"
      | "not_found"
      | "internal",
    message: string
  ) {
    super(message);
    this.name = "SecurityServiceError";
  }
}

type SecurityDataClient = Pick<typeof supabaseAdmin, "rpc" | "from">;

export declare function getSecurityOverview(
  page?: number,
  client?: SecurityDataClient
): Promise<SecurityOverview>;

export declare function getResidentSecurity(
  userId: string,
  page?: number,
  client?: SecurityDataClient
): Promise<ResidentSecurityOverview>;

export declare function applyResidentSecurityAction(
  userId: string,
  input: SecurityRiskActionInput,
  client?: SecurityDataClient
): Promise<ResidentSecurityOverview>;
```

Start the module with `import "server-only"`. Validate all RPC objects and enum values before returning them. Missing/malformed feature flags map to all-disabled values. Security reads require Owner/Admin; mutations require Owner. Actor IDs come from `getAdminActor()` and are passed to RPCs as `p_actor_id`.

For the word summary, issue bounded service-role queries: exact counts for active/inactive keywords and pending flags, five pending flags ordered by `detected_at desc`, then one comments/profile lookup using the five comment IDs. Use `Promise.allSettled`; if any moderation query fails, return `{ available: false }` without discarding the security overview.

- [ ] **Step 7: Run focused tests**

Run: `npm test -- lib/admin/authorization.test.ts lib/security/service.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit the authorization and service layer**

```bash
git add lib/admin/authorization.ts lib/admin/authorization.test.ts lib/security/service.ts lib/security/service.test.ts
git commit -m "feat(security): add protected security service"
```

---

### Task 3: Protected Security APIs

**Files:**
- Create: `app/api/admin/security/route.ts`
- Create: `app/api/admin/security/route.test.ts`
- Create: `app/api/admin/users/[id]/security/route.ts`
- Create: `app/api/admin/users/[id]/security/route.test.ts`

**Interfaces:**
- Consumes: Task 2 authorization helpers and service methods.
- Produces: `GET /api/admin/security?page=1` and `GET|POST /api/admin/users/[id]/security?page=1`.

- [ ] **Step 1: Write failing route tests**

For both routes, mock `getAdminActor`, role predicates, and the service. Assert status matrices:

```text
no actor -> 401
Moderator/user -> 403
invalid UUID/page/body -> 400
missing resident -> 404
service failure -> generic 500
Owner/Admin GET -> 200 and private no-store
Owner POST -> 200
Admin POST -> 403
```

Also assert rejected requests never call the service.

- [ ] **Step 2: Run the route tests and verify they fail**

Run: `npm test -- app/api/admin/security/route.test.ts app/api/admin/users/[id]/security/route.test.ts`

Expected: FAIL because the routes do not exist.

- [ ] **Step 3: Implement overview GET**

Use `z.coerce.number().int().min(1).max(1_000_000)` for `page`, call `getAdminActor()`, enforce `canViewSecurityCenter`, and return:

```ts
NextResponse.json(
  { overview },
  { headers: { "Cache-Control": "private, no-store" } }
);
```

- [ ] **Step 4: Implement resident GET and Owner POST**

Validate the route UUID with `z.uuid()`. Use a strict discriminated union matching `SecurityRiskActionInput`, with `reason` trimmed to `1..500`, note limited to `2000`, and `requestId` as UUID. Map `SecurityServiceError` kinds to 400/403/404; log only an internal operation label on 500 and return `Security service unavailable`.

- [ ] **Step 5: Run route and service tests**

Run: `npm test -- app/api/admin/security/route.test.ts app/api/admin/users/[id]/security/route.test.ts lib/security/service.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the API boundary**

```bash
git add app/api/admin/security app/api/admin/users/[id]/security
git commit -m "feat(security): add protected admin security APIs"
```

---

### Task 4: Security Center Route, Navigation, and Overview

**Files:**
- Create: `app/admin/security/page.tsx`
- Create: `app/admin/security/page.test.tsx`
- Create: `components/admin/security/SecurityCenterClient.tsx`
- Create: `components/admin/security/SecurityCenterClient.test.tsx`
- Modify: `components/AdminSidebar.tsx`
- Create: `components/AdminSidebar.test.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/security?page=N` and `SecurityOverview`.
- Produces: Owner/Admin-only `/admin/security` and an internal Sidebar entry.

- [ ] **Step 1: Write failing page-guard and Sidebar tests**

Mock `getAdminActor` and `redirect`. Assert Owner/Admin render `SecurityCenterClient`, anonymous redirects to `/`, and Moderator/user redirect to `/admin/homepage`. Extend Sidebar coverage so `安全中心` appears only for Owner/Admin and is active on `/admin/security`.

- [ ] **Step 2: Run guard tests and verify they fail**

Run: `npm test -- app/admin/security/page.test.tsx components/AdminSidebar.test.tsx`

Expected: FAIL because the route and link are missing. If `AdminSidebar.test.tsx` does not yet exist, create it with mocked browser Supabase role/count queries.

- [ ] **Step 3: Implement the server-guarded page and navigation entry**

The page follows the Admin Changelog guard:

```tsx
const actor = await getAdminActor();
if (!actor) redirect("/");
if (!canViewSecurityCenter(actor.role)) redirect("/admin/homepage");
return <SecurityCenterClient currentRole={actor.role} />;
```

Add a Lucide `ShieldCheck` entry labeled `安全中心` to `internalLinks`; keep `internalLinks` behind the existing `isAdmin` condition.

- [ ] **Step 4: Write failing overview component tests**

Mock `fetch` and verify:

```text
loading copy appears first
five risk/review metrics render from mapped values
four feature flags render without mutation controls
recent events render with resident, action, risk, state, and time
event pagination requests the selected page
empty state is explicit
overview failure shows a local retry command
no page-level refresh button exists
```

- [ ] **Step 5: Run the component test and verify it fails**

Run: `npm test -- components/admin/security/SecurityCenterClient.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 6: Implement the compact overview**

Create a client component that fetches with `{ cache: "no-store", credentials: "same-origin" }`. Render neutral metric blocks for `待复核`, `低风险`, `中风险`, `高风险`, and `严重风险`, a compact feature-state row, and a bounded event table. Use small amber/red accents only for status; do not add charts, gradients, large hero text, or a manual page-level refresh button.

- [ ] **Step 7: Run focused UI tests**

Run: `npm test -- app/admin/security/page.test.tsx components/admin/security/SecurityCenterClient.test.tsx components/AdminSidebar.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit the Security Center shell**

```bash
git add app/admin/security components/admin/security/SecurityCenterClient.tsx components/admin/security/SecurityCenterClient.test.tsx components/AdminSidebar.tsx components/AdminSidebar.test.tsx
git commit -m "feat(admin): add security center overview"
```

---

### Task 5: Reuse Existing Word Detection in Security Center

**Files:**
- Modify: `components/admin/comments/KeywordManager.tsx`
- Create: `components/admin/comments/KeywordManager.test.tsx`
- Create: `components/admin/security/WordDetectionSection.tsx`
- Create: `components/admin/security/WordDetectionSection.test.tsx`
- Modify: `components/admin/security/SecurityCenterClient.tsx`
- Modify: `components/admin/security/SecurityCenterClient.test.tsx`
- Modify: `lib/admin/commentModeration.ts`
- Modify: `lib/admin/commentModeration.test.ts`
- Modify: `app/admin/comments/page.tsx`

**Interfaces:**
- Consumes: `SecurityOverview.wordDetection` and existing Supabase keyword mutations.
- Produces: `KeywordManager` prop `displayMode?: "panel" | "embedded"` and `parseCommentFilter(value)`.

- [ ] **Step 1: Write failing filter and KeywordManager regression tests**

Add parser expectations:

```ts
expect(parseCommentFilter("flagged")).toBe("flagged");
expect(parseCommentFilter("today")).toBe("today");
expect(parseCommentFilter("deleted")).toBe("today");
expect(parseCommentFilter(null)).toBe("today");
```

The deep link intentionally accepts only `flagged`; it does not expose arbitrary Admin filters through URL state.

For `KeywordManager`, assert panel mode keeps its close button and embedded mode omits it while retaining add, toggle, delete, and rescan calls against the existing tables/RPC.

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `npm test -- lib/admin/commentModeration.test.ts components/admin/comments/KeywordManager.test.tsx`

Expected: FAIL because the parser and embedded mode are missing.

- [ ] **Step 3: Add the narrow comment-filter deep link**

Implement:

```ts
export function parseCommentFilter(value: string | null): "today" | "flagged" {
  return value === "flagged" ? "flagged" : "today";
}
```

On the client comment page, read `window.location.search` once after mount and set the filter through this parser. Existing button-driven filters continue unchanged.

- [ ] **Step 4: Make KeywordManager reusable without duplicating behavior**

Extend props:

```ts
type Props = {
  open: boolean;
  canManage: boolean;
  onClose: () => void;
  onChanged: () => Promise<void>;
  displayMode?: "panel" | "embedded";
};
```

Default to `panel`. In `embedded` mode, render continuously when `open` is true, omit only the close icon, and use the same fetch/add/toggle/delete/rescan functions and existing RLS-protected browser client.

- [ ] **Step 5: Write failing Word Detection section tests**

Assert the section displays active/inactive/pending counts, at most five recent matches, an unavailable state isolated from the rest of Security Center, the embedded keyword manager, and a link with exact href `/admin/comments?filter=flagged`. Assert it renders no full comment body and no hide/delete/review actions.

- [ ] **Step 6: Implement WordDetectionSection and compose it into SecurityCenterClient**

Use the exact section heading `词语检测` and supporting copy explaining that matches enter manual review and are not automatically hidden or punished. Render keyword chips through the existing manager. After a successful word-library mutation/rescan, re-fetch the current overview page so summary counts update. Label the review command `前往评论管理` with a right-arrow icon.

- [ ] **Step 7: Run moderation and Security Center regression tests**

Run: `npm test -- lib/admin/commentModeration.test.ts components/admin/comments/KeywordManager.test.tsx components/admin/security/WordDetectionSection.test.tsx components/admin/security/SecurityCenterClient.test.tsx`

Expected: PASS, including proof that both pages operate on the same table/RPC names.

- [ ] **Step 8: Commit the Word Detection integration**

```bash
git add components/admin/comments/KeywordManager.tsx components/admin/comments/KeywordManager.test.tsx components/admin/security/WordDetectionSection.tsx components/admin/security/WordDetectionSection.test.tsx components/admin/security/SecurityCenterClient.tsx components/admin/security/SecurityCenterClient.test.tsx lib/admin/commentModeration.ts lib/admin/commentModeration.test.ts app/admin/comments/page.tsx
git commit -m "feat(admin): surface word detection in security center"
```

---

### Task 6: Resident Detail Security Review

**Files:**
- Create: `components/admin/users/UserSecuritySection.tsx`
- Create: `components/admin/users/UserSecuritySection.test.tsx`
- Modify: `app/admin/users/[id]/page.tsx`

**Interfaces:**
- Consumes: `GET|POST /api/admin/users/[id]/security?page=N`.
- Produces: isolated Security section for Owner/Admin with Owner-only mutations.

- [ ] **Step 1: Write failing component tests**

Cover:

```text
loading and local unavailable states
current risk/review/account status remain visibly separate
last event, last review, note, and paginated event history
Owner sees risk/review/note controls
Admin sees the same data without mutation controls
every Owner mutation requires a non-empty reason
request retry reuses the same generated requestId until success
successful mutation reloads the current page
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- components/admin/users/UserSecuritySection.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the isolated section**

Use props:

```ts
type Props = {
  userId: string;
  username: string | null;
  accountStatus: string | null;
  currentRole: string | null;
};
```

Fetch with same-origin credentials and no-store. Use a select for risk level, a segmented choice for review state, and a bounded textarea for the internal note. Require a separate reason input before POST. Generate `crypto.randomUUID()` once per pending action and clear it only after success. Keep retry controls local to the section.

- [ ] **Step 4: Mount it only for Owner/Admin**

Place `UserSecuritySection` alongside existing Relationship and VIP sections:

```tsx
{(currentRole === "owner" || currentRole === "admin") && (
  <UserSecuritySection
    key={`security-${id}`}
    userId={id}
    username={profile.username}
    accountStatus={profile.status}
    currentRole={currentRole}
  />
)}
```

Do not alter the Resident Detail page's existing Moderator access or other controls.

- [ ] **Step 5: Run resident detail and API tests**

Run: `npm test -- components/admin/users/UserSecuritySection.test.tsx app/api/admin/users/[id]/security/route.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the resident review UI**

```bash
git add components/admin/users/UserSecuritySection.tsx components/admin/users/UserSecuritySection.test.tsx app/admin/users/[id]/page.tsx
git commit -m "feat(admin): add resident security review section"
```

---

### Task 7: Documentation, Changelog, and Final Verification

**Files:**
- Modify: `HANDOFF.md`
- Modify: `lib/admin/changelog.ts`

**Interfaces:**
- Consumes: completed Tasks 1-6 and their verification evidence.
- Produces: accurate technical handoff and internal-only release record.

- [ ] **Step 1: Update HANDOFF with exact delivery state**

Record:

```text
Security Center Phase 1 implementation: complete locally
Security migration: created, not applied to Production
Security Center access: Owner/Admin read, Owner write
Automatic evaluation/enforcement: off
Word Detection: reuses existing moderation tables and review page
Public Changelog: not applicable
Deployment: pending until commit/push and Vercel verification
```

List migration, RPCs, APIs, UI files, tests, known limitations, and the explicit Production approval gate.

- [ ] **Step 2: Add an internal Admin Changelog entry**

Add a `Security` entry with resident-safe operational wording:

```ts
{
  date: "2026-09-12",
  phase: "Security Center Phase 1",
  title: "建立安全中心与人工复核基础",
  category: "Security",
  scope: "后台安全中心、居民管理房间与评论检测词库",
  status: "本地完成，待部署",
  summary:
    "新增受保护的风险状态与人工复核记录，并把现有评论检测词库、待检查摘要及评论管理入口集中到安全中心。自动风险判断与自动处置仍保持关闭。",
}
```

Do not add this internal architecture to `lib/changelog/public.ts`.

- [ ] **Step 3: Run all targeted tests**

```bash
npm test -- lib/admin/authorization.test.ts lib/security/service.test.ts app/api/admin/security/route.test.ts app/api/admin/users/[id]/security/route.test.ts app/admin/security/page.test.tsx components/AdminSidebar.test.tsx components/admin/security/SecurityCenterClient.test.tsx components/admin/security/WordDetectionSection.test.tsx components/admin/comments/KeywordManager.test.tsx lib/admin/commentModeration.test.ts components/admin/users/UserSecuritySection.test.tsx lib/changelog/separation.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run static and build gates**

```bash
npx tsc --noEmit
npx eslint lib/security lib/admin/authorization.ts app/api/admin/security app/api/admin/users/[id]/security app/admin/security components/AdminSidebar.tsx components/admin/security components/admin/comments/KeywordManager.tsx app/admin/comments/page.tsx components/admin/users/UserSecuritySection.tsx app/admin/users/[id]/page.tsx
npm run build
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 5: Verify migration and scope boundaries**

Run:

```bash
rg -n "risk_evaluation_enabled|automatic_enforcement_enabled" supabase/migrations/20260912150000_security_center_foundation.sql
rg -n "comment_moderation_keywords|comment_moderation_flags" supabase/migrations/20260912150000_security_center_foundation.sql
git status --short
git diff --stat origin/main...HEAD
```

Expected: both automatic flags are inserted as false; the new migration does not create or alter comment moderation tables; only planned Security Center, comment integration, tests, HANDOFF, and Admin Changelog files changed.

- [ ] **Step 6: Commit documentation**

```bash
git add HANDOFF.md lib/admin/changelog.ts
git commit -m "docs: record security center phase 1"
```

- [ ] **Step 7: Push implementation without applying Production migration**

```bash
git push origin main
```

After push, report the commit range and state explicitly as `implemented`, `committed`, and `pushed`; keep `migration applied`, `deployed`, and `production verified` separate and accurate.

## Final Acceptance Checklist

- [ ] Owner/Admin can enter `/admin/security`; Moderator/resident/anonymous cannot.
- [ ] Owner can mutate risk/review/note; Admin is read-only.
- [ ] Risk mutation is idempotent and atomically records one immutable event plus one admin log.
- [ ] Risk changes never change `profiles.status`.
- [ ] Automatic evaluation and enforcement flags remain off.
- [ ] Word Detection uses the existing keyword and flag records.
- [ ] Security Center shows word counts, pending count, five recent matches, keyword controls, and the full-review link.
- [ ] `/admin/comments?filter=flagged` opens the original pending-review workflow.
- [ ] Original Comment Management behavior remains intact.
- [ ] No internal Security Center details leak to Public Changelog or public APIs.
- [ ] Migration remains unapplied to Production.
- [ ] Targeted tests, TypeScript, focused ESLint, build, and `git diff --check` pass.
