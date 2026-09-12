import { NextResponse } from "next/server";
import { z } from "zod";

import {
  canManageSecurityRisk,
  canViewSecurityCenter,
  getAdminActor,
} from "@/lib/admin/authorization";
import {
  applyResidentSecurityAction,
  getResidentSecurity,
  SecurityServiceError,
} from "@/lib/security/service";

const residentIdSchema = z.uuid();
const pageSchema = z.coerce.number().int().min(1).max(1_000_000);
const commonFields = {
  reason: z.string().trim().min(1).max(500),
  requestId: z.uuid(),
};
const mutationSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("set_risk"),
      riskLevel: z.enum(["low", "medium", "high", "critical"]),
      ...commonFields,
    })
    .strict(),
  z
    .object({
      action: z.literal("set_review"),
      reviewStatus: z.enum(["no_review_required", "pending", "reviewed"]),
      ...commonFields,
    })
    .strict(),
  z
    .object({
      action: z.literal("set_note"),
      note: z.string().max(2000).nullable(),
      ...commonFields,
    })
    .strict(),
]);

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: Context) {
  try {
    const actor = await getAdminActor();
    if (!actor) return json({ error: "Unauthorized" }, 401);
    if (!canViewSecurityCenter(actor.role)) {
      return json({ error: "Forbidden" }, 403);
    }

    const residentId = residentIdSchema.safeParse((await params).id);
    const page = pageSchema.safeParse(
      new URL(request.url).searchParams.get("page") || "1"
    );
    if (!residentId.success || !page.success) {
      return json({ error: "Invalid request" }, 400);
    }

    const overview = await getResidentSecurity(residentId.data, page.data);
    return json({ overview });
  } catch (error) {
    return serviceErrorResponse(error, "Resident security read failed");
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const actor = await getAdminActor();
    if (!actor) return json({ error: "Unauthorized" }, 401);
    if (!canManageSecurityRisk(actor.role)) {
      return json({ error: "Forbidden" }, 403);
    }

    const residentId = residentIdSchema.safeParse((await params).id);
    const body = await request.json().catch(() => null);
    const mutation = mutationSchema.safeParse(body);
    if (!residentId.success || !mutation.success) {
      return json({ error: "Invalid request" }, 400);
    }

    const overview = await applyResidentSecurityAction(
      residentId.data,
      mutation.data
    );
    return json({ overview });
  } catch (error) {
    return serviceErrorResponse(error, "Resident security mutation failed");
  }
}

function serviceErrorResponse(error: unknown, operation: string) {
  if (error instanceof SecurityServiceError) {
    if (error.kind === "forbidden") return json({ error: "Forbidden" }, 403);
    if (error.kind === "not_found") {
      return json({ error: "Resident not found" }, 404);
    }
    if (error.kind === "invalid_input") {
      return json({ error: "Invalid request" }, 400);
    }
  }

  console.error(operation);
  return json({ error: "Security service unavailable" }, 500);
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
