"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type AdminLink = {
  href: string;
  label: string;
  icon: string;
  badge?: number;
};

export default function AdminSidebar() {
  const pathname = usePathname();

  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [counts, setCounts] = useState({
    reports: 0,
    feedbacks: 0,
    comments: 0,
  });

  useEffect(() => {
    async function fetchAdminData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        setCurrentRole(profile?.role || "user");
      }

      const { count: reportsCount } = await supabase
        .from("reports")
        .select("id", {
          count: "exact",
          head: true,
        })
        .neq("status", "resolved")
        .neq("status", "rejected");

      const { count: feedbacksCount } = await supabase
        .from("feedbacks")
        .select("id", {
          count: "exact",
          head: true,
        })
        .neq("status", "resolved")
        .neq("status", "closed");

      const { count: commentsCount } = await supabase
        .from("comments")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("is_hidden", false)
        .eq("is_deleted", false);

      setCounts({
        reports: reportsCount || 0,
        feedbacks: feedbacksCount || 0,
        comments: commentsCount || 0,
      });
    }

    fetchAdminData();
  }, []);

  const overviewLinks: AdminLink[] = [
    {
      href: "/admin/homepage",
      label: "控制中心",
      icon: "📊",
    },
  ];

  const communityLinks: AdminLink[] = [
    {
      href: "/admin/users",
      label: "居民管理",
      icon: "👥",
    },
    {
      href: "/admin/comments",
      label: "评论管理",
      icon: "💬",
      badge: counts.comments,
    },
    {
      href: "/admin/reports",
      label: "举报中心",
      icon: "🚩",
      badge: counts.reports,
    },
    {
      href: "/admin/feedback",
      label: "反馈中心",
      icon: "💌",
      badge: counts.feedbacks,
    },
  ];

  const contentLinks: AdminLink[] = [
    {
      href: "/admin/content",
      label: "内容管理",
      icon: "📚",
    },
    {
      href: "/admin/announcements",
      label: "世界公告",
      icon: "📢",
    },
    {
      href: "/admin/broadcast",
      label: "全站信件",
      icon: "📬",
    },
  ];

  const growthLinks: AdminLink[] = [
    {
      href: "/admin/badges",
      label: "徽章管理",
      icon: "🎖️",
    },
    {
      href: "/admin/growth",
      label: "成长记录",
      icon: "✨",
    },
  ];

  const ownerLinks: AdminLink[] = [
    {
      href: "/admin/logs",
      label: "操作日志",
      icon: "📜",
    },
  ];

  const systemLinks: AdminLink[] = [
    {
      href: "/home",
      label: "回首页",
      icon: "🏠",
    },
  ];

  function handleNavigate(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!(window as any).adminHasUnsavedChanges) return;

    const confirmed = confirm(
      "你有未保存修改，确定要离开吗？"
    );

    if (!confirmed) {
      e.preventDefault();
    }
  }

  const isOwner = currentRole === "owner";
  const isAdmin = currentRole === "owner" || currentRole === "admin";
  const isModerator =
    currentRole === "owner" ||
    currentRole === "admin" ||
    currentRole === "moderator";

  function renderSection(title: string, links: AdminLink[]) {
    return (
      <div className="space-y-1.5">
        <p className="px-3 pt-3 text-[10px] uppercase tracking-[0.25em] text-zinc-600">
          {title}
        </p>

        <div className="space-y-1">
          {links.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavigate}
                className={
                  isActive
                    ? "group flex items-center gap-3 rounded-2xl bg-white px-2.5 py-2 font-bold text-black transition"
                    : "group flex items-center gap-3 rounded-2xl px-2.5 py-2 text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
                }
              >
                <span
                  className={
                    isActive
                      ? "flex h-7 w-7 items-center justify-center rounded-xl border border-black bg-black text-white transition"
                      : "flex h-7 w-7 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 transition group-hover:border-zinc-500"
                  }
                >
                  {item.icon}
                </span>

                <span className="font-medium text-[13px]">
                  {item.label}
                </span>

                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <aside className="hidden self-start lg:sticky lg:top-8 lg:block">
      <div className="w-56 rounded-3xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-2xl shadow-black/40">
        <p className="px-3 pb-3 text-xs tracking-[0.25em] text-zinc-500">
          ADMIN
        </p>

        <nav className="space-y-3">
          {renderSection("总览", overviewLinks)}

          {isModerator && renderSection("社区", communityLinks)}

          {isModerator && renderSection("内容", contentLinks)}

          {isAdmin && renderSection("成长", growthLinks)}

          {isOwner && renderSection("Owner", ownerLinks)}

          {renderSection("系统", systemLinks)}
        </nav>
      </div>
    </aside>
  );
}