# Security Center Phase 2A Manual Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Owner-controlled, Admin-readable workflow for preparing and auditing IP/CIDR Firewall operations and rate-limit observation proposals without giving Our Little Age permission to publish Vercel Firewall changes.

**Architecture:** Extend the existing Security Center with a new protected `security_firewall_requests` lifecycle. A focused server-only Firewall service calls service-role-only RPCs that independently verify the actor, atomically write the request plus immutable Security Event and Admin Log, and return full targets only to Owner; Vercel remains the external source of truth and final publication surface.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase PostgreSQL 17/RLS/RPC, Zod 4, `ipaddr.js` 2.5.0, Tailwind CSS, Lucide React, Vitest, Testing Library, Supabase SQL tests, Vercel Cron.

**Spec:** `docs/superpowers/specs/2026-09-24-security-center-phase-2a-design.md`

## Global Constraints

- Read `PROJECT_CONTEXT.md`, `HANDOFF.md`, and the linked spec before implementation.
- Preserve the existing black, restrained, late-night Admin language; no bright analytics dashboard, gradients, or page-level refresh button.
- `Ban Resident != Block IP`; Firewall operations never mutate `profiles.status` or `security_risk_profiles`.
- Keep `risk_evaluation_enabled = false` and `automatic_enforcement_enabled = false`.
- Owner may read full retained network targets and perform lifecycle mutations.
- Admin is read-only and receives masked targets only.
- Moderator, resident, and anonymous access is denied at page, API, RPC, grant, and RLS boundaries.
- Vercel is the source of truth for live rules and traffic. The app records Owner-manually-confirmed state and labels it honestly.
- Do not store or request a Vercel Access Token. Do not call Vercel mutation APIs or CLI from application code.
- Do not collect visitor IPs, device identifiers, tokens, cookies, passwords, or resident-to-IP associations.
- Ended records retain full targets for 90 days, then anonymize the full target while preserving masked audit history.
- Create a new forward migration. Do not edit historical migrations and do not apply anything to Production in this implementation task.
- Every implemented change updates `HANDOFF.md` and Admin Changelog. Public Changelog is not applicable.
- Production migration, Cron activation, and Vercel publication require separate readiness and approval tasks.

## File Map

- Modify `package.json` and `package-lock.json`: add the server-side network parser `ipaddr.js@2.5.0`.
- Create `lib/security/network.ts`: normalize, classify, breadth-check, and mask IPv4/IPv6 targets.
- Create `lib/security/network.test.ts`: public/special-use, CIDR breadth, canonicalization, and masking tests.
- Create `supabase/migrations/20260924130000_security_firewall_operations.sql`: protected request table, event vocabulary extension, RPCs, RLS/grants, lifecycle transitions, and retention cleanup.
- Create `supabase/tests/security_firewall_operations.test.sql`: schema, permissions, lifecycle, idempotency, concurrency, masking, audit, and 90-day retention verification.
- Modify `lib/security/service.ts` and `lib/security/service.test.ts`: accept Phase 2A event types without breaking the Phase 1 overview.
- Create `lib/security/firewall.ts`: strict Firewall request types, RPC mapping, role checks, and mutation methods.
- Create `lib/security/firewall.test.ts`: mapping, Owner/Admin visibility, validation, generic errors, and RPC parameter tests.
- Modify `lib/admin/authorization.ts` and its tests: add explicit Owner-only Firewall mutation predicate.
- Create `app/api/admin/security/firewall/route.ts` and `.test.ts`: protected list/create endpoint.
- Create `app/api/admin/security/firewall/[id]/route.ts` and `.test.ts`: protected lifecycle transition endpoint.
- Create `components/admin/security/FirewallRequestForm.tsx` and `.test.tsx`: structured Owner form and operation summary.
- Create `components/admin/security/TrafficProtectionSection.tsx` and `.test.tsx`: local loading/error state, role-aware list, filters, pagination, and confirmations.
- Modify `components/admin/security/SecurityCenterClient.tsx` and `.test.tsx`: compose Traffic Protection without coupling it to Phase 1 overview failures.
- Create `app/api/cron/security-firewall-retention/route.ts` and `.test.ts`: authenticated daily anonymization entry point.
- Modify `vercel.json`: schedule the narrow retention route once daily.
- Modify `lib/admin/changelog.ts`, `HANDOFF.md`, and the spec status: record implementation without exposing internal details publicly.

---

### Task 1: Public Network Validation Boundary

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `lib/security/network.ts`
- Create: `lib/security/network.test.ts`

