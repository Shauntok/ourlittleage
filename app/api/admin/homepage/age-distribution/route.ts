import { NextResponse } from "next/server";

import {
  getMalaysiaDate,
  getResidentAgeDistribution,
} from "@/lib/admin/age-distribution";
import { getAdminActor } from "@/lib/admin/authorization";

const DASHBOARD_ROLES = new Set(["owner", "admin", "moderator"]);

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = await getAdminActor(request);

    if (!actor) return json({ error: "Unauthorized" }, 401);
    if (!DASHBOARD_ROLES.has(actor.role || "")) {
      return json({ error: "Forbidden" }, 403);
    }

    const distribution = await getResidentAgeDistribution(getMalaysiaDate());
    return json(distribution);
  } catch (error) {
    console.error("admin age distribution read failed", error);
    return json({ error: "Unable to load age distribution" }, 500);
  }
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
