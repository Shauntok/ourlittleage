# Relationship System V1 Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add resident-facing follow controls, public accepted relationship counts and lists, follow privacy settings, and transactional follow notifications while preserving the Phase 1 relationship model and permissions.

**Architecture:** Keep `user_follows` as the only directed relationship source of truth. Extend the existing Phase 1 RPC transactions so relationship state and its notification are committed together, expose accepted-only public read RPCs, and route every resident mutation through the existing server actions. Room UI owns follow controls and paginated dialogs; the existing mailbox owns follow and follow-request notifications.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase/PostgreSQL, Vitest, Testing Library, Tailwind CSS, Lucide React.

**Spec:** `docs/superpowers/specs/2026-09-08-relationship-phase-2-design.md`

## Global Constraints

- Follow remains directional. Mutual follow is derived from two accepted rows and is never stored.
- Do not implement Friendship, Mention, content permissions, recommendations, feeds, or new content types.
- Do not create a new relationship hub or a third notification category.
- Do not modify the Phase 1 migration. All database changes use one new non-destructive migration.
- Do not expose pending relationships in public counts or public lists.
- Do not trust actor IDs from the browser. Server actions derive the actor from the validated session; database RPCs remain the final authorization boundary.
- Preserve the Phase 1 account-state rules: `active` and `warned` may add/accept relationships; every authenticated state may reduce its own relationships.
- Reuse `profiles`, `user_follows`, `notifications`, the existing mailbox, and `ConfirmDialog`.
- Use physical deletion for cancel, reject, unfollow, and remove follower, matching Phase 1.
- All list queries are paginated with a default page size of 20 and a hard maximum of 100 rows per request.
- Work and tests stay local. Do not apply a production migration, push, deploy, or run destructive tests against Production without a later explicit instruction.

---

## Task 1: Add Transactional Relationship Notifications and Public Read RPCs

**Files:**

- Create through the CLI: `supabase/migrations/*_relationship_follow_notifications.sql`
- Create: `supabase/tests/relationship_follow_notifications.test.sql`
- Modify only if required by isolated test bootstrapping: `supabase/tests/fixtures/relationship_base.sql`
- Reference only: `supabase/migrations/20260908024825_relationship_follow_core.sql`

- [ ] **Step 1: Generate the migration filename through the Supabase CLI**

Run:

```powershell
npx supabase migration new relationship_follow_notifications
```

Expected: one new timestamped migration. Do not rename or edit the Phase 1 migration.

- [ ] **Step 2: Write failing database tests first**

Create `supabase/tests/relationship_follow_notifications.test.sql` covering:

- `notifications.relationship_id` exists, is nullable, references `user_follows(id)`, and uses `ON DELETE SET NULL`.
- A covering index exists for `relationship_id`.
- A partial unique index prevents duplicate active `follow`, `follow_request`, or `follow_accepted` notifications for one relationship.
- Open follow creates one accepted relationship and one `follow` notification for the target.
- Approval-required follow creates one pending relationship and one `follow_request` notification for the target.
- Repeating either follow operation is idempotent and creates no duplicate notification.
- Accept changes pending to accepted, sets `accepted_at`, marks the original request notification processed, and creates one `follow_accepted` notification for the requester.
- Cancel and reject hide/mark processed the original request notification and create no new notification.
- Unfollow and remove follower create no new notification.
- Deleting a relationship leaves historical accepted-follow notifications intact with `relationship_id = null`.
- A failed relationship mutation leaves neither a relationship nor a notification behind.
- The existing self-follow, missing-user, account-state, and concurrent-request rules still hold.
- Public summary counts only accepted followers/following.
- Public lists return accepted rows only, stable newest-first ordering, public profile fields only, `total_count`, limit/offset behavior, and no pending rows.
- Public functions reject invalid kinds and clamp/reject page sizes above 100 according to the migration contract.
- `anon`, `authenticated`, and `service_role` can execute only the public read RPCs intended for them; ordinary users still cannot execute mutation RPCs directly.

- [ ] **Step 3: Run the isolated database test and confirm RED**