**Interfaces:**
- Produces: `parsePublicNetworkTarget(input: string, kind: "block_ip" | "block_cidr"): ParsedNetworkTarget`.
- Produces: `normalizeFirewallHostname(input: string): FirewallHostname`.
- Produces:

```ts
export type FirewallHostname =
  | "ourlittleage.com"
  | "www.ourlittleage.com";

export type ParsedNetworkTarget = {
  normalized: string;
  masked: string;
  family: 4 | 6;
  prefixLength: number;
};

export class NetworkTargetError extends Error {}
```

- Consumes: no Security Center database or UI code.

- [ ] **Step 1: Add the pinned parser dependency**

Run:

```bash
npm install ipaddr.js@2.5.0
```

Expected: `package.json` contains `"ipaddr.js": "^2.5.0"` and the lockfile records version 2.5.0.

- [ ] **Step 2: Write failing network tests**

Create tests that assert these exact behaviors:

```ts
expect(parsePublicNetworkTarget("8.8.8.8", "block_ip")).toEqual({
  normalized: "8.8.8.8/32",
  masked: "8.8.x.x/32",
  family: 4,
  prefixLength: 32,
});

expect(parsePublicNetworkTarget("1.1.1.0/24", "block_cidr")).toEqual({
  normalized: "1.1.1.0/24",
  masked: "1.1.x.x/24",
  family: 4,
  prefixLength: 24,
});

expect(
  parsePublicNetworkTarget("2606:4700:4700::1111", "block_ip")
).toMatchObject({ family: 6, prefixLength: 128 });

expect(() => parsePublicNetworkTarget("10.0.0.1", "block_ip")).toThrow(
  NetworkTargetError
);
expect(() => parsePublicNetworkTarget("127.0.0.1", "block_ip")).toThrow(
  NetworkTargetError
);
expect(() => parsePublicNetworkTarget("1.1.0.0/16", "block_cidr")).toThrow(
  NetworkTargetError
);
expect(() =>
  parsePublicNetworkTarget("2606:4700::/32", "block_cidr")
).toThrow(NetworkTargetError);
expect(() => parsePublicNetworkTarget("8.8.8.8/24", "block_ip")).toThrow(
  NetworkTargetError
);
expect(normalizeFirewallHostname("www.ourlittleage.com")).toBe(
  "www.ourlittleage.com"
);
expect(() => normalizeFirewallHostname("preview.vercel.app")).toThrow(
  NetworkTargetError
);
```

Also reject empty input, malformed addresses, unspecified, loopback, private,
carrier-grade NAT, link-local, documentation, reserved, and multicast ranges.

- [ ] **Step 3: Run the test and verify it fails**

Run:

```bash
npx vitest run lib/security/network.test.ts
```

Expected: FAIL because `lib/security/network.ts` does not exist.

- [ ] **Step 4: Implement the parser and masker**

Use `ipaddr.js` parsing instead of hand-written address parsing:

```ts
import * as ipaddr from "ipaddr.js";

const allowedHosts = new Set<FirewallHostname>([
  "ourlittleage.com",
  "www.ourlittleage.com",
]);

const minimumPrefix = { 4: 24, 6: 48 } as const;

export function parsePublicNetworkTarget(
  input: string,
  kind: "block_ip" | "block_cidr"
): ParsedNetworkTarget {
  const trimmed = input.trim();
  const hasPrefix = trimmed.includes("/");
  if ((kind === "block_ip" && hasPrefix) || (kind === "block_cidr" && !hasPrefix)) {
    throw new NetworkTargetError("Invalid network target");
  }

  const [address, prefix] = hasPrefix
    ? ipaddr.parseCIDR(trimmed)
    : [ipaddr.parse(trimmed), undefined];
  const family = address.kind() === "ipv4" ? 4 : 6;
  const prefixLength = prefix ?? (family === 4 ? 32 : 128);

  if (address.range() !== "unicast") {
    throw new NetworkTargetError("Public network required");
  }
  if (kind === "block_cidr" && prefixLength < minimumPrefix[family]) {
    throw new NetworkTargetError("Network range is too broad");
  }

  return {
    normalized: `${address.toString()}/${prefixLength}`,
    masked: maskAddress(address, prefixLength),
    family,
    prefixLength,
  };
}
```

Catch parser exceptions and rethrow only `NetworkTargetError("Invalid network target")`. Mask IPv4 to the first two octets and IPv6 to the first two hextets; never return the original full target in the masked field.

