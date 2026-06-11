import { supabase } from "@/lib/supabase";

export async function fetchUserDetailData(id: string) {
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  const { data: badgeData } = await supabase
    .from("user_badges")
    .select(`
      id,
      created_at,
      badges (
        id,
        name,
        color,
        description
      ),
      assigner:assigned_by (
        id,
        username
      )
    `)
    .eq("user_id", id);

  const { data: postsData } = await supabase
    .from("posts")
    .select(
      "id, title, slug, content, type, status, visibility, created_at, published_at"
    )
    .eq("author_id", id)
    .order("created_at", { ascending: false })
    .limit(8);

  const { data: commentsData } = await supabase
    .from("comments")
    .select(
      "id, content, post_id, created_at, is_hidden, is_deleted"
    )
    .eq("author_id", id)
    .order("created_at", { ascending: false })
    .limit(8);

  const { count: articleTotal } = await supabase
    .from("posts")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("author_id", id)
    .eq("type", "article");

  const { count: diaryTotal } = await supabase
    .from("posts")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("author_id", id)
    .eq("type", "diary");

  const { count: commentTotal } = await supabase
    .from("comments")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("author_id", id)
    .eq("is_deleted", false);

  const postIds = (postsData || []).map((post) =>
    String(post.id)
  );

  const commentIds = (commentsData || []).map((comment) =>
    String(comment.id)
  );

  const { data: reportsData } = await supabase
    .from("reports")
    .select(`
      *,
      profiles (
        username
      )
    `)
    .order("created_at", {
      ascending: false,
    })
    .limit(100);

  const filteredReports = (reportsData || []).filter(
    (report: any) => {
      const targetId = String(report.target_id || "");

      return (
        report.target_user_id === id ||
        report.reported_user_id === id ||
        report.user_id === id ||
        postIds.includes(targetId) ||
        commentIds.includes(targetId)
      );
    }
  );

  const { data: logsData } = await supabase
    .from("admin_logs")
    .select("*")
    .eq("target_type", "user")
    .eq("target_id", id)
    .order("created_at", {
      ascending: false,
    })
    .limit(8);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentRole = "user";

  if (user) {
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    currentRole = myProfile?.role || "user";
  }

  return {
    profileData,
    badgeData,
    postsData,
    commentsData,
    filteredReports,
    logsData,
    currentRole,

    stats: {
      articleTotal: articleTotal || 0,
      diaryTotal: diaryTotal || 0,
      commentTotal: commentTotal || 0,
      reportTotal: filteredReports.length,
    },
  };
}