Use the same disposable local PostgreSQL/Supabase test procedure documented by Phase 1, loading the minimal relationship fixture, Phase 1 migration, the new blank migration, then the new test.

Expected: failures for the missing column, indexes, RPCs, and notification behavior. Never point this run at the linked Production database.

- [ ] **Step 4: Add the notification reference safely**

In the new migration:

- Add nullable `public.notifications.relationship_id uuid`.
- Add a named foreign key to `public.user_follows(id)` with `ON DELETE SET NULL`.
- Add `notifications_relationship_id_idx`.
- Add a partial unique index over `(user_id, type, relationship_id)` for non-null relationship IDs and types `follow`, `follow_request`, `follow_accepted`.
- Do not backfill old notifications and do not rewrite unrelated notification rows.

- [ ] **Step 5: Replace Phase 1 mutation RPCs in the new migration**

Use `CREATE OR REPLACE FUNCTION` for the existing relationship mutation RPC signatures. Preserve their Phase 1 locking, validation, return values, account-state behavior, and grants while adding these transaction-local effects:

| Relationship transition | Notification effect |
| --- | --- |
| open follow -> accepted | Insert `follow` for the followed resident |
| approval follow -> pending | Insert `follow_request` for the followed resident |
| accept pending | Mark the request notification read/processed; insert `follow_accepted` for the requester |
| cancel pending | Mark the request notification read and soft-delete it; insert nothing |
| reject pending | Mark the request notification read and soft-delete it; insert nothing |
| unfollow accepted | Insert nothing |
| remove follower | Insert nothing |

Store `actor_id`, `relationship_id`, a stable Chinese `title`, and a concise `content`. Use `ON CONFLICT` only against the dedicated relationship-notification uniqueness rule so retries remain idempotent. Update request notification state before deleting the pending relationship so the row can still be matched.

- [ ] **Step 6: Add accepted-only public read RPCs**

Add:

```sql
public.relationship_get_public_summary(p_resident_id uuid)
public.relationship_list_public(
  p_resident_id uuid,
  p_kind text,
  p_limit integer default 20,
  p_offset integer default 0
)
```

Contract:

- Summary returns `followers_count` and `following_count` from accepted rows only.
- List accepts only `followers` or `following`.
- List returns `resident_id`, `username`, `avatar_url`, `relationship_at`, and `total_count`.
- It does not return relation IDs, email, role, status, follow mode, pending state, or auth metadata.
- Ordering is `relationship_at DESC` with a deterministic UUID tie-breaker.
- Missing residents raise the existing not-found relationship error.
- Revoke default execution, then grant only the intended public-read roles.

- [ ] **Step 7: Run database tests and confirm GREEN**

Run the isolated relationship notification test and rerun `relationship_follow_core.test.sql` against the same migration chain.

Expected: both pass, including concurrency and permission assertions.

- [ ] **Step 8: Commit the database slice**

```powershell
git add (Get-ChildItem supabase/migrations/*_relationship_follow_notifications.sql).FullName supabase/tests/relationship_follow_notifications.test.sql supabase/tests/fixtures/relationship_base.sql
git commit -m "feat: add transactional follow notifications"
```

Only include the fixture if it actually changed.

---

## Task 2: Extend the Relationship Service and Server Actions for Resident Reads

**Files:**

- Modify: `lib/relationships/service.ts`
- Modify: `lib/relationships/service.test.ts`
- Modify: `app/actions/relationships.ts`
- Modify: `app/actions/relationships.test.ts`

- [ ] **Step 1: Add failing service tests**

Test these typed service contracts:

```ts
type PublicRelationshipKind = "followers" | "following";

type PublicRelationshipSummary = {
  followersCount: number;
  followingCount: number;
};

type PublicRelationshipItem = {
  residentId: string;
  username: string;
  avatarUrl: string | null;
  relationshipAt: string;
};

type PublicRelationshipPage = {
  items: PublicRelationshipItem[];
  total: number;
  page: number;
  pageSize: number;
};
```

Cover UUID validation, kind validation, default page 1, page size 20, maximum 100, snake_case-to-camelCase mapping, empty pages, and stable error conversion.

