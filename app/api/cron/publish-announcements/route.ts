import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (process.env.CRON_SECRET) {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const now = new Date().toISOString();

    const { data: announcements, error: fetchError } = await supabaseAdmin
      .from("announcements")
      .select("*")
      .eq("publish_mode", "scheduled")
      .lte("scheduled_for", now)
      .is("sent_at", null);

    if (fetchError) throw fetchError;

    if (!announcements || announcements.length === 0) {
      return NextResponse.json({
        ok: true,
        published: 0,
        message: "No scheduled announcements",
        now,
      });
    }

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id");

    if (profilesError) throw profilesError;

    let publishedCount = 0;

    for (const announcement of announcements) {
      const publishTime = new Date().toISOString();

      const { error: updateError } = await supabaseAdmin
        .from("announcements")
        .update({
          is_active: true,
          published_at: publishTime,
          sent_at: publishTime,
        })
        .eq("id", announcement.id)
        .is("sent_at", null);

      if (updateError) throw updateError;

      const notifications = (profiles || []).map((profile: { id: string }) => ({
        user_id: profile.id,
        type: "announcement",
        title: announcement.title,
        content: announcement.content,
        is_read: false,
        is_starred: false,
        is_important: true,
      }));

      if (notifications.length > 0) {
        const { error: notifyError } = await supabaseAdmin
          .from("notifications")
          .insert(notifications);

        if (notifyError) throw notifyError;
      }

      await supabaseAdmin.from("admin_logs").insert({
        admin_id: null,
        action: "auto_publish_scheduled_announcement",
        target_type: "announcement",
        target_id: announcement.id,
        detail: `自动发布预约公告：${announcement.title}`,
      });

      publishedCount += 1;
    }

    return NextResponse.json({
      ok: true,
      published: publishedCount,
      now,
    });
  } catch (error: any) {
    console.error("publish-announcements cron error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}