- [ ] **Step 5: Run focused tests and type checking**

Run:

```bash
npx vitest run lib/security/network.test.ts
npx tsc --noEmit
```

Expected: PASS; TypeScript accepts the bundled `ipaddr.js` declarations.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/security/network.ts lib/security/network.test.ts
git commit -m "feat(security): validate firewall network targets"
```

---

### Task 2: Firewall Request Database Lifecycle

**Files:**
- Create: `supabase/migrations/20260924130000_security_firewall_operations.sql`
- Create: `supabase/tests/security_firewall_operations.test.sql`

**Interfaces:**
- Consumes: normalized targets and masked values from Task 1, sent as RPC parameters.
- Produces: `security_admin_get_firewall_requests(uuid,integer,integer,text)`.
- Produces: `security_owner_create_firewall_request(uuid,uuid,text,text,text,uuid,text,text,text,integer,integer,text,text)`.
- Produces: `security_owner_transition_firewall_request(uuid,uuid,uuid,text,text,text)`.
- Produces: `security_cleanup_firewall_targets(integer)`.
- Produces JSON keys consumed by Task 3: `items`, `total`, `page`, `page_size`, `idempotent`, and `request`.

- [ ] **Step 1: Write the failing SQL contract**

Start the SQL test with a transaction and the same `assert_true` helper pattern as `security_center_foundation.test.sql`. Require:

```sql
select security_firewall_test.assert_true(
  to_regclass('public.security_firewall_requests') is not null,
  'Firewall request table exists'
);

select security_firewall_test.assert_true(
  (select relrowsecurity
   from pg_class
   where oid = 'public.security_firewall_requests'::regclass),
  'Firewall request table has RLS enabled'
);