- [ ] **Step 2: Confirm service tests are RED**

Run:

```powershell
npm test -- lib/relationships/service.test.ts
```

Expected: tests fail because resident public read methods do not exist.

- [ ] **Step 3: Implement service read methods**

Add server-only functions with clear names:

```ts
getPublicRelationshipSummary(residentId)
getPublicRelationships(residentId, kind, page, pageSize)
```

Validate every input with Zod, call the new RPCs through the server Supabase client, and map database rows into the contracts above. Keep `getRelationshipState(actorId, targetId)` as the authenticated state source; do not duplicate its mutual logic in React.

- [ ] **Step 4: Add failing server-action tests**

Cover:

- Public summary/list actions do not require a logged-in actor.
- Relationship state requires a validated session and never accepts an actor ID argument.
- Mutation actions continue to use `withActor` and preserve their current response format.
- Invalid IDs/kinds/pages return stable user-safe errors while server details remain logged server-side.

- [ ] **Step 5: Implement the actions**

Add actions for:

```ts
getPublicRelationshipSummary(residentId)
getPublicRelationships(residentId, kind, page)
getResidentRelationshipState(targetResidentId)
```

Alias service imports where names would collide. Return serializable `{ ok, data }` / `{ ok, error }` results consistent with the existing file. Keep page size fixed at 20 at the action boundary.

- [ ] **Step 6: Run focused tests and lint**

```powershell
npm test -- lib/relationships/service.test.ts app/actions/relationships.test.ts
npx eslint lib/relationships/service.ts lib/relationships/service.test.ts app/actions/relationships.ts app/actions/relationships.test.ts
```

Expected: all pass.

- [ ] **Step 7: Commit the service slice**

```powershell
git add lib/relationships/service.ts lib/relationships/service.test.ts app/actions/relationships.ts app/actions/relationships.test.ts
git commit -m "feat: expose resident relationship reads"
```

---

## Task 3: Preserve a Safe Room Return Path Through Login

**Files:**

- Create: `lib/navigation/safe-return-path.ts`
- Create: `lib/navigation/safe-return-path.test.ts`
- Modify: `app/page.tsx`
- Modify: `components/landing/LandingClient.tsx`
- Modify: `components/landing/LandingClient.test.tsx`

- [ ] **Step 1: Write return-path validation tests**

Cover:

- `/u/resident-name` is accepted.
- Query strings and fragments on a local path are retained.
- Missing, empty, protocol-relative (`//host`), absolute (`https://...`), backslash-containing, and control-character values are rejected.
- Arrays use no value unless the page deliberately selects one scalar entry.

- [ ] **Step 2: Confirm RED**

```powershell
npm test -- lib/navigation/safe-return-path.test.ts
```

- [ ] **Step 3: Implement the validator**

Implement one small pure helper that returns a normalized same-origin path or `null`. Do not use browser state and do not permit an external redirect.

- [ ] **Step 4: Add failing landing-login tests**

Test that a successful login:

- Navigates to a valid supplied room return path.
- Falls back to `/home` when absent or invalid.
- Leaves existing registration and error flows unchanged.

- [ ] **Step 5: Wire the landing page**

Update `app/page.tsx` to parse `searchParams.returnTo`, sanitize it on the server, and pass it to `LandingClient`. Update `LandingClient` to use the sanitized prop after successful sign-in.

The room follow control will send anonymous users to:

```ts
`/?returnTo=${encodeURIComponent(`/u/${username}`)}`
```

Do not route through `/login`; that route currently redirects to `/` and would discard the return target.

- [ ] **Step 6: Run focused tests and lint**

```powershell
npm test -- lib/navigation/safe-return-path.test.ts components/landing/LandingClient.test.tsx
npx eslint lib/navigation/safe-return-path.ts lib/navigation/safe-return-path.test.ts app/page.tsx components/landing/LandingClient.tsx components/landing/LandingClient.test.tsx
```

- [ ] **Step 7: Commit the login-return slice**

```powershell
git add lib/navigation/safe-return-path.ts lib/navigation/safe-return-path.test.ts app/page.tsx components/landing/LandingClient.tsx components/landing/LandingClient.test.tsx
git commit -m "feat: return residents to rooms after login"
```

