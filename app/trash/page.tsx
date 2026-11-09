import { redirect } from "next/navigation";

import TrashSkinClient from "@/components/trash/TrashSkinClient";
import {
  listOwnedTrashPosts,
  type TrashPost,
} from "@/lib/server/postTrash";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect("/");

  const now = new Date();
  let items: TrashPost[] = [];
  let loadError = false;

  try {
    items = await listOwnedTrashPosts(supabase, user.id, now);
  } catch {
    loadError = true;
  }

  return <TrashSkinClient items={items} serverNow={now.toISOString()} loadError={loadError} />;
}
