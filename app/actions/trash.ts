"use server";

import { revalidatePath } from "next/cache";

import {
  restoreOwnedPost,
  softDeleteOwnedPost,
} from "@/lib/server/postTrash";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function trashPost(postId: number) {
  return mutateOwnedPost(postId, softDeleteOwnedPost);
}

export async function restorePost(postId: number) {
  return mutateOwnedPost(postId, restoreOwnedPost);
}

type PostMutation = typeof softDeleteOwnedPost;

async function mutateOwnedPost(postId: number, mutate: PostMutation) {
  if (!Number.isSafeInteger(postId) || postId <= 0) {
    return { ok: false as const, error: "这份内容暂时无法处理。" };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false as const, error: "请先登录。" };
  }

  try {
    await mutate(supabase, user.id, postId, new Date());
    revalidatePath("/trash");
    revalidatePath("/diary");
    revalidatePath("/articles");
    revalidatePath("/home");
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "这份内容暂时无法处理。" };
  }
}