---

## Task 4: Add Room Relationship Counts and Follow Controls

**Files:**

- Create: `components/relationships/ResidentRelationshipControls.tsx`
- Create: `components/relationships/ResidentRelationshipControls.test.tsx`
- Modify: `components/UserRoomClient.tsx`
- Create: `components/UserRoomClient.relationships.test.tsx`

- [ ] **Step 1: Write failing control tests**

Cover the complete visible state table:

| Viewer state | Button |
| --- | --- |
| owner viewing own room | no follow button |
| anonymous visitor | `关注` and login redirect on click |
| no outgoing relationship | `关注` |
| outgoing pending | `等待回应` with cancel path |
| outgoing accepted only | `已关注` with unfollow path |
| both directions accepted | `互相关注` with unfollow path |

Also cover:

- Followers and following counts render for anonymous and authenticated visitors.
- Loading does not shift the profile layout.
- Read failure shows a quiet retry state without breaking the room.
- Repeated clicks are disabled while a mutation is pending.
- A successful mutation refreshes both counts and relationship state.
- Mutation errors keep the prior state and show a concise message.
- Cancel and unfollow require `ConfirmDialog`; initial follow does not.

- [ ] **Step 2: Confirm RED**

```powershell
npm test -- components/relationships/ResidentRelationshipControls.test.tsx
```

- [ ] **Step 3: Implement the control component**

Build a compact client component using the new public read actions and existing mutation actions. Use Lucide icons and the existing restrained room palette. Keep fixed button/count dimensions, visible focus styles, and descriptive `aria-label` text.

Determine ownership from the authenticated Supabase user ID, not from username equality. Fetch public counts for everyone; fetch relationship state only for a logged-in non-owner.

- [ ] **Step 4: Integrate into the room profile area**

Place `关注中 N` and `关注者 N` near the existing resident identity/stats, with the follow control alongside them. Pass only the resident ID and canonical username. Do not change the room route, content tabs, avatar editor, post loading, or desktop structure beyond the local profile area.

- [ ] **Step 5: Run focused tests and lint**

```powershell
npm test -- components/relationships/ResidentRelationshipControls.test.tsx components/UserRoomClient.relationships.test.tsx
npx eslint components/relationships/ResidentRelationshipControls.tsx components/relationships/ResidentRelationshipControls.test.tsx components/UserRoomClient.tsx components/UserRoomClient.relationships.test.tsx
```

- [ ] **Step 6: Commit the room-control slice**

```powershell
git add components/relationships/ResidentRelationshipControls.tsx components/relationships/ResidentRelationshipControls.test.tsx components/UserRoomClient.tsx components/UserRoomClient.relationships.test.tsx
git commit -m "feat: add follow controls to resident rooms"
```

---

## Task 5: Add Paginated Followers and Following Dialogs

**Files:**

- Create: `components/relationships/ResidentRelationshipDialog.tsx`
- Create: `components/relationships/ResidentRelationshipDialog.test.tsx`
- Modify: `components/relationships/ResidentRelationshipControls.tsx`
- Modify: `components/relationships/ResidentRelationshipControls.test.tsx`

- [ ] **Step 1: Write failing dialog tests**

Cover:

- Clicking either public count opens the correct dialog without changing route.
- The dialog renders avatar, username, room link, relationship time, empty state, loading state, retry state, and total-aware pagination.
- Page size is 20; next/previous controls cannot cross bounds.
- Escape and backdrop close the dialog; inner clicks do not.
- Focus enters the dialog, stays inside while open, and returns to the triggering count on close.
- Background scrolling is locked while open.
- Visitors and users viewing another resident see read-only rows.
- In the owner’s `关注中` dialog, each row may invoke existing `unfollowUser` after confirmation.
- In the owner’s `关注者` dialog, each row may invoke existing `removeFollower` after confirmation.
- Removing the final row on a later page steps back to the prior valid page.
- One row mutation disables only the affected action and refreshes summary/list data afterward.

- [ ] **Step 2: Confirm RED**

