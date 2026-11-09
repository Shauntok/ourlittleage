"use client";

import { RefreshCw } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import styles from "./AdminTopbar.module.css";

const sections: { path: string; label: string }[] = [
  { path: "/admin/sponsors/inquiries", label: "合作申请" },
  { path: "/admin/sponsors/new", label: "新增业配" },
  { path: "/admin/sponsors", label: "业配中心" },
  { path: "/admin/content", label: "内容管理" },
  { path: "/admin/edit", label: "编辑文章" },
  { path: "/admin/users", label: "居民管理" },
  { path: "/admin/reports", label: "举报中心" },
  { path: "/admin/comments", label: "评论管理" },
  { path: "/admin/feedback", label: "反馈中心" },
  { path: "/admin/announcements", label: "世界公告" },
  { path: "/admin/broadcast", label: "全站信件" },
  { path: "/admin/badges", label: "徽章管理" },
  { path: "/admin/growth", label: "成长记录" },
  { path: "/admin/security", label: "安全中心" },
  { path: "/admin/changelog", label: "后台更新日志" },
  { path: "/admin/logs", label: "操作日志" },
  { path: "/admin/profile", label: "我的资料" },
];

export default function AdminTopbar() {
  const pathname = usePathname();
  const [operator, setOperator] = useState<{ username: string; role: string } | null>(null);
  const [confirmRefresh, setConfirmRefresh] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadOperator() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("username, role").eq("id", user.id).single();
      if (active && data && ["owner", "admin", "moderator"].includes(data.role)) {
        setOperator({ username: data.username?.trim() || "未设置用户名", role: data.role });
      }
    }
    void loadOperator();
    return () => { active = false; };
  }, []);

  if (pathname === "/admin/homepage" || pathname === "/admin") return null;
  const section = sections.find(({ path }) => pathname === path || pathname.startsWith(`${path}/`));
  const detail = section && pathname !== section.path ? " / 详情" : "";

  function refresh() {
    if ((window as Window & { adminHasUnsavedChanges?: boolean }).adminHasUnsavedChanges) {
      setConfirmRefresh(true);
      return;
    }
    window.location.reload();
  }

  return <><header className={styles.topbar}>
    <div className={styles.breadcrumb}>后台管理 <span>/</span> <strong>{section?.label || "管理页面"}{detail}</strong></div>
    <div className={styles.actions}>
      <button type="button" onClick={refresh} className={styles.refresh}><RefreshCw size={14} aria-hidden="true"/>刷新</button>
      <span className={styles.identity} aria-label={operator ? `当前登录：${operator.username}，${operator.role}` : "正在读取登录身份"}>
        <b>{operator?.username || "读取中…"}</b>{operator && <small>{operator.role.toUpperCase()}</small>}
      </span>
    </div>
  </header><ConfirmDialog open={confirmRefresh} title="刷新这个页面？" description="你还有未保存的修改。刷新后，这些修改可能不会被保存。" confirmText="刷新" cancelText="继续编辑" danger onClose={() => setConfirmRefresh(false)} onConfirm={() => window.location.reload()}/></>;
}
