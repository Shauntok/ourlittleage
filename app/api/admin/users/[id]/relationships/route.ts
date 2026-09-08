import { NextResponse } from "next/server";
import { z } from "zod";

import {
  canViewRelationships,
  getAdminActor,
} from "@/lib/admin/authorization";
import {
  getResidentRelationshipSummary,
  listResidentRelationships,
} from "@/lib/relationships/service";

const residentIdSchema = z.uuid();
const kindSchema = z.enum([
  "followers",
  "following",
  "mutual",
  "pending_received",
  "pending_sent",
]);
const pageSchema = z.coerce.number().int().min(1).max(1_000_000);

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: Context) {
  try {
    const actor = await getAdminActor(request);

    if (!actor) return json({ error: "Unauthorized" }, 401);
    if (!canViewRelationships(actor.role)) {
      return json({ error: "Forbidden" }, 403);
    }

    const parsedId = residentIdSchema.safeParse((await params).id);
    if (!parsedId.success) return json({ error: "Invalid request" }, 400);

    const url = new URL(request.url);
    const requestedKind = url.searchParams.get("kind");

    if (!requestedKind) {
      const summary = await getResidentRelationshipSummary(
        actor.id,
        parsedId.data
      );
      return json({ summary });
    }

    const kind = kindSchema.safeParse(requestedKind);
    const page = pageSchema.safeParse(url.searchParams.get("page") || "1");
    if (!kind.success || !page.success) {
      return json({ error: "Invalid request" }, 400);
    }

    const relationships = await listResidentRelationships(
      actor.id,
      parsedId.data,
      kind.data,
      page.data,
      20
    );
    return json({ relationships });
  } catch (error) {
    console.error("admin resident relationships read failed", error);
    return json({ error: "Unable to load resident relationships" }, 500);
  }
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