```powershell
npm test -- components/relationships/ResidentRelationshipDialog.test.tsx components/relationships/ResidentRelationshipControls.test.tsx
```

- [ ] **Step 3: Implement the dialog**

Render through a portal and use a semantic dialog with `aria-modal`, labelled heading, visible close icon, fixed row geometry, and compact mobile layout. Reuse `ConfirmDialog` for relationship-reducing actions. Link residents to `/u/${encodeURIComponent(username)}`.

Do not expose pending, mutual, request IDs, account status, email, or admin-only metadata.

- [ ] **Step 4: Integrate count triggers and refresh coordination**

Keep dialog state inside `ResidentRelationshipControls`. After a successful owner action, refresh the open page and summary; refresh relationship state only where relevant. Avoid full-page reloads.

- [ ] **Step 5: Run focused tests and lint**

```powershell
npm test -- components/relationships/ResidentRelationshipDialog.test.tsx components/relationships/ResidentRelationshipControls.test.tsx
npx eslint components/relationships/ResidentRelationshipDialog.tsx components/relationships/ResidentRelationshipDialog.test.tsx components/relationships/ResidentRelationshipControls.tsx components/relationships/ResidentRelationshipControls.test.tsx
```

- [ ] **Step 6: Commit the dialog slice**

```powershell
git add components/relationships/ResidentRelationshipDialog.tsx components/relationships/ResidentRelationshipDialog.test.tsx components/relationships/ResidentRelationshipControls.tsx components/relationships/ResidentRelationshipControls.test.tsx
git commit -m "feat: add resident relationship dialogs"
```

---

## Task 6: Add Follow Privacy to Existing Settings

**Files:**

- Modify: `app/settings/privacy/page.tsx`
- Create or modify: `app/settings/privacy/page.test.tsx`

- [ ] **Step 1: Write failing privacy tests**

Cover:

- Existing profile load includes `follow_mode`.
- `open` and `approval_required` are the only options.
- Existing residents with a null/unknown client value render the safe `open` default without writing automatically.
- Saving a changed follow mode calls `setFollowMode` rather than directly including `follow_mode` in a browser-side profile update.
- Existing privacy booleans retain their current save behavior.
- A failure in either save path triggers a refetch and reports that not every change was saved; it never displays a false all-success state.
- Existing accepted and pending relationships are not touched by this page.

- [ ] **Step 2: Confirm RED**

```powershell
npm test -- app/settings/privacy/page.test.tsx
```

- [ ] **Step 3: Add the relationship privacy group**

Add a compact section using the existing settings visual language:

- `任何居民可关注` -> `open`
- `关注需要批准` -> `approval_required`

Explain only the consequence of the choice. Do not mention future Friendship or Mention features in the resident UI.

- [ ] **Step 4: Save through the correct boundaries**

Keep existing boolean updates as they are. Send follow-mode changes through `setFollowMode`. Track the initial value so an unchanged mode causes no RPC. If either operation fails, reload authoritative settings before allowing another save.

- [ ] **Step 5: Run focused tests and lint**

```powershell
npm test -- app/settings/privacy/page.test.tsx app/actions/relationships.test.ts
npx eslint app/settings/privacy/page.tsx app/settings/privacy/page.test.tsx
```

- [ ] **Step 6: Commit the privacy slice**

```powershell
git add app/settings/privacy/page.tsx app/settings/privacy/page.test.tsx
git commit -m "feat: add follow privacy setting"
```

---

## Task 7: Model and Render Relationship Notifications

**Files:**

- Modify: `lib/notifications/model.ts`
- Modify: `lib/notifications/model.test.ts`
- Create: `components/notifications/RelationshipNotificationCard.tsx`
- Create: `components/notifications/RelationshipNotificationCard.test.tsx`

- [ ] **Step 1: Write failing notification-model tests**

Add `follow`, `follow_request`, and `follow_accepted` fixtures. Verify:

- All three remain in the mailbox category.
- None appear in the interaction category.
- The relationship join is normalized safely when present, missing, or returned as an array/object by Supabase typing.
- Unknown notification types still use the existing generic mailbox behavior.

