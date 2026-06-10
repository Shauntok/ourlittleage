import { supabase } from "@/lib/supabase";
import type { TargetInfo } from "./types";

export async function fetchAdminReportsData(sortMode: "newest" | "oldest") {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let myRole = "user";

  if (user) {
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    myRole = myProfile?.role || "user";
  }

  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", {
      ascending: sortMode === "oldest",
    });

  if (error) {
    throw new Error(error.message);
  }

  let rows = data || [];

  const reporterIds = Array.from(
    new Set(rows.map((report: any) => report.reporter_id).filter(Boolean))
  );

  const { data: reporterProfiles } =
    reporterIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", reporterIds)
      : { data: [] as any[] };

  const reporterMap = new Map(
    (reporterProfiles || []).map((profile: any) => [profile.id, profile])
  );

  rows = rows.map((report: any) => ({
    ...report,
    reporter: reporterMap.get(report.reporter_id) || null,
  }));

  const targetMap: Record<string, TargetInfo> = {};

  await Promise.all(
    rows.map(async (report: any) => {
      if (!report.target_id || !report.target_type) {
        targetMap[report.id] = {
          title: "没有目标资料",
          desc: "这条举报没有 target_id 或 target_type。",
          href: "/admin/reports",
        };
        return;
      }

      if (report.target_type === "post") {
        const { data: post } = await supabase
          .from("posts")
          .select("id, title, slug, content, type, author_id")
          .eq("id", report.target_id)
          .maybeSingle();

        if (!post) {
          targetMap[report.id] = {
            title: "目标内容不存在",
            desc: "这篇文章 / 日记可能已经被删除。",
            href: "/admin/reports",
          };
          return;
        }

        let authorRole = "user";

        if (post.author_id) {
          const { data: authorProfile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", post.author_id)
            .maybeSingle();

          authorRole = authorProfile?.role || "user";
        }

        targetMap[report.id] = {
          title: post.type === "diary" ? "日记" : post.title || "无标题文章",
          desc: post.content ? String(post.content).slice(0, 160) : "没有内容预览。",
          href:
            post.type === "diary"
              ? `/diary/${post.id}`
              : post.slug
              ? `/articles/${post.slug}`
              : "/admin/reports",
          authorId: post.author_id,
          authorRole,
          canHidePost: true,
        };

        return;
      }

      if (report.target_type === "comment") {
        const { data: comment } = await supabase
          .from("comments")
          .select("id, post_id, author_id, content")
          .eq("id", report.target_id)
          .maybeSingle();

        if (!comment) {
          targetMap[report.id] = {
            title: "目标评论不存在",
            desc: "这条评论可能已经被删除。",
            href: "/admin/comments",
          };
          return;
        }

        let authorRole = "user";
        let authorName = "未知居民";

        if (comment.author_id) {
          const { data: authorProfile } = await supabase
            .from("profiles")
            .select("username, role")
            .eq("id", comment.author_id)
            .maybeSingle();

          authorRole = authorProfile?.role || "user";
          authorName = authorProfile?.username || "未知居民";
        }

        let parentTitle = "未知内容";
        let parentHref = "/admin/comments";

        if (comment.post_id) {
          const { data: parentPost } = await supabase
            .from("posts")
            .select("id, title, slug, type")
            .eq("id", comment.post_id)
            .maybeSingle();

          if (parentPost) {
            parentTitle =
              parentPost.type === "diary"
                ? "日记"
                : parentPost.title || "无标题文章";

            parentHref =
              parentPost.type === "diary"
                ? `/diary/${parentPost.id}`
                : parentPost.slug
                ? `/articles/${parentPost.slug}`
                : "/admin/comments";
          }
        }

        targetMap[report.id] = {
          title: "评论",
          desc: comment.content || "没有评论内容。",
          href: parentHref,
          authorId: comment.author_id,
          authorRole,
          authorName,
          parentTitle,
          parentHref,
          canHideComment: true,
        };

        return;
      }

      if (report.target_type === "user") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, username, bio, role")
          .eq("id", report.target_id)
          .maybeSingle();

        targetMap[report.id] = {
          title: profile?.username || "未知居民",
          desc: profile?.bio || "这个居民没有简介。",
          href: profile?.id ? `/admin/users/${profile.id}` : "/admin/users",
          authorId: profile?.id,
          authorRole: profile?.role || "user",
        };
      }
    })
  );

  const targetReportCountMap: Record<string, number> = {};

  rows.forEach((report: any) => {
    if (!report.target_type || !report.target_id) return;

    const key = `${report.target_type}:${report.target_id}`;
    targetReportCountMap[key] = (targetReportCountMap[key] || 0) + 1;
  });

  const visibleRows = rows.filter((report: any) => {
    const target = targetMap[report.id];

    if (target?.authorRole === "owner" && myRole !== "owner") {
      return false;
    }

    return true;
  });

  return {
    reports: visibleRows,
    targetMap,
    targetReportCountMap,
    currentRole: myRole,
  };
}