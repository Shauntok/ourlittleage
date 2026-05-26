"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function PresenceHeartbeat() {
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    async function updateLastSeen() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      await supabase
        .from("profiles")
        .update({
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    updateLastSeen();

    interval = setInterval(() => {
      updateLastSeen();
    }, 60 * 1000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  return null;
}