- [ ] **Step 2: Confirm model tests are RED**

```powershell
npm test -- lib/notifications/model.test.ts
```

- [ ] **Step 3: Extend the notification model**

Add the relationship ID and joined relationship state to `NotificationRecord`, plus narrow helpers for the three relationship types. Do not change the definition of interaction notifications.

- [ ] **Step 4: Write failing card tests**

Cover:

- `follow`: actor identity plus a link to the actor’s room.
- Pending `follow_request`: `接受` and `拒绝` actions.
- Accepted request: resolved `已接受` state with no repeat action.
- Canceled/rejected/missing relationship: `申请已结束` with no action.
- `follow_accepted`: link back to the accepting resident’s room.
- Pending action disables both buttons and prevents double submission.
- Server error refreshes authoritative state and shows a quiet failure message.
- Existing mailbox actions such as read, important, and delete remain available through the page-provided callbacks.

- [ ] **Step 5: Implement the relationship notification card**

Use the existing notification typography, spacing, and mailbox action component. Resolve the actor by profile, never infer ownership from the notification title. Keep copy factual so it cannot imply that a commenter owns somebody else’s article.

- [ ] **Step 6: Run focused tests and lint**

```powershell
npm test -- lib/notifications/model.test.ts components/notifications/RelationshipNotificationCard.test.tsx
npx eslint lib/notifications/model.ts lib/notifications/model.test.ts components/notifications/RelationshipNotificationCard.tsx components/notifications/RelationshipNotificationCard.test.tsx
```

- [ ] **Step 7: Commit the model/card slice**

```powershell
git add lib/notifications/model.ts lib/notifications/model.test.ts components/notifications/RelationshipNotificationCard.tsx components/notifications/RelationshipNotificationCard.test.tsx
git commit -m "feat: add follow notification cards"
```

---

## Task 8: Integrate Follow Requests into the Existing Mailbox

**Files:**

- Modify: `app/notifications/page.tsx`
- Create or modify: `app/notifications/page.test.tsx`

- [ ] **Step 1: Write failing mailbox integration tests**

Cover:

- Notification fetch joins `user_follows` through `notifications_relationship_id_fkey`.
- `follow`, `follow_request`, and `follow_accepted` render in `mailbox` and never increase interaction counts.
- Pending request actions call `acceptFollowRequest(requestId)` / `rejectFollowRequest(requestId)` using the joined relationship ID, not a browser-supplied actor ID.
- Accept/reject refresh the notification list and unread navbar state.
- A stale request, concurrent action, or already-resolved relationship refreshes to the final server state rather than pretending success.
- Trash/archive rendering handles a null `relationship_id` and shows no active request buttons.
- Existing announcement, moderation, like, comment, and reply cards remain unchanged.

- [ ] **Step 2: Confirm RED**

```powershell
npm test -- app/notifications/page.test.tsx
```

- [ ] **Step 3: Extend the mailbox query and rendering**

Add the named relationship join to the current notifications select. Route only the three relationship types through `RelationshipNotificationCard`; preserve all other rendering branches.

Use the existing mailbox category instead of adding a new tab. Keep current filters, unread counts, trash behavior, marking read, importance, delete, and restore behavior.

- [ ] **Step 4: Handle request actions and live final state**

Wire accept/reject to the existing server actions. Disable the card during mutation, refetch after any result, and notify the navbar after the authoritative refresh. If the page already has a user-filtered realtime subscription, extend it; otherwise add one scoped to the current user’s notifications and clean it up on unmount.

- [ ] **Step 5: Run notification regressions and lint**

```powershell
npm test -- app/notifications/page.test.tsx lib/notifications/model.test.ts components/notifications/RelationshipNotificationCard.test.tsx components/notifications/NotificationControls.test.tsx
npx eslint app/notifications/page.tsx app/notifications/page.test.tsx
```

- [ ] **Step 6: Commit the mailbox slice**

```powershell
git add app/notifications/page.tsx app/notifications/page.test.tsx
git commit -m "feat: handle follow requests in mailbox"
```

---

## Task 9: End-to-End Self Review, Documentation, and Local Handoff

