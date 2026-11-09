"use client";

import Link from "next/link";
import { Search, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getMalaysiaTodayStart } from "@/lib/admin/commentModeration";
import { supabase } from "@/lib/supabase";
import styles from "./admin-homepage.module.css";

type Kind = "report" | "comment" | "feedback" | "inquiry";
type Filter = Kind | "all";
type QueueItem = { id: string; kind: Kind; title: string; source: string; at: string; href: string };
type Post = { id: string; title: string | null; type: string; status: string; visibility: string; created_at: string };
type Counts = { report: number; comment: number; feedback: number; inquiry: number };
type Summary = { residents: number; todayResidents: number; online: number; todayPosts: number; articles: number; diaries: number; todayComments: number; muted: number; banned: number };
type CountFilter = { op: "eq" | "gte" | "neq"; column: string; value: string };

const emptyCounts: Counts = { report: 0, comment: 0, feedback: 0, inquiry: 0 };
const emptySummary: Summary = { residents: 0, todayResidents: 0, online: 0, todayPosts: 0, articles: 0, diaries: 0, todayComments: 0, muted: 0, banned: 0 };
const labels: Record<Kind, string> = { report: "举报", comment: "评论", feedback: "反馈", inquiry: "合作" };
const filters: { key: Filter; label: string }[] = [{ key: "all", label: "全部" }, { key: "report", label: "举报" }, { key: "comment", label: "评论" }, { key: "feedback", label: "反馈" }, { key: "inquiry", label: "合作" }];

