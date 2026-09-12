import "server-only";

export type AdminChangelogCategory =
  | "Admin"
  | "Security"
  | "Auth"
  | "Database"
  | "RLS"
  | "Moderation"
  | "Operations"
  | "Infrastructure"
  | "Internal Fix";

export type AdminChangelogEntry = {
  date: string;
  phase: string;
  title: string;
  category: AdminChangelogCategory;
  scope: string;
  status: "已完成" | "待部署" | "待验证";
  summary: string;
};

const adminChangelogEntries: readonly AdminChangelogEntry[] = [
  {
    date: "2026-09-12",
    phase: "Security Center Phase 1",
    title: "建立安全中心与人工复核基础",
    category: "Security",
    scope: "后台安全中心、居民管理房间与评论检测词库",
    status: "待部署",
    summary:
      "新增受保护的风险状态与人工复核记录，并把现有评论检测词库、待检查摘要及评论管理入口集中到安全中心。自动风险判断与自动处置仍保持关闭。",
  },
  {
    date: "2026-09-12",
    phase: "VIP Production Migration",
    title: "完成 VIP 基础与后台管理数据库部署",
    category: "Database",
    scope: "VIP 基础数据、后台管理、权限与审计",
    status: "已完成",
    summary:
      "依序完成 VIP Phase 1 与 Phase 2 数据库迁移及专用测试账号验证。Owner 写入、Admin 只读、角色限制、幂等与审计记录均符合预期；全部 VIP 功能开关继续关闭。",
  },
  {
    date: "2026-09-11",
    phase: "VIP Production Migration Gate",
    title: "完成 VIP 数据库迁移风险闸门",
    category: "Operations",
    scope: "Production migration 与恢复准备",
    status: "已完成",
    summary:
      "数据库写入曾因恢复条件待确认而暂停；负责人确认已知风险并再次批准后，按 Phase 1、验证、Phase 2、验证的顺序完成执行。全部 VIP 功能继续关闭。",
  },
  {
    date: "2026-09-11",
    phase: "VIP Production Readiness",
    title: "完成 VIP 上线前审查",
    category: "Operations",
    scope: "VIP 基础、后台管理与上线恢复计划",
    status: "已完成",
    summary:
      "完成 VIP Phase 1 与 Phase 2 的上线前依赖、安全、幂等与恢复审查；数据库变更随后于 2026-09-12 经独立批准并完成验证。全部 VIP 功能继续保持关闭。",
  },
  {
    date: "2026-09-10",
    phase: "VIP System V1 Phase 2",
    title: "新增居民 VIP 会员管理",
    category: "Admin",
    scope: "居民管理房间、会员操作与后台日志",
    status: "已完成",
    summary:
      "Owner 可在居民管理房间授予、延长、设为到期取消或立即撤销 VIP，Admin 可只读查看当前状态与最近记录；所有操作保留会员事件与后台审计日志。全局 VIP 权益继续关闭。",
  },
  {
    date: "2026-09-10",
    phase: "Changelog Foundation",
    title: "建立公开与后台更新日志分流",
    category: "Operations",
    scope: "更新日志维护、后台导航与访问权限",
    status: "已完成",
    summary:
      "建立服务器保护的后台更新日志，并明确居民可见、后台内部与技术交接三种记录的长期职责。",
  },
  {
    date: "2026-09-09",
    phase: "Admin Dashboard",
    title: "新增居民年龄分布",
    category: "Admin",
    scope: "后台控制中心",
    status: "已完成",
    summary:
      "控制中心可展开查看各年龄层居民人数，并将缺少生日或无法归类的记录独立显示。",
  },
  {
    date: "2026-09-09",
    phase: "Relationship Auth Hotfix",
    title: "修复关系操作的服务器身份一致性",
    category: "Auth",
    scope: "登录状态、居民房间与关系操作",
    status: "已完成",
    summary:
      "统一浏览器与服务器会话来源，修复居民已登录但关系操作无法正确识别身份的问题。",
  },
  {
    date: "2026-08-31",
    phase: "Content Operations",
    title: "补充有效阅读后台统计",
    category: "Admin",
    scope: "内容后台与居民管理房间",
    status: "已完成",
    summary:
      "后台可查看作品与居民作品累计有效阅读次数；统计使用有效停留与 12 小时去重，并接入 Google Analytics 与在线状态监测。公开页面继续默认不展示阅读数。",
  },
  {
    date: "2026-08-26",
    phase: "Comment Moderation",
    title: "完善留言审核工具",
    category: "Moderation",
    scope: "评论管理",
    status: "已完成",
    summary:
      "新增今日留言、异常字眼检测与自定义检测词库，并维持评论软删除后的清理流程。",
  },
  {
    date: "2026-08-25",
    phase: "Admin Operations",
    title: "完善后台操作与商业合作流程",
    category: "Operations",
    scope: "操作日志、业配排期与合作资料",
    status: "已完成",
    summary:
      "补充后台操作日志显示，修复部分后台开关状态，并将商业合作资料与业配排期集中到独立后台流程处理。",
  },
];

export function getAdminChangelogEntries() {
  return adminChangelogEntries;
}
