import { NextResponse } from "next/server";
import { z } from "zod";

import {
  canViewSecurityCenter,
  getAdminActor,
} from "@/lib/admin/authorization";
import {
  getSecurityOverview,
  SecurityServiceError,
} from "@/lib/security/service";

const pageSchema = z.coerce.number().int().min(1).max(1_000_000);

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = await getAdminActor();
    if (!actor) return json({ error: "Unauthorized" }, 401);
    if (!canViewSecurityCenter(actor.role)) {
      return json({ error: "Forbidden" }, 403);
    }

    const page = pageSchema.safeParse(
      new URL(request.url).searchParams.get("page") || "1"
    );
    if (!page.success) return json({ error: "Invalid request" }, 400);

    const overview = await getSecurityOverview(page.data);
    return json({ overview });
  } catch (error) {
    if (error instanceof SecurityServiceError) {
      if (error.kind === "forbidden") return json({ error: "Forbidden" }, 403);
      if (error.kind === "invalid_input") {
        return json({ error: "Invalid request" }, 400);
      }
    }

    console.error("Security overview read failed");
    return json({ error: "Security service unavailable" }, 500);
  }
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