**Files:**

- Modify: `HANDOFF.md`
- Modify only if the project convention requires unreleased entries: `app/settings/changelog/page.tsx`
- Do not modify feature behavior during documentation unless a verified defect requires a separate fix and retest.

- [ ] **Step 1: Run all database relationship tests in isolation**

Run the full Phase 1 and Phase 2 relationship SQL tests against a disposable local database using the repository fixture and the complete relevant migration chain.

Verify manually from database assertions:

- Open follow, approval request, duplicate follow, concurrent follow, accept, concurrent accept, cancel, reject, unfollow, and remove follower.
- Notification and relationship state commit or roll back together.
- No notification on cancel/reject/unfollow/remove.
- Accepted-only public counts/lists and no pending leakage.
- Muted/banned/unknown add/accept restrictions remain intact while relationship-reducing actions remain allowed.
- Direct authenticated RPC/table bypass remains blocked.

- [ ] **Step 2: Run the complete application verification suite**

```powershell
npm test
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```

Expected: every command exits successfully. Fix defects, add a regression test, and rerun the affected focused suite before repeating the full command set.

- [ ] **Step 3: Start the local application for browser verification**

Start the dev server on an available port. Do not reuse a conflicting server blindly.

Verify desktop and narrow mobile viewports for:

- Own room: counts visible, no self-follow button, owner row actions available only in own dialogs.
- Another open room: follow -> accepted -> unfollow.
- Another approval room: request -> pending -> cancel.
- Recipient mailbox: pending request -> accept and pending request -> reject.
- Requester mailbox: accepted notification appears after accept.
- Mutual state appears only when both accepted rows exist and disappears correctly after one direction is removed.
- Anonymous room visitor: counts/lists visible; follow sends to login and returns to the same room after successful login.
- Dialog keyboard behavior, focus restoration, no background scroll, 20-row pagination, empty/error/retry states.
- Huawei-class mobile viewport with virtual keyboard emulation where practical: controls remain visible and no profile content overlaps.

- [ ] **Step 4: Inspect network and console behavior**

Confirm:

- No browser receives a service-role key.
- No public request returns pending relationships or sensitive profile fields.
- No duplicate relationship or notification requests fire from one click.
- No React hydration, accessibility, or unhandled promise errors appear.

- [ ] **Step 5: Perform a scope and security review**

Inspect the final diff and explicitly confirm:

- No Friendship, Mention, content visibility, feed, recommendation, or new content-type code was added.
- Existing Admin Relationship access remains Owner/Admin only.
- Existing Moderator access to the rest of `/admin/users/[id]` was not broadened or reduced.
- Existing article, diary, comment, and interaction-notification behavior is unchanged.
- Mutual follow is dynamically derived.
- All mutations still cross server session validation and database authorization.

- [ ] **Step 6: Update the handoff accurately**

Record Phase 2 as local-only until separately deployed. Include:

- Feature files and generated migration name.
- Tests and verification counts/results.
- Current branch and HEAD.
- Migration status: local, not applied to Production.
- Git status and whether commits are ahead of origin.
- Explicit future work: Production migration/app deployment only after approval; Mention and Friend remain unimplemented.

Only add a user-facing changelog entry if current repository convention records unreleased local features there. Label it unreleased; do not imply it is online.

- [ ] **Step 7: Commit documentation only**

```powershell
git add HANDOFF.md app/settings/changelog/page.tsx
git commit -m "docs: record relationship phase two"
```

Only stage the changelog file if it changed.

- [ ] **Step 8: Stop and report**

Output `PHASE 2 LOCAL COMPLETE` and report:

1. Files changed and migration added.
2. Database notification transaction behavior.
3. Public counts/list privacy boundary.
4. Room controls and all UI states.
5. Mailbox follow-request behavior.
6. Follow privacy setting behavior.
7. Test, lint, type-check, build, browser, and database results.
8. Current branch, HEAD, and commits ahead of origin.
9. Production migration/deployment status.
10. Remaining TODOs and any architecture conflicts.

Do not push, deploy, apply the Production migration, or begin another relationship phase.
