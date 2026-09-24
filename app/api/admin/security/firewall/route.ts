import { NextResponse } from "next/server";
import { z } from "zod";

import {
  canManageSecurityFirewall,
  canViewSecurityCenter,
  getAdminActor,
} from "@/lib/admin/authorization";
import {
  createFirewallRequest,
  getFirewallRequests,
} from "@/lib/security/firewall";
import { SecurityServiceError } from "@/lib/security/service";

const pageSchema = z.coerce.number().int().min(1).max(1_000_000);
const statusSchema = z.enum([
  "all",
  "ended",
  "awaiting_external_publish",
  "active",
  "resolved",
  "cancelled",
  "failed",
]);
const requestBase = {
  reason: z.string().trim().min(1).max(500),
  requestId: z.uuid(),
};
const createSchema = z.discriminatedUnion("requestType", [
  z
    .object({
      requestType: z.literal("block_ip"),
      target: z.string().trim().min(1).max(200),
      hostnameScope: z.enum(["ourlittleage.com", "www.ourlittleage.com"]),
      ...requestBase,
    })
    .strict(),
  z
    .object({
      requestType: z.literal("block_cidr"),
      target: z.string().trim().min(1).max(200),
      hostnameScope: z.enum(["ourlittleage.com", "www.ourlittleage.com"]),
      ...requestBase,
    })
    .strict(),
  z
    .object({
      requestType: z.literal("unblock"),
      relatedRequestId: z.uuid(),
      ...requestBase,
    })
    .strict(),
  z
    .object({
      requestType: z.literal("rate_limit_observation"),
      pathMatchMode: z.enum(["exact", "prefix"]),
      pathPattern: z
        .string()
        .trim()
        .min(1)
        .max(200)
        .regex(/^\/(?!\/)/)
        .refine((value) => !value.includes("?") && !value.includes("#")),
      httpMethod: z.enum([
        "GET",
        "HEAD",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
      ]),
      windowSeconds: z.number().int().min(10).max(3600),
      requestThreshold: z.number().int().min(10).max(100000),
      proposedFollowupAction: z.enum(["rate_limit", "challenge", "deny"]),
      ...requestBase,
    })
    .strict(),
]);

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = await getAdminActor();
    if (!actor) return json({ error: "Unauthorized" }, 401);
    if (!canViewSecurityCenter(actor.role)) {
      return json({ error: "Forbidden" }, 403);
    }

    const query = new URL(request.url).searchParams;
    const page = pageSchema.safeParse(query.get("page") || "1");
    const status = statusSchema.safeParse(query.get("status") || "all");
    if (!page.success || !status.success) {
      return json({ error: "Invalid request" }, 400);
    }

    const requests = await getFirewallRequests(page.data, status.data);
    return json({ requests });
  } catch (error) {
    return serviceErrorResponse(error, "Firewall request read failed");
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getAdminActor();
    if (!actor) return json({ error: "Unauthorized" }, 401);
    if (!canManageSecurityFirewall(actor.role)) {
      return json({ error: "Forbidden" }, 403);
    }

    const body = await readJson(request);
    if (body === invalidJson) return json({ error: "Invalid request" }, 400);
    const input = createSchema.safeParse(body);
    if (!input.success) return json({ error: "Invalid request" }, 400);

    const result = await createFirewallRequest(input.data);
    return json({ result });
  } catch (error) {
    return serviceErrorResponse(error, "Firewall request creation failed");
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

function serviceErrorResponse(error: unknown, logMessage: string) {
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

  console.error(logMessage);
  return json({ error: "Security service unavailable" }, 500);
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
