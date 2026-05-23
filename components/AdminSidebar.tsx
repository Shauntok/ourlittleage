"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";


// ===== Sidebar 单个导航项目类型 =====
type AdminLink = {
  href: string;
  label: string;
  icon: string;
  badge?: number;
};



// ===== Admin 后台侧边导航 =====
export default function AdminSidebar() {
  const pathname = usePathname();

  // ===== 草稿数量，用来显示小红点 badge =====
  const [draftCount, setDraftCount] = useState(0);
  const [currentRole, setCurrentRole] =useState<string | null>(null);

  // ===== 读取后台提醒数量 =====
  useEffect(() => {
    async function fetchCounts() {
      const { count } = await supabase
        .from("posts")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("status", "draft");

      setDraftCount(count || 0);
    
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

    }

    fetchCounts();
  }, []);

  // ===== 总览 =====
  const overviewLinks: AdminLink[] = [
    {
      href: "/admin/homepage",
      label: "后台首页",
      icon: "📊",
    },
  ];

  // ===== 内容管理 =====
  const contentLinks: AdminLink[] = [
    {
      href: "/admin/write",
      label: "新建文章",
      icon: "✍️",
    },
    {
      href: "/admin/drafts",
      label: "草稿箱",
      icon: "📝",
      badge: draftCount,
    },
    {
      href: "/admin/published",
      label: "已发布",
      icon: "✅",
    },
    {
      href: "/admin/search",
      label: "搜索文章",
      icon: "🔍",
    },
  ];

  // ===== 未来社区管理，先预留视觉位置 =====
  const communityLinks: AdminLink[] = [
    {
      href: "/admin/comments",
      label: "评论",
      icon: "💬",
    },
    {
      href: "/admin/reports",
      label: "举报",
      icon: "🚩",
    },
    {
      href: "/admin/feedback",
      label: "反馈",
      icon: "💡",
    },
  ];

  const identityLinks: AdminLink[] = [
    {
      href: "/admin/badges",
      label: "徽章管理",
      icon: "🎖️",
    },

    {
      href: "/admin/users",
      label: "居民管理",
      icon: "👥",
    },
  ];

  const ownerLinks: AdminLink[] = [
    {
      href: "/admin/roles",
      label: "权限管理",
      icon: "👑",
    },
    {
      href: "/admin/logs",
      label: "操作日志",
      icon: "📜",
    },
  ];

  // ===== 系统 =====
  const systemLinks: AdminLink[] = [
    {
      href: "/",
      label: "回首页",
      icon: "🏠",
    },
  ];

  // ===== 离开页面前检查是否有未保存修改 =====
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
  const isAdmin =currentRole === "owner" || currentRole === "admin";
  const isModerator =currentRole === "owner" || currentRole === "admin" || currentRole === "moderator";

  // ===== 渲染一组导航 =====
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
                    ? "group flex items-center gap-3 rounded-2xl px-2.5 py-2 bg-white text-black font-bold transition"
                    : "group flex items-center gap-3 rounded-2xl px-2.5 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white transition"
                }
              >
                <span
                  className={
                    isActive
                      ? "flex h-7 w-7 items-center justify-center rounded-xl bg-black text-white border border-black transition"
                      : "flex h-7 w-7 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 group-hover:border-zinc-500 transition"
                  }
                >
                  {item.icon}
                </span>

                <span className="font-medium text-[13px]">
                  {item.label}
                </span>

                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                    {item.badge}
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
    <aside className="hidden lg:block sticky top-8 self-start">
      <div className="w-52 rounded-3xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-2xl shadow-black/40">
        <p className="px-3 pb-3 text-xs tracking-[0.25em] text-zinc-500">
          ADMIN
        </p>

        <nav className="space-y-3">
          {renderSection("总览", overviewLinks)}

          {isAdmin &&
            renderSection("内容管理", contentLinks)}

          {isModerator &&
            renderSection("社区管理", communityLinks)}

          {isAdmin &&
            renderSection("身份系统", identityLinks)}

          {isOwner && 
            renderSection("Owner", ownerLinks)}

          {renderSection("系统", systemLinks)}
        </nav>
      </div>
    </aside>
  );
}