"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpenText, Clock3, FileClock, Flag, Handshake,
  Home, LayoutDashboard, Mail, Megaphone, Menu, MessageSquareText,
  ScrollText, ShieldCheck, Sparkles, Users, X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import styles from "./AdminSidebar.module.css";

type AdminWindow = Window & { adminHasUnsavedChanges?: boolean };
type LinkItem = { href: string; label: string; icon: React.ReactNode; badge?: number };

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [pendingHref, setPendingHref] = useState("");
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [counts, setCounts] = useState({ reports: 0, feedbacks: 0, comments: 0 });

  useEffect(() => {
    async function refreshSidebar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        setCurrentRole(profile?.role || "user");
      }
      const [reports, feedbacks, comments] = await Promise.all([
        supabase.from("reports").select("id", { count: "exact", head: true }).neq("status", "resolved").neq("status", "rejected"),
        supabase.from("feedbacks").select("id", { count: "exact", head: true }).neq("status", "resolved").neq("status", "closed"),
        supabase.from("comment_moderation_flags").select("comment_id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      setCounts({ reports: reports.count || 0, feedbacks: feedbacks.count || 0, comments: comments.count || 0 });
    }
    void refreshSidebar();
    window.addEventListener("admin-counts-changed", refreshSidebar);
    return () => window.removeEventListener("admin-counts-changed", refreshSidebar);
  }, []);

  const isOwner = currentRole === "owner";
  const isAdmin = isOwner || currentRole === "admin";
  const isModerator = isAdmin || currentRole === "moderator";
  const groups: { title: string; items: LinkItem[]; visible: boolean }[] = [
    { title: "工作台", visible: true, items: [{ href: "/admin/homepage", label: "控制中心", icon: <LayoutDashboard /> }] },
    { title: "待处理", visible: isModerator, items: [
      { href: "/admin/reports", label: "举报中心", icon: <Flag />, badge: counts.reports },
      { href: "/admin/comments", label: "评论管理", icon: <MessageSquareText />, badge: counts.comments },
      { href: "/admin/feedback", label: "反馈中心", icon: <Mail />, badge: counts.feedbacks },
      ...(isAdmin ? [{ href: "/admin/sponsors/inquiries", label: "合作申请", icon: <Handshake /> }] : []),
    ] },
    { title: "内容", visible: isModerator, items: [
      { href: "/admin/content", label: "内容管理", icon: <BookOpenText /> },
      { href: "/admin/announcements", label: "世界公告", icon: <Megaphone /> },
      { href: "/admin/broadcast", label: "全站信件", icon: <Mail /> },
      ...(isAdmin ? [{ href: "/admin/sponsors", label: "业配中心", icon: <Handshake /> }] : []),
    ] },
    { title: "居民", visible: isModerator, items: [
      { href: "/admin/users", label: "居民管理", icon: <Users /> },
      ...(isAdmin ? [
        { href: "/admin/badges", label: "徽章管理", icon: <Sparkles /> },
        { href: "/admin/growth", label: "成长记录", icon: <Clock3 /> },
      ] : []),
    ] },
    { title: "系统", visible: isAdmin, items: [
      { href: "/admin/security", label: "安全中心", icon: <ShieldCheck /> },
      { href: "/admin/changelog", label: "后台更新日志", icon: <FileClock /> },
      ...(isOwner ? [{ href: "/admin/logs", label: "操作日志", icon: <ScrollText /> }] : []),
    ] },
  ];

  function navigate(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (!(window as AdminWindow).adminHasUnsavedChanges) { setMobileOpen(false); return; }
    event.preventDefault();
    setPendingHref(href);
    setShowLeaveDialog(true);
  }

  function confirmLeave() {
    if (!pendingHref) { setShowLeaveDialog(false); return; }
    (window as AdminWindow).adminHasUnsavedChanges = false;
    setShowLeaveDialog(false);
    setMobileOpen(false);
    router.push(pendingHref);
  }

  function active(href: string) {
    if (href === "/admin/sponsors" && pathname.startsWith("/admin/sponsors/inquiries")) return false;
    return pathname === href || pathname.startsWith(href + "/");
  }

  function navigation() {
    return <><div className={styles.brand}><span className={styles.mark}>小</span><span><strong>小时代</strong><small>MANAGEMENT</small></span></div>
      <nav aria-label="后台管理导航" className={styles.nav}>{groups.filter((group) => group.visible).map((group) => <section key={group.title} className={styles.group}><p>{group.title}</p>{group.items.map((item) => <Link key={item.href} href={item.href} onClick={(event) => navigate(event, item.href)} aria-current={active(item.href) ? "page" : undefined} className={`${styles.link} ${active(item.href) ? styles.active : ""}`}><span className={styles.icon}>{item.icon}</span><span>{item.label}</span>{item.badge ? <span className={styles.badge}>{item.badge > 99 ? "99+" : item.badge}</span> : null}</Link>)}</section>)}</nav>
      <div className={styles.bottom}><Link href="/home" onClick={(event) => navigate(event, "/home")}><Home size={15} aria-hidden="true"/>回居民首页</Link></div></>;
  }

  return <>
    <button type="button" aria-label="打开后台菜单" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)} className={styles.mobileTrigger}><Menu size={20}/></button>
    {mobileOpen && <button type="button" aria-label="关闭后台菜单" onClick={() => setMobileOpen(false)} className={styles.backdrop}/>}
    <aside className={`${styles.mobile} ${styles.light} ${mobileOpen ? styles.mobileOpen : ""}`}><button type="button" aria-label="关闭后台菜单" onClick={() => setMobileOpen(false)} className={styles.close}><X size={20}/></button>{navigation()}</aside>
    <aside data-testid="admin-sidebar-desktop" className={`${styles.desktop} ${styles.light}`}><div data-testid="admin-sidebar-desktop-panel" className={styles.panel}>{navigation()}</div></aside>
    <ConfirmDialog open={showLeaveDialog} title="离开这个页面？" description="你还有未保存的修改。离开后，这些修改可能不会被保存。" confirmText="离开" cancelText="继续编辑" danger onClose={() => setShowLeaveDialog(false)} onConfirm={confirmLeave}/>
  </>;
}
