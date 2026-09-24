import { NextResponse } from "next/server";
import { z } from "zod";

import {
  canManageSecurityFirewall,
  getAdminActor,
} from "@/lib/admin/authorization";
import { transitionFirewallRequest } from "@/lib/security/firewall";
import { SecurityServiceError } from "@/lib/security/service";

const requestIdSchema = z.uuid();
const transitionSchema = z
  .object({
    action: z.enum([
      "confirm_external",
      "cancel",
      "mark_failed",
      "complete_observation",
    ]),
    externalRuleId: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/)
      .optional(),
    reason: z.string().trim().min(1).max(500),
    requestId: z.uuid(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.action === "confirm_external" && !value.externalRuleId) {
      context.addIssue({
        code: "custom",
        path: ["externalRuleId"],
        message: "External rule ID is required",
      });
    }
    if (value.action !== "confirm_external" && value.externalRuleId) {
      context.addIssue({
        code: "custom",
        path: ["externalRuleId"],
        message: "External rule ID is not allowed",
      });
    }
  });

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const actor = await getAdminActor();
    if (!actor) return json({ error: "Unauthorized" }, 401);
    if (!canManageSecurityFirewall(actor.role)) {
      return json({ error: "Forbidden" }, 403);
    }

    const id = requestIdSchema.safeParse((await params).id);
    const body = await readJson(request);
    if (!id.success || body === invalidJson) {
      return json({ error: "Invalid request" }, 400);
    }
    const input = transitionSchema.safeParse(body);
    if (!input.success) return json({ error: "Invalid request" }, 400);

    const result = await transitionFirewallRequest(id.data, input.data);
    return json({ result });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

const invalidJson = Symbol("invalid-json");

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return invalidJson;
  }
}

function serviceErrorResponse(error: unknown) {
  if (error instanceof SecurityServiceError) {
    if (error.kind === "forbidden") return json({ error: "Forbidden" }, 403);
    if (error.kind === "not_found") {
      return json({ error: "Firewall request not found" }, 404);
    }
    if (error.kind === "conflict") {
      return json({ error: "Firewall request conflict" }, 409);
    }
    if (error.kind === "invalid_input") {
      return json({ error: "Invalid request" }, 400);
    }
  }

  console.error("Firewall request transition failed");
  return json({ error: "Security service unavailable" }, 500);
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
