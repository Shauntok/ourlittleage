import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { cleanupExpiredFirewallTargets } from "@/lib/security/firewall";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET is not configured for Firewall retention");
    return json({ error: "Service unavailable" }, 503);
  }

  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const received = Buffer.from(request.headers.get("authorization") || "");
  const authorized =
    expected.length === received.length && timingSafeEqual(expected, received);

  if (!authorized) return json({ error: "Unauthorized" }, 401);

  try {
    const anonymized = await cleanupExpiredFirewallTargets(100);
    return json({ ok: true, anonymized });
  } catch {
    console.error("Firewall retention cleanup failed");
    return json({ ok: false, error: "Firewall retention failed" }, 500);
  }
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
