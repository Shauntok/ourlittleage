import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAdminActor } from "@/lib/admin/authorization";
import {
  applyResidentSecurityAction,
  getResidentSecurity,
  getSecurityOverview,
  SecurityServiceError,
} from "./service";

vi.mock("@/lib/admin/authorization", () => ({
  getAdminActor: vi.fn(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: { rpc: vi.fn(), from: vi.fn() },
}));

const owner = { id: "40000000-0000-4000-8000-000000000001", role: "owner" };
const admin = { id: "40000000-0000-4000-8000-000000000002", role: "admin" };
const residentId = "40000000-0000-4000-8000-000000000003";
const requestId = "41000000-0000-4000-8000-000000000001";

const eventRow = {
  id: "42000000-0000-4000-8000-000000000001",
  event_type: "risk_level_changed",
  category: "admin",
  user_id: residentId,
  username: "resident-a",
  actor_id: owner.id,
  actor_username: "owner-a",
  reason: "Manual review",
  severity: "high",
  source: "security_center_manual",
  metadata: { previous: { risk_level: "low" } },
  occurred_at: "2026-09-12T10:00:00.000Z",
};

const overviewRow = {
  flags: {
    security_center_enabled: true,
    security_event_collection_enabled: true,
    risk_evaluation_enabled: false,
    automatic_enforcement_enabled: false,
  },
  pending_review_count: 2,
  risk_counts: { low: 8, medium: 2, high: 1, critical: 0 },
  events: { items: [eventRow], total: 1, page: 1, page_size: 20 },
};

const residentRow = {
  profile: {
    user_id: residentId,
    risk_level: "high",
    review_status: "pending",
    last_event_at: "2026-09-12T10:00:00.000Z",
    last_reviewed_at: null,
    reviewed_by: null,
    notes: "Internal note",
    updated_at: "2026-09-12T10:00:00.000Z",
  },
  events: { items: [eventRow], total: 1, page: 1, page_size: 10 },
};

type QueryResult = {
  data?: unknown;
  error: unknown;
  count?: number | null;
};

function createClient({
  overview = overviewRow,
  resident = residentRow,
  rpcError = null,
  moderationError = false,
}: {
  overview?: unknown;
  resident?: unknown;
  rpcError?: unknown;
  moderationError?: boolean;
} = {}) {
  const rpc = vi.fn(async (name: string) => {
    if (rpcError) return { data: null, error: rpcError };
    if (name === "security_admin_get_overview") {
      return { data: overview, error: null };
    }
    if (name === "security_admin_get_resident") {
      return { data: resident, error: null };
    }
    if (name === "security_owner_apply_risk_action") {
      return {
        data: { idempotent: false, profile: residentRow.profile, event: eventRow },
        error: null,
      };
    }
    return { data: null, error: new Error(`Unexpected RPC: ${name}`) };
  });

  const from = vi.fn((table: string) => {
    if (table === "comment_moderation_keywords") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(async (_field: string, active: boolean): Promise<QueryResult> => ({
            data: null,
            count: active ? 4 : 2,
            error: moderationError ? new Error("keyword unavailable") : null,
          })),
        })),
      };
    }

    if (table === "comment_moderation_flags") {
      return {
        select: vi.fn((_columns: string, options?: { head?: boolean }) => {
          if (options?.head) {
            return {
              eq: vi.fn(async (): Promise<QueryResult> => ({
                data: null,
                count: 6,
                error: moderationError ? new Error("flags unavailable") : null,
              })),
            };
          }

          return {
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(async (): Promise<QueryResult> => ({
                  data: [
                    {
                      comment_id: "comment-1",
                      matched_keywords: ["词语一"],
                      detected_at: "2026-09-12T09:00:00.000Z",
                    },
                    {
                      comment_id: "comment-2",
                      matched_keywords: ["词语二", "词语三"],
                      detected_at: "2026-09-12T08:00:00.000Z",
                    },
                  ],
                  error: moderationError ? new Error("recent unavailable") : null,
                })),
              })),
            })),
          };
        }),
      };
    }

    if (table === "comments") {
      return {
        select: vi.fn(() => ({
          in: vi.fn(async (): Promise<QueryResult> => ({
            data: [
              {
                id: "comment-1",
                author_id: residentId,
                profiles: { username: "resident-a" },
              },
              {
                id: "comment-2",
                author_id: "40000000-0000-4000-8000-000000000004",
                profiles: [{ username: "resident-b" }],
              },
            ],
            error: moderationError ? new Error("comments unavailable") : null,
          })),
        })),
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  return { rpc, from };
}

describe("Security Center service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAdminActor).mockResolvedValue(owner);
  });

  it("maps the protected overview and bounded word detection summary", async () => {
    const client = createClient();

    await expect(getSecurityOverview(1, client as never)).resolves.toEqual({
      flags: {
        securityCenterEnabled: true,
        securityEventCollectionEnabled: true,
        riskEvaluationEnabled: false,
        automaticEnforcementEnabled: false,
      },
      pendingReviewCount: 2,
      riskCounts: { low: 8, medium: 2, high: 1, critical: 0 },
      events: {
        items: [
          {
            id: eventRow.id,
            eventType: "risk_level_changed",
            userId: residentId,
            username: "resident-a",
            actorId: owner.id,
            actorUsername: "owner-a",
            reason: "Manual review",
            severity: "high",
            occurredAt: eventRow.occurred_at,
            metadata: eventRow.metadata,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      },
      wordDetection: {
        available: true,
        activeKeywords: 4,
        inactiveKeywords: 2,
        pendingComments: 6,
        recentMatches: [
          {
            commentId: "comment-1",
            residentId,
            username: "resident-a",
            matchedKeywords: ["词语一"],
            detectedAt: "2026-09-12T09:00:00.000Z",
          },
          {
            commentId: "comment-2",
            residentId: "40000000-0000-4000-8000-000000000004",
            username: "resident-b",
            matchedKeywords: ["词语二", "词语三"],
            detectedAt: "2026-09-12T08:00:00.000Z",
          },
        ],
      },
    });

    expect(client.rpc).toHaveBeenCalledWith("security_admin_get_overview", {
      p_actor_id: owner.id,
      p_page: 1,
      p_page_size: 20,
    });
  });

  it("fails closed when feature flags are malformed", async () => {
    const client = createClient({
      overview: { ...overviewRow, flags: { security_center_enabled: "yes" } },
    });

    const result = await getSecurityOverview(1, client as never);

    expect(result.flags).toEqual({
      securityCenterEnabled: false,
      securityEventCollectionEnabled: false,
      riskEvaluationEnabled: false,
      automaticEnforcementEnabled: false,
    });
  });

  it("keeps moderation failures local to the word detection section", async () => {
    const client = createClient({ moderationError: true });

    const result = await getSecurityOverview(1, client as never);

    expect(result.events.total).toBe(1);
    expect(result.wordDetection).toEqual({ available: false });
  });

  it("allows Admin reads but rejects Moderator reads before RPC", async () => {
    vi.mocked(getAdminActor).mockResolvedValueOnce(admin);
    const adminClient = createClient();
    await expect(getSecurityOverview(1, adminClient as never)).resolves.toBeTruthy();

    vi.mocked(getAdminActor).mockResolvedValueOnce({
      id: "40000000-0000-4000-8000-000000000005",
      role: "moderator",
    });
    const moderatorClient = createClient();
    await expect(getSecurityOverview(1, moderatorClient as never)).rejects.toMatchObject({
      kind: "forbidden",
    });
    expect(moderatorClient.rpc).not.toHaveBeenCalled();
  });

  it("validates overview pages before reading actor or data", async () => {
    const client = createClient();

    await expect(getSecurityOverview(0, client as never)).rejects.toMatchObject({
      kind: "invalid_input",
    });
    expect(getAdminActor).not.toHaveBeenCalled();
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("strictly maps resident security data", async () => {
    const client = createClient();

    const result = await getResidentSecurity(residentId, 1, client as never);

    expect(result.profile).toEqual({
      userId: residentId,
      riskLevel: "high",
      reviewStatus: "pending",
      lastEventAt: "2026-09-12T10:00:00.000Z",
      lastReviewedAt: null,
      reviewedBy: null,
      notes: "Internal note",
      updatedAt: "2026-09-12T10:00:00.000Z",
    });
    expect(client.rpc).toHaveBeenCalledWith("security_admin_get_resident", {
      p_actor_id: owner.id,
      p_user_id: residentId,
      p_page: 1,
      p_page_size: 10,
    });
  });

  it("rejects invalid resident ids before calling RPC", async () => {
    const client = createClient();

    await expect(getResidentSecurity("not-a-uuid", 1, client as never)).rejects.toBeInstanceOf(
      SecurityServiceError
    );
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("normalizes Owner mutations and returns the refreshed resident view", async () => {
    const client = createClient();

    const result = await applyResidentSecurityAction(
      residentId,
      {
        action: "set_note",
        note: "  Internal note  ",
        reason: "  Review context updated  ",
        requestId,
      },
      client as never
    );

    expect(result.profile.userId).toBe(residentId);
    expect(client.rpc).toHaveBeenNthCalledWith(1, "security_owner_apply_risk_action", {
      p_actor_id: owner.id,
      p_user_id: residentId,
      p_action: "set_note",
      p_risk_level: null,
      p_review_status: null,
      p_note: "Internal note",
      p_reason: "Review context updated",
      p_request_id: requestId,
    });
    expect(client.rpc).toHaveBeenNthCalledWith(2, "security_admin_get_resident", {
      p_actor_id: owner.id,
      p_user_id: residentId,
      p_page: 1,
      p_page_size: 10,
    });
  });

  it("keeps Admin read-only and rejects invalid action input before RPC", async () => {
    vi.mocked(getAdminActor).mockResolvedValue(admin);
    const adminClient = createClient();
    await expect(
      applyResidentSecurityAction(
        residentId,
        { action: "set_risk", riskLevel: "high", reason: "Review", requestId },
        adminClient as never
      )
    ).rejects.toMatchObject({ kind: "forbidden" });
    expect(adminClient.rpc).not.toHaveBeenCalled();

    vi.mocked(getAdminActor).mockResolvedValue(owner);
    const invalidClient = createClient();
    await expect(
      applyResidentSecurityAction(
        residentId,
        { action: "set_risk", riskLevel: "invalid", reason: "Review", requestId } as never,
        invalidClient as never
      )
    ).rejects.toMatchObject({ kind: "invalid_input" });
    expect(invalidClient.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["42501", "forbidden"],
    ["P0002", "not_found"],
    ["22023", "invalid_input"],
    ["XX000", "internal"],
  ])("maps database error %s to %s", async (code, kind) => {
    const client = createClient({ rpcError: { code } });

    await expect(getResidentSecurity(residentId, 1, client as never)).rejects.toMatchObject({
      kind,
    });
  });
});