async function getCount(table: string, filters: CountFilter[] = []) {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  for (const filter of filters) query = query[filter.op](filter.column, filter.value);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

function time(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Kuala_Lumpur", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export default function AdminHomePage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [counts, setCounts] = useState<Counts>(emptyCounts);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [canSeeInquiries, setCanSeeInquiries] = useState(false);
  const [operator, setOperator] = useState<{ username: string; role: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const today = getMalaysiaTodayStart().toISOString();
      const onlineSince = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const [residents, todayResidents, online, todayPosts, articles, diaries, todayComments, muted, banned, reportCount, commentCount, feedbackCount, reportRows, flagRows, feedbackRows, postRows, actorResult] = await Promise.all([
        getCount("profiles"), getCount("profiles", [{ op: "gte", column: "created_at", value: today }]), getCount("profiles", [{ op: "gte", column: "last_seen_at", value: onlineSince }]),
        getCount("posts", [{ op: "gte", column: "created_at", value: today }]), getCount("posts", [{ op: "eq", column: "type", value: "article" }]), getCount("posts", [{ op: "eq", column: "type", value: "diary" }]),
        getCount("comments", [{ op: "gte", column: "created_at", value: today }]), getCount("profiles", [{ op: "eq", column: "status", value: "muted" }]), getCount("profiles", [{ op: "eq", column: "status", value: "banned" }]),
        getCount("reports", [{ op: "neq", column: "status", value: "resolved" }, { op: "neq", column: "status", value: "rejected" }]),
        getCount("comment_moderation_flags", [{ op: "eq", column: "status", value: "pending" }]),
        getCount("feedbacks", [{ op: "neq", column: "status", value: "resolved" }, { op: "neq", column: "status", value: "closed" }]),
        supabase.from("reports").select("id, reason, target_type, created_at").neq("status", "resolved").neq("status", "rejected").order("created_at", { ascending: false }).limit(8),
        supabase.from("comment_moderation_flags").select("comment_id, detected_at").eq("status", "pending").order("detected_at", { ascending: false }).limit(8),
        supabase.from("feedbacks").select("id, title, type, created_at").neq("status", "resolved").neq("status", "closed").order("created_at", { ascending: false }).limit(8),
        supabase.from("posts").select("id, title, type, status, visibility, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.auth.getUser(),
      ]);
      for (const result of [reportRows, flagRows, feedbackRows, postRows]) if (result.error) throw result.error;

      let canManageSponsors = false;
      if (actorResult.data.user) {
        const { data: profile } = await supabase.from("profiles").select("role, username").eq("id", actorResult.data.user.id).single();
        canManageSponsors = profile?.role === "owner" || profile?.role === "admin";
        setOperator(profile && ["owner", "admin", "moderator"].includes(profile.role)
          ? { username: profile.username?.trim() || "未设置用户名", role: profile.role }
          : null);
      } else {
        setOperator(null);
      }
      setCanSeeInquiries(canManageSponsors);
      let inquiries: { id: string; subject: string; partnerName: string; status: string; createdAt: string }[] = [];
      if (canManageSponsors) {
        const response = await fetch("/api/admin/sponsors/inquiries", { cache: "no-store" });
        if (response.ok) {
          const body = await response.json();
          if (Array.isArray(body.inquiries)) inquiries = body.inquiries;
        }
      }
      const openInquiries = inquiries.filter((item) => item.status === "pending" || item.status === "contacting");
      const nextQueue: QueueItem[] = [
        ...(reportRows.data || []).map((item) => ({ id: `report-${item.id}`, kind: "report" as const, title: item.reason || "新的内容举报", source: item.target_type || "举报中心", at: item.created_at, href: "/admin/reports" })),
        ...(flagRows.data || []).map((item) => ({ id: `comment-${item.comment_id}`, kind: "comment" as const, title: "一则留言等待人工审核", source: "评论审核", at: item.detected_at, href: "/admin/comments?filter=flagged" })),
        ...(feedbackRows.data || []).map((item) => ({ id: `feedback-${item.id}`, kind: "feedback" as const, title: item.title || "新的居民反馈", source: item.type || "意见反馈", at: item.created_at, href: "/admin/feedback" })),
        ...openInquiries.slice(0, 8).map((item) => ({ id: `inquiry-${item.id}`, kind: "inquiry" as const, title: item.subject || "新的合作申请", source: item.partnerName || "合作申请", at: item.createdAt, href: "/admin/sponsors/inquiries" })),
      ];
      nextQueue.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      setCounts({ report: reportCount, comment: commentCount, feedback: feedbackCount, inquiry: openInquiries.length });
      setSummary({ residents, todayResidents, online, todayPosts, articles, diaries, todayComments, muted, banned });
      setQueue(nextQueue);
      setPosts((postRows.data || []) as Post[]);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "后台数据暂时无法读取，请稍后重试。");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  // The initial read updates state only after the asynchronous dashboard queries resolve.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  function refresh() { setRefreshing(true); void load(); }
  const totalPending = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const visibleQueue = useMemo(() => queue.filter((item) => {
    const keyword = search.trim().toLocaleLowerCase();
    return (filter === "all" || item.kind === filter) && (!keyword || `${item.title} ${item.source} ${labels[item.kind]}`.toLocaleLowerCase().includes(keyword));
  }).slice(0, 6), [queue, filter, search]);

  return <div data-admin-dashboard className={styles.dashboard}>
    <header className={styles.topbar}><div className={styles.breadcrumb}>后台管理 <span>/</span> <strong>控制中心</strong></div><div className={styles.topActions}><label className={styles.searchBox}><Search size={15} aria-hidden="true"/><input aria-label="筛选本页面待处理记录" placeholder="筛选本页待处理记录…" value={search} onChange={(event) => setSearch(event.target.value)}/></label><button type="button" className={styles.refreshLink} disabled={refreshing} onClick={refresh}><RefreshCw size={14} aria-hidden="true"/>刷新</button><span className={styles.accountIdentity} aria-label={operator ? `当前登录：${operator.username}，${operator.role}` : "正在读取登录身份"}><span className={styles.accountName}>{operator?.username || "读取中…"}</span>{operator && <small>{operator.role.toUpperCase()}</small>}</span></div></header>
    <div className={styles.content}>
      <div className={styles.intro}><div><p className={styles.eyebrow}>INFORMATION DESK</p><h1>管理资料台</h1><p>需要处理的记录与社区近况，集中在一张清楚的工作表里。</p></div><div className={styles.introActions}><Link href="/admin/content" className={styles.outlineButton}>内容管理</Link><button type="button" onClick={refresh} disabled={refreshing} className={styles.primaryButton}>刷新数据</button></div></div>
      {error && <div role="alert" className={styles.error}>{error} <button type="button" onClick={refresh}>重试</button></div>}
      <section className={styles.metrics} aria-label="社区概况"><Metric label="待处理举报" value={counts.report} loading={loading} href="/admin/reports" priority/><Metric label="待审评论" value={counts.comment} loading={loading} href="/admin/comments?filter=flagged" priority/><Metric label="待回复反馈" value={counts.feedback} loading={loading} href="/admin/feedback" priority/><Metric label="新居民 / 今日" value={summary.todayResidents} loading={loading} href="/admin/users"/><Metric label="新作品 / 今日" value={summary.todayPosts} loading={loading} href="/admin/content"/><Metric label="当前在线" value={summary.online} loading={loading} href="/admin/users"/></section>
      <section className={styles.section} aria-labelledby="queue-title"><div className={styles.sectionHeader}><div><h2 id="queue-title">待处理记录</h2><span>共 {totalPending} 项</span></div><div className={styles.tabs} role="group" aria-label="筛选待处理类型">{filters.filter((item) => item.key !== "inquiry" || canSeeInquiries).map((item) => <button type="button" key={item.key} className={filter === item.key ? styles.tabActive : styles.tab} aria-pressed={filter === item.key} onClick={() => setFilter(item.key)}>{item.label} <span>{item.key === "all" ? totalPending : counts[item.key]}</span></button>)}</div></div><div className={styles.tableScroller}><table className={styles.table}><thead><tr><th>类型</th><th>事项</th><th>来源</th><th>收到时间</th><th>操作</th></tr></thead><tbody>{visibleQueue.map((item) => <tr key={item.id}><td><span className={`${styles.typeChip} ${styles[item.kind]}`}>{labels[item.kind]}</span></td><td className={styles.itemTitle}>{item.title}</td><td>{item.source}</td><td>{time(item.at)}</td><td><Link href={item.href}>去处理 →</Link></td></tr>)}</tbody></table>{!loading && visibleQueue.length === 0 && <p className={styles.empty}>{search ? "没有符合搜索的待处理记录。" : totalPending > 0 ? "这一类暂无最近记录。" : "目前没有待处理记录。"}</p>}{loading && <p className={styles.empty}>正在读取待处理记录…</p>}</div>{totalPending > queue.length && <p className={styles.moreHint}>这里只显示最近记录；完整列表请从左侧进入对应管理页。</p>}</section>
      <div className={styles.lowerGrid}><section className={styles.section} aria-labelledby="recent-title"><div className={styles.sectionHeader}><h2 id="recent-title">最近内容</h2><Link href="/admin/content">查看全部 →</Link></div><div className={styles.tableScroller}><table className={styles.table}><thead><tr><th>标题</th><th>类型</th><th>范围</th><th>时间</th></tr></thead><tbody>{posts.map((post) => <tr key={post.id}><td className={styles.itemTitle}><Link href={`/admin/content/${post.id}`}>{post.title?.trim() || (post.type === "diary" ? `日记 · ${time(post.created_at)}` : "无标题内容")}</Link></td><td>{post.type === "diary" ? "日记" : post.type === "article" ? "文章" : post.type}</td><td>{post.status === "draft" ? "草稿" : post.visibility === "public" ? "公开" : post.visibility === "private" ? "仅自己" : post.visibility === "neighbors" ? "仅邻居" : post.visibility === "hidden" ? "隐藏" : "仅链接"}</td><td>{time(post.created_at)}</td></tr>)}</tbody></table>{!loading && posts.length === 0 && <p className={styles.empty}>暂无内容。</p>}</div></section><section className={styles.section} aria-labelledby="snapshot-title"><div className={styles.sectionHeader}><h2 id="snapshot-title">今日运营摘要</h2></div><dl className={styles.summaryList}><div><dt>居民总数</dt><dd>{loading ? "—" : summary.residents}</dd></div><div><dt>文章 / 日记</dt><dd>{loading ? "—" : `${summary.articles} / ${summary.diaries}`}</dd></div><div><dt>今日评论</dt><dd>{loading ? "—" : summary.todayComments}</dd></div><div><dt>禁言 / 封禁</dt><dd>{loading ? "—" : `${summary.muted} / ${summary.banned}`}</dd></div>{canSeeInquiries && <div><dt>合作申请待处理</dt><dd>{loading ? "—" : counts.inquiry}</dd></div>}</dl></section></div>
      <p className={styles.footerNote}>小时代后台 · 数据以当前读取结果为准</p>
    </div>
  </div>;
}

function Metric({ label, value, loading, href, priority = false }: { label: string; value: number; loading: boolean; href: string; priority?: boolean }) {
  return <Link href={href} className={`${styles.metric} ${priority && value > 0 ? styles.metricPriority : ""}`}><span>{label}</span><strong>{loading ? "—" : value.toLocaleString("zh-CN")}</strong></Link>;
}
