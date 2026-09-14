import type { SupabaseClient } from "@supabase/supabase-js";

import { getTrashCutoff } from "@/lib/posts/trash";

export type TrashPost = {
  id: number;
  type: "diary" | "article";
  title: string | null;
  content: string | null;
  status: "draft" | "published";
  visibility: string | null;
  deleted_at: string;
  created_at: string;
  edited_at: string | null;
  published_at: string | null;
};

export async function listOwnedTrashPosts(
  client: Pick<SupabaseClient, "from">,
  residentId: string,
  now = new Date()
) {
  const { data, error } = await client
    .from("posts")
    .select(
      "id, type, title, content, status, visibility, deleted_at, created_at, edited_at, published_at"
    )
    .eq("author_id", residentId)
    .in("type", ["diary", "article"])
    .not("deleted_at", "is", null)
    .gt("deleted_at", getTrashCutoff(now).toISOString())
    .order("deleted_at", { ascending: false });

  if (error) throw error;

  return (data || []) as TrashPost[];
}

export async function softDeleteOwnedPost(
  client: Pick<SupabaseClient, "from">,
  residentId: string,
  postId: number,
  now = new Date()
) {
  const timestamp = now.toISOString();
  const { data, error } = await client
    .from("posts")
    .update({
      deleted_at: timestamp,
      deleted_by: residentId,
      delete_reason: "author_soft_delete",
      edited_at: timestamp,
    })
    .eq("id", postId)
    .eq("author_id", residentId)
    .in("type", ["diary", "article"])
    .is("deleted_at", null)
    .select("id, type, status")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Content is unavailable");

  return data;
}

export async function restoreOwnedPost(
  client: Pick<SupabaseClient, "from">,
  residentId: string,
  postId: number,
  now = new Date()
) {
  const { data, error } = await client
    .from("posts")
    .update({
      deleted_at: null,
      deleted_by: null,
      delete_reason: null,
      edited_at: now.toISOString(),
    })
    .eq("id", postId)
    .eq("author_id", residentId)
    .in("type", ["diary", "article"])
    .not("deleted_at", "is", null)
    .gt("deleted_at", getTrashCutoff(now).toISOString())
    .select("id, type, status")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Content is unavailable");

  return data;
}

export async function cleanupExpiredDeletedPosts(
  client: Pick<SupabaseClient, "from">,
  now = new Date()
) {
  const { count, error } = await client
    .from("posts")
    .delete({ count: "exact" })
    .in("type", ["diary", "article"])
    .not("deleted_at", "is", null)
    .lte("deleted_at", getTrashCutoff(now).toISOString());

  if (error) throw error;

  return count || 0;
}
