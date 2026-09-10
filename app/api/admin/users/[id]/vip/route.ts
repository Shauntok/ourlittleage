import { NextResponse } from "next/server";
import { z } from "zod";

import {
  canManageVipMembership,
  canViewVipMembership,
  getAdminActor,
} from "@/lib/admin/authorization";
import {
  cancelVip,
  extendVip,
  getVipAdminOverview,
  grantVip,
  revokeVip,
  VipServiceError,
} from "@/lib/vip/service";

const residentIdSchema = z.uuid();
const pageSchema = z.coerce.number().int().min(1).max(1_000_000);
const commonMutationFields = {
  reason: z.string().trim().min(1).max(500),
  requestId: z.uuid(),
};
const mutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("grant"),
    durationDays: z.number().int().min(1).max(3650),
    ...commonMutationFields,
  }).strict(),
  z.object({
    action: z.literal("extend"),
    durationDays: z.number().int().min(1).max(3650),
    ...commonMutationFields,
  }).strict(),
  z.object({ action: z.literal("cancel"), ...commonMutationFields }).strict(),
  z.object({ action: z.literal("revoke"), ...commonMutationFields }).strict(),
]);

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: Context) {
  try {
    const actor = await getAdminActor();
    if (!actor) return json({ error: "Unauthorized" }, 401);
    if (!canViewVipMembership(actor.role)) {
      return json({ error: "Forbidden" }, 403);
    }

    const residentId = residentIdSchema.safeParse((await params).id);
    const page = pageSchema.safeParse(new URL(request.url).searchParams.get("page") || "1");
    if (!residentId.success || !page.success) {
      return json({ error: "Invalid request" }, 400);
    }

    const overview = await getVipAdminOverview(residentId.data, page.data);
    return json({ overview });
  } catch (error) {
    return serviceErrorResponse(error, "VIP membership read failed");
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const actor = await getAdminActor();
    if (!actor) return json({ error: "Unauthorized" }, 401);
    if (!canManageVipMembership(actor.role)) {
      return json({ error: "Forbidden" }, 403);
    }

    const residentId = residentIdSchema.safeParse((await params).id);
    const mutation = mutationSchema.safeParse(await request.json());
    if (!residentId.success || !mutation.success) {
      return json({ error: "Invalid request" }, 400);
    }

    const { action, reason, requestId } = mutation.data;
    const result =
      action === "grant"
        ? await grantVip(residentId.data, {
            durationDays: mutation.data.durationDays,
            reason,
            requestId,
          })
        : action === "extend"
          ? await extendVip(residentId.data, {
              durationDays: mutation.data.durationDays,
              reason,
              requestId,
            })
          : action === "cancel"
            ? await cancelVip(residentId.data, { reason, requestId })
            : await revokeVip(residentId.data, { reason, requestId });

    return json({ result });
  } catch (error) {
    return serviceErrorResponse(error, "VIP membership mutation failed");
  }
}

function serviceErrorResponse(error: unknown, logMessage: string) {
  if (error instanceof VipServiceError) {
    if (error.kind === "forbidden") return json({ error: "Forbidden" }, 403);
    if (error.kind === "not_found") return json({ error: "Resident not found" }, 404);
    if (error.kind === "invalid_input") return json({ error: "Invalid request" }, 400);
  }

  console.error(logMessage, error);
  return json({ error: "VIP membership service unavailable" }, 500);
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