select security_firewall_test.assert_true(
  not has_table_privilege(
    'authenticated', 'public.security_firewall_requests', 'select'
  )
  and not has_table_privilege(
    'anon', 'public.security_firewall_requests', 'select'
  ),
  'Browser roles cannot read Firewall requests directly'
);
```

Create Owner, Admin, Moderator, resident, muted Owner, and banned Owner fixtures. Cover:

- Owner create and full-target read;
- Admin masked read with `target_network` absent/null;
- Moderator/resident/anonymous denial;
- Admin mutation denial;
- muted/banned Owner mutation denial;
- IPv4 `/24`, IPv6 `/48`, exact host targets, and approved hostnames;
- private, special-use, broad, malformed, and unapproved hostname rejection;
- rate-limit path/method/window/threshold/action constraints;
- identical request-ID retry returns `idempotent = true`;
- reused request ID with changed parameters is rejected;
- same retained target/host cannot create concurrent awaiting or active blocks;
- create writes exactly one Firewall row, Security Event, and Admin Log;
- audit metadata contains `target_masked` and `target_reference`, never `target_network`;
- transition matrix and external rule ID validation;
- unblock links to one active block and resolves both records atomically;
- active blocks cannot be cancelled or directly resolved;
- rate-limit observation may be completed after manual activation;
- failed/cancelled/resolved target retention at 89 days and anonymization at 90 days;
- active and awaiting records are never anonymized;
- flags remain off and no profile status/risk data changes;
- rollback when event or admin log insertion is forced to fail.

- [ ] **Step 2: Run the SQL test and verify it fails**

Run:

```bash
npx supabase test db supabase/tests/security_firewall_operations.test.sql
```

Expected: FAIL because the table and RPCs do not exist.

- [ ] **Step 3: Create the protected table and constraints**

Create the table with this fixed vocabulary and shape:

```sql
create table public.security_firewall_requests (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  request_fingerprint text not null,
  target_reference uuid not null default gen_random_uuid(),
  request_type text not null,
  status text not null default 'awaiting_external_publish',
  target_network inet,
  target_masked text,
  hostname_scope text,
  related_request_id uuid references public.security_firewall_requests(id),
  path_match_mode text,
  path_pattern text,
  http_method text,
  window_seconds integer,
  request_threshold integer,
  proposed_followup_action text,
  reason text not null,
  requested_by uuid not null,
  external_rule_id text,
  confirmed_by uuid,
  confirmed_at timestamptz,
  resolved_at timestamptz,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Use constraints for:

```sql
request_type in ('block_ip','block_cidr','unblock','rate_limit_observation')
status in ('awaiting_external_publish','active','resolved','cancelled','failed')
hostname_scope in ('ourlittleage.com','www.ourlittleage.com')
path_match_mode in ('exact','prefix')
http_method in ('GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS')
window_seconds between 10 and 3600
request_threshold between 10 and 100000
proposed_followup_action in ('rate_limit','challenge','deny')
```

Require IPv4 CIDR prefix `>= 24`, IPv6 prefix `>= 48`, exact IP masks `/32` or `/128`, target fields only for network requests, rate fields only for observation requests, and an active-state external rule ID. Use historical actor UUIDs without profile foreign keys, matching existing immutable audit lifecycle rules.

- [ ] **Step 4: Add RLS, indexes, and safe event vocabulary extension**

Enable RLS; revoke all table privileges from `PUBLIC`, `anon`, and `authenticated`; do not add browser policies. Add indexes for:

```sql
(status, created_at desc)
(requested_by, created_at desc)
(target_network, hostname_scope) where target_network is not null
(related_request_id) where related_request_id is not null
(resolved_at) where status in ('resolved','cancelled','failed') and anonymized_at is null
```

Replace only the named Phase 1 event checks with expanded checks that retain every old value and add:

```sql
firewall_request_created
firewall_request_confirmed
firewall_request_resolved
firewall_request_cancelled
firewall_request_failed
firewall_target_anonymized
```

Allow source `security_center_firewall` while preserving `security_center_manual`. Do not weaken the append-only trigger.

- [ ] **Step 5: Implement service-role-only RPCs**

Every function must be `SECURITY DEFINER`, use `set search_path = ''`, schema-qualify references, revoke default EXECUTE, and grant only to `service_role`.

The read RPC independently validates Owner/Admin and branches its JSON projection:

```sql
case when v_actor_role = 'owner'
  then request.target_network::text
  else null
end as target_network
```

The create RPC must:

1. validate an active/warned Owner;
2. validate Security Center and event collection flags;
3. normalize and validate target/rate fields again in PostgreSQL;
4. hash the complete request payload together with its random request ID for idempotency;
5. lock the retained target scope with an advisory transaction lock;
6. reject an awaiting/active duplicate target and hostname;
7. insert one request, one event, and one admin log atomically;
8. return the request with `idempotent = false`.

For `unblock`, require `p_related_request_id`, lock the referenced active block,
and copy its normalized target, masked target, hostname, and
`target_reference` into the unblock record. The caller never resubmits the raw
target. Duplicate-target protection applies to new block requests and permits
one linked awaiting unblock beside its active block.

The transition RPC supports exactly:

```text
confirm_external
cancel
mark_failed
complete_observation
```

`confirm_external` activates block and observation requests, but resolves an unblock request and its linked block. `cancel` and `mark_failed` apply only while awaiting. `complete_observation` applies only to an active rate-limit observation.

The cleanup RPC processes at most the supplied limit, uses `clock_timestamp()`, selects ended rows with `resolved_at <= now - interval '90 days'`, locks with `for update skip locked`, clears only `target_network`, sets `anonymized_at`, and writes one event/admin log per row.

- [ ] **Step 6: Run SQL verification**

Run:

```bash
npx supabase test db supabase/tests/security_center_foundation.test.sql
npx supabase test db supabase/tests/security_firewall_operations.test.sql
```

Expected: both PASS. Phase 1 behavior remains intact and all fixtures roll back.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260924130000_security_firewall_operations.sql supabase/tests/security_firewall_operations.test.sql
git commit -m "feat(db): add audited firewall request lifecycle"
```

---

### Task 3: Server Firewall Service and Event Compatibility

**Files:**
- Create: `lib/security/firewall.ts`
- Create: `lib/security/firewall.test.ts`
- Modify: `lib/security/service.ts:19-34,101-113,164-169,430-490`
- Modify: `lib/security/service.test.ts`

**Interfaces:**
- Consumes: Task 2 RPCs and Task 1 parser.
- Produces:

```ts
export type FirewallRequestStatus =
  | "awaiting_external_publish"
  | "active"
  | "resolved"
  | "cancelled"
  | "failed";

export type FirewallRequest = {
  id: string;
  targetReference: string;
  requestType: "block_ip" | "block_cidr" | "unblock" | "rate_limit_observation";
  status: FirewallRequestStatus;
  targetNetwork: string | null;
  targetMasked: string | null;
  hostnameScope: "ourlittleage.com" | "www.ourlittleage.com" | null;
  relatedRequestId: string | null;
  pathMatchMode: "exact" | "prefix" | null;
  pathPattern: string | null;
  httpMethod: string | null;
  windowSeconds: number | null;
  requestThreshold: number | null;
  proposedFollowupAction: "rate_limit" | "challenge" | "deny" | null;
  reason: string;
  requestedBy: string;
  externalRuleId: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  resolvedAt: string | null;
  anonymizedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function getFirewallRequests(
  page: number,
  status: FirewallRequestStatus | "all",
  client?: SecurityFirewallClient
): Promise<PagedFirewallRequests>;

export async function createFirewallRequest(
  input: CreateFirewallRequestInput,
  client?: SecurityFirewallClient
): Promise<FirewallRequestMutationResult>;

export async function transitionFirewallRequest(
  id: string,
  input: TransitionFirewallRequestInput,
  client?: SecurityFirewallClient
): Promise<FirewallRequestMutationResult>;

export async function cleanupExpiredFirewallTargets(
  limit?: number,
  client?: SecurityFirewallClient
): Promise<number>;
```

- [ ] **Step 1: Write failing service tests**

Mock `getAdminActor` and the Supabase RPC client. Require:

```ts
await expect(getFirewallRequests(1, "all", client)).resolves.toMatchObject({
  page: 1,
  pageSize: 20,
  items: [expect.objectContaining({ targetMasked: "8.8.x.x/32" })],
});

expect(client.rpc).toHaveBeenCalledWith(
  "security_admin_get_firewall_requests",
  expect.objectContaining({ p_actor_id: owner.id, p_page: 1, p_page_size: 20 })
);
```

Test Owner create parameters, Admin read, Admin write rejection, Moderator denial, target parsing before RPC, rate-limit path/method normalization, lifecycle transition parameters, malformed RPC result rejection, `23505` conflict mapping, generic database failure, and cleanup count mapping.

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npx vitest run lib/security/firewall.test.ts lib/security/service.test.ts
```

Expected: FAIL because the Firewall service and event vocabulary do not exist.

- [ ] **Step 3: Implement strict Firewall mapping and mutations**

Keep this module `server-only`. Use a page size of 20 and no direct table queries. Parse and normalize network targets through Task 1 before calling the RPC. Validate rate paths with:

```ts
const pathPattern = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^\/(?!\/)/)
  .refine((value) => !value.includes("?") && !value.includes("#"));
```

Generate request IDs in the UI/API boundary and require UUIDs in the service. Never log raw target values. Map `23505` to a new `SecurityServiceError("conflict", ...)`; keep all other client messages generic.

- [ ] **Step 4: Extend Phase 1 event mapping without weakening validation**

Add the six Firewall event types to `SecurityEvent["eventType"]`, accept `security_center_firewall` as a source, and keep category restricted to the existing approved category set. Add labels later in Task 5.

Update tests so the existing overview maps one Phase 1 manual event and one Firewall lifecycle event. Reject unknown types and unknown sources.

- [ ] **Step 5: Run focused verification**

Run:

```bash
npx vitest run lib/security/network.test.ts lib/security/firewall.test.ts lib/security/service.test.ts
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/security/firewall.ts lib/security/firewall.test.ts lib/security/service.ts lib/security/service.test.ts
git commit -m "feat(security): add firewall operations service"
```

---

### Task 4: Protected Firewall APIs

**Files:**
- Modify: `lib/admin/authorization.ts`
- Modify: `lib/admin/authorization.test.ts`
- Create: `app/api/admin/security/firewall/route.ts`
- Create: `app/api/admin/security/firewall/route.test.ts`
- Create: `app/api/admin/security/firewall/[id]/route.ts`
- Create: `app/api/admin/security/firewall/[id]/route.test.ts`

**Interfaces:**
- Consumes: Task 3 service functions.
- Produces: `GET /api/admin/security/firewall?page=1&status=all`.
- Produces: `POST /api/admin/security/firewall`.
- Produces: `POST /api/admin/security/firewall/[id]`.

- [ ] **Step 1: Add failing authorization tests**

Require:

```ts
expect(canManageSecurityFirewall("owner")).toBe(true);
expect(canManageSecurityFirewall("admin")).toBe(false);
expect(canManageSecurityFirewall("moderator")).toBe(false);
expect(canManageSecurityFirewall("user")).toBe(false);
```

- [ ] **Step 2: Add failing route role-matrix tests**

For both routes verify:

- anonymous `401`;
- Moderator/resident `403`;
- Owner/Admin GET `200` and `private, no-store`;
- Admin POST `403` before request parsing or service invocation;
- invalid JSON, UUID, page, status, target, reason, and transition return `400`;
- service not-found returns `404`;
- service conflict returns `409`;
- internal errors return generic `500` without target or database detail.

- [ ] **Step 3: Run route tests and verify failure**

Run:

```bash
npx vitest run lib/admin/authorization.test.ts app/api/admin/security/firewall/route.test.ts app/api/admin/security/firewall/[id]/route.test.ts
```

Expected: FAIL because the predicate and routes do not exist.

- [ ] **Step 4: Implement request schemas and handlers**

Use strict Zod discriminated unions. The create route accepts exactly:

```ts
type CreateBody =
  | { requestType: "block_ip" | "block_cidr"; target: string; hostnameScope: FirewallHostname; reason: string; requestId: string }
  | { requestType: "unblock"; relatedRequestId: string; reason: string; requestId: string }
  | { requestType: "rate_limit_observation"; pathMatchMode: "exact" | "prefix"; pathPattern: string; httpMethod: HttpMethod; windowSeconds: number; requestThreshold: number; proposedFollowupAction: "rate_limit" | "challenge" | "deny"; reason: string; requestId: string };
```

The transition route accepts exactly:

```ts
type TransitionBody = {
  action: "confirm_external" | "cancel" | "mark_failed" | "complete_observation";
  externalRuleId?: string;
  reason: string;
  requestId: string;
};
```

Use `getAdminActor()` and authorization predicates before reading bodies. Return only mapped service objects.

- [ ] **Step 5: Run focused route tests**

Run:

```bash
npx vitest run lib/admin/authorization.test.ts app/api/admin/security/firewall/route.test.ts app/api/admin/security/firewall/[id]/route.test.ts
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/admin/authorization.ts lib/admin/authorization.test.ts app/api/admin/security/firewall
git commit -m "feat(security): protect firewall request APIs"
```

---

### Task 5: Traffic Protection Admin Experience

**Files:**
- Create: `components/admin/security/FirewallRequestForm.tsx`
- Create: `components/admin/security/FirewallRequestForm.test.tsx`
- Create: `components/admin/security/TrafficProtectionSection.tsx`
- Create: `components/admin/security/TrafficProtectionSection.test.tsx`
- Modify: `components/admin/security/SecurityCenterClient.tsx`
- Modify: `components/admin/security/SecurityCenterClient.test.tsx`

**Interfaces:**
- Consumes: Task 4 APIs and Task 3 response types.
- Produces: a section-local Traffic Protection workflow inside `/admin/security`.

- [ ] **Step 1: Write failing form tests**

Verify:

- Owner can choose IP block, CIDR block, unblock, or rate-limit observation;
- Admin never receives the create form;
- IP/CIDR fields and host selector appear only for block requests;
- rate-limit fields appear only for observation requests;
- reason is mandatory and bounded;
- invalid targets show a visible field error without calling `fetch`;
- submitted bodies contain one generated request ID reused for an uncertain retry;
- operation summary contains no token, Cookie, authorization header, or CLI command;
- the Vercel link is `https://vercel.com/dashboard` with external-link safety attributes.

- [ ] **Step 2: Write failing section tests**

Verify section-local behavior:

```ts
expect(await screen.findByText("流量防护")).toBeInTheDocument();
expect(screen.getByText("Vercel 是实际规则与实时流量的依据")).toBeInTheDocument();
expect(screen.getByText("Owner 人工确认")).toBeInTheDocument();
```

Also test awaiting/active/ended filters, pagination, full Owner target, masked Admin target, empty state, unavailable state, local retry, confirmation dialogs, and legal action buttons by status/type.

- [ ] **Step 3: Run component tests and verify failure**

Run:

```bash
npx vitest run components/admin/security/FirewallRequestForm.test.tsx components/admin/security/TrafficProtectionSection.test.tsx components/admin/security/SecurityCenterClient.test.tsx
```

Expected: FAIL because the components do not exist.

- [ ] **Step 4: Implement the structured Owner form**

Use Lucide icons for network, shield, external link, and status actions. Use native inputs/selects and the existing `ConfirmDialog` for lifecycle mutations. Keep request IDs in a ref until the response definitively succeeds or validation definitively fails.

Display a human-readable external summary, for example:

```text
操作：封锁单一 IP
范围：www.ourlittleage.com
目标：8.8.x.x/32
初始方式：先在 Vercel 观察匹配流量，再决定 challenge / deny
发布位置：Vercel Firewall
```

Do not label a local request as active until the Owner submits a valid external rule ID through the confirmation action.

- [ ] **Step 5: Implement the isolated Traffic Protection section**

Fetch its data independently from the Phase 1 overview so either section can fail without hiding the other. Use bounded pages and these visible filters:

```text
等待执行
生效中
已结束
```

Map statuses to quiet neutral text, with amber for waiting and red reserved for failed states. Do not add a manual page-level refresh button; local retry is shown only after an error.

- [ ] **Step 6: Compose it in the existing Security Center**

Mount:

```tsx
<TrafficProtectionSection currentRole={currentRole} />
```

between feature flags and Word Detection. Add labels for all six Firewall event types in the existing recent-events list. Preserve the existing test that no button named `刷新` exists.

- [ ] **Step 7: Run focused UI verification**

Run:

```bash
npx vitest run components/admin/security/FirewallRequestForm.test.tsx components/admin/security/TrafficProtectionSection.test.tsx components/admin/security/SecurityCenterClient.test.tsx components/admin/security/WordDetectionSection.test.tsx app/admin/security/page.test.tsx
npx tsc --noEmit
npx eslint components/admin/security app/admin/security
```

Expected: PASS with no Phase 1 or Word Detection regression.

- [ ] **Step 8: Commit**

```bash
git add components/admin/security app/admin/security/page.test.tsx
git commit -m "feat(admin): add traffic protection workflow"
```

---

### Task 6: Ninety-day Target Anonymization

**Files:**
- Create: `app/api/cron/security-firewall-retention/route.ts`
- Create: `app/api/cron/security-firewall-retention/route.test.ts`
- Modify: `vercel.json`

**Interfaces:**
- Consumes: `cleanupExpiredFirewallTargets(100)` from Task 3.
- Produces: authenticated `GET /api/cron/security-firewall-retention`.

- [ ] **Step 1: Write failing Cron tests**

Verify:

- missing `CRON_SECRET` returns `503` without calling cleanup;
- absent, malformed, or wrong Authorization returns `401`;
- exact `Bearer ${CRON_SECRET}` calls cleanup once with limit 100;
- success returns `{ ok: true, anonymized: number }` and `Cache-Control: no-store`;
- failure returns generic `500` without database or target details;
- timing-safe comparison is used for equal-length secrets.

- [ ] **Step 2: Run the route test and verify failure**

Run:

```bash
npx vitest run app/api/cron/security-firewall-retention/route.test.ts
```

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement the narrow Cron route**

Reuse the timing-safe authorization shape from `publish-announcements`, but keep this route responsible only for Firewall target retention. Do not instantiate a separate client in the route; call the Task 3 server service.

- [ ] **Step 4: Add the daily schedule**

Preserve the existing announcement schedule and add:

```json
{
  "path": "/api/cron/security-firewall-retention",
  "schedule": "30 0 * * *"
}
```

The database RPC, not JavaScript, decides the 90-day boundary using database time.

- [ ] **Step 5: Run retention verification**

Run:

```bash
npx vitest run app/api/cron/security-firewall-retention/route.test.ts
npx supabase test db supabase/tests/security_firewall_operations.test.sql
npx tsc --noEmit
```

Expected: PASS; 89-day ended fixtures remain and 90-day fixtures anonymize.

- [ ] **Step 6: Commit**

```bash
git add app/api/cron/security-firewall-retention vercel.json
git commit -m "feat(security): anonymize ended firewall targets"
```

---

### Task 7: Documentation and Internal Changelog Sync

**Files:**
- Modify: `docs/superpowers/specs/2026-09-24-security-center-phase-2a-design.md`
- Modify: `HANDOFF.md`
- Modify: `lib/admin/changelog.ts`

**Interfaces:**
- Consumes: verified implementation state from Tasks 1-6.
- Produces: accurate Technical Source of Truth and Admin-only release note.

- [ ] **Step 1: Update design status**

Change only the status to:

```text
Implementation complete locally. Production migration and Vercel Firewall publication are not approved or applied.
```

- [ ] **Step 2: Update HANDOFF with exact delivery terminology**

Record:

```text
implemented: yes
committed: pending final integration commit
pushed: no
migration applied: no
deployed: no
production verified: no
```

List the new migration, RPCs, APIs, UI, Cron, access matrix, 90-day retention, and the continued OFF state of both automation flags. Explicitly state that no Vercel token or Production rule was added.

- [ ] **Step 3: Add one Admin Changelog entry**

Use:

```ts
{
  date: "2026-09-24",
  phase: "Security Center Phase 2A",
  title: "建立人工流量防护与审计流程",
  category: "Security",
  scope: "IP/CIDR 防护单、流量限制观察与内部审计",
  status: "待部署",
  summary:
    "安全中心新增受控的人工流量防护流程，Owner 可准备并记录网络防护操作，Admin 可查看遮罩后的状态；实际规则仍由 Vercel 独立发布，自动判断与自动处置继续关闭。",
}
```

Do not add a Public Changelog entry.

- [ ] **Step 4: Run documentation leakage checks**

Run:

```bash
rg -n "VERCEL_TOKEN|Bearer |service_role|request_threshold|CIDR.*阈值" lib/changelog/public.ts app/settings/changelog/page.tsx
git diff --check
```

Expected: no sensitive Security Center implementation details appear in Public Changelog code; `git diff --check` exits 0.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-09-24-security-center-phase-2a-design.md HANDOFF.md lib/admin/changelog.ts
git commit -m "docs: record security center phase 2a"
```

---

### Task 8: Final Local Verification and Delivery Gate

**Files:**
- Verify all files changed in Tasks 1-7.
- Modify only test or implementation files directly implicated by a failing gate.

**Interfaces:**
- Consumes: complete Phase 2A local implementation.
- Produces: a reviewable local branch that remains unapplied to Production.

- [ ] **Step 1: Run all targeted Vitest files together**

Run:

```bash
npx vitest run lib/security/network.test.ts lib/security/firewall.test.ts lib/security/service.test.ts lib/admin/authorization.test.ts app/api/admin/security/firewall/route.test.ts app/api/admin/security/firewall/[id]/route.test.ts app/api/cron/security-firewall-retention/route.test.ts components/admin/security/FirewallRequestForm.test.tsx components/admin/security/TrafficProtectionSection.test.tsx components/admin/security/SecurityCenterClient.test.tsx components/admin/security/WordDetectionSection.test.tsx app/admin/security/page.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run both SQL suites**

Run:

```bash
npx supabase test db supabase/tests/security_center_foundation.test.sql
npx supabase test db supabase/tests/security_firewall_operations.test.sql
```

Expected: PASS in the isolated database; no Production database connection is used.

- [ ] **Step 3: Run static and build gates**

Run:

```bash
npx tsc --noEmit
npx eslint lib/security lib/admin/authorization.ts app/api/admin/security app/api/cron/security-firewall-retention components/admin/security app/admin/security
npm run build
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 4: Perform role-focused UI review**

With an existing local Owner/Admin session, inspect `/admin/security` at `1440x900` and `375x812`. Confirm:

- no overlap or horizontal scrolling;
- Owner full target and mutation controls;
- Admin masked target and no mutation controls;
- local failure does not hide Word Detection or Phase 1 events;
- no page-level refresh control;
- external link opens Vercel Dashboard without credentials;
- manual confirmation wording is visible.

If no authorized local session exists, record visual verification as deferred; do not bypass Auth or create Production data.

- [ ] **Step 5: Review the complete diff for scope**

Run:

```bash
git status --short
git diff --stat HEAD~7..HEAD
git diff --check HEAD~7..HEAD
```

Expected: only the files named in this plan changed; no Auth, Relationship, VIP, content, notification, account punishment, or Vercel credential code changed.

- [ ] **Step 6: Create the final integration commit only if verification fixes remain**

If Step 1-5 required tracked fixes after Task 7, commit only those fixes:

```bash
git add package.json package-lock.json lib/security lib/admin/authorization.ts lib/admin/authorization.test.ts app/api/admin/security/firewall app/api/cron/security-firewall-retention components/admin/security app/admin/security/page.test.tsx supabase/migrations/20260924130000_security_firewall_operations.sql supabase/tests/security_firewall_operations.test.sql vercel.json HANDOFF.md lib/admin/changelog.ts docs/superpowers/specs/2026-09-24-security-center-phase-2a-design.md
git commit -m "test: verify security center phase 2a"
```

If the tree is already clean, do not create an empty commit.

- [ ] **Step 7: Stop at the Production gate**

Report:

```text
SECURITY CENTER PHASE 2A LOCAL IMPLEMENTATION COMPLETE

Migration applied: NO
Vercel rules changed: NO
Vercel token added: NO
Risk evaluation enabled: NO
Automatic enforcement enabled: NO
Production readiness review required: YES
```

Do not push, deploy, apply the migration, activate the Cron, or publish any Vercel Firewall rule without a separate explicit instruction.
