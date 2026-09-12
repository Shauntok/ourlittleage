# HANDOFF

更新时间：2026-09-12

## Product Rules / Long-term Architecture

本章节记录已经确认、需要长期保留的产品与架构规则。除非项目负责人明确重新决策，否则未来开发不得把这些规则当作当前 TODO 自行改写，也不得因为相关功能尚未开发而忽略这些边界。

### 1. Relationship 基础原则

```text
Follow ≠ Friend
Mutual Follow ≠ Friend
Friend ≠ Follow Subscription
Mention ≠ Content Permission
Block Priority > Follow / Mutual / Mention / Friend
```

* Mutual 永远由双向 `accepted` Follow 动态计算，不建立独立 Mutual relation、table 或持久化状态。
* Friend System 未来必须使用独立 Friendship relation；互相关注不会自动成为朋友。
* Friendship 也不等于订阅对方内容。

### 2. Block System Future Rules

Block System 尚未开发，但实现优先级必须高于 Mention 与 Friend。

未来居民建立 Block 后：

* 双向 Follow 解除。
* Pending Follow Request 解除。
* Mutual 随双向 Follow 解除而自动消失。
* 禁止双方建立新的 Follow。
* 禁止双方建立新的 Mention。
* 相关旧 Mention Identity Link 解除。
* 作者原始内容中的文字不得因为 Block 被系统删除或修改。

Unblock 后不得自动恢复 Follow、Mutual、Pending 或已经解除的 Mention Identity Link。居民必须重新主动建立关系。

### 3. Mention System Future Rules

Mention System 尚未开发。未来至少支持以下 Mention Privacy：

```text
everyone
people_i_follow
mutuals
nobody
```

已经合法建立的历史 Mention：

* 普通 Unfollow 不自动删除。
* 失去 Mutual 不自动删除。
* 修改 Mention Privacy 默认不影响历史 Mention。
* 只有 Block、被 Mention 居民主动作解除身份关联、账号删除或必要的 Moderation Action，才可以强制解除 Identity Relation。
* 被 Mention 的居民可以解除自己的身份关联，但不能删除或修改作者内容中的文字。

Draft 中的 Mention 不通知。Publish 时必须按当时权限重新验证。

已发布内容普通编辑时，必须区分 Existing Mention 与 New Mention。旧的合法 Mention 不因后来 Follow Relationship 改变而重新失效。

同一 `content + target_user` 生命周期最多产生一次 Mention Notification，防止重复编辑造成通知骚扰。Mention 永远不能绕过 Content Visibility。

### 4. Friend System Future Rules

Friend System 尚未开发。

* Friendship 与 Follow 必须完全独立。
* Mutual Follow 不等于 Friend。
* Future Friendship 不默认强制双方 Follow。
* Friend Request、Friendship Privacy 和解除规则以后单独设计。

### 5. Future Content Type: 文案

「文案」尚未开发。已经确认：

* 是居民发布的独立 Content Type。
* 与 Article、Diary 并列。
* 玩法规则不同。
* 发布以后不能编辑。

当前不得实现文案，但未来 shared content architecture 不应永久假定只有 `article | diary`。Admin Resident Room、通知、广场等系统未来需要能够扩展支持文案。

### 6. Admin Resident Management Room 长期方向

`/admin/users/[id]` 长期作为 Resident 360° View，未来逐步汇集居民的大多数运营数据：

```text
Profile
Account Status
Role
EXP / Growth
Trust
Level
Badges
Articles
Diaries
Future 文案
Follow
Future Mention
Future Friend
Reports
Moderation
Admin Logs
```

不得展示任何认证秘密：

```text
Password
Password Hash
Access Token
Refresh Token
Session Token
Service Role Key
JWT Secret
API Secret
```

### 7. Future Security Center

以下方向已规划，但目前不开发：

```text
Admin
-> Security Center
-> IP Blocking
-> CIDR
-> Firewall Rules
-> Rate Limit
-> Security Logs
```

* 未来优先考虑连接 Vercel Firewall，而不是只实现应用层 IP Block。
* 所有 Firewall 管理操作必须写入 Audit Log。
* `Ban Resident ≠ Block IP`。
* 不得因为居民被 banned 就自动封锁其 IP。

### 8. Historical TODO Verification

以下事项历史上曾被规划或记录为问题，当前统一标记为 `Needs verification`。未来进入相关模块时，必须先检查当前代码与 Production 状态，再决定是否仍是 TODO；本轮不开发：

* Deleted Diary/Post Recycle Bin 与每日额度、今日状态的一致性。
* Scheduled Announcement Cron。
* Scheduled Broadcast。
* 简体/繁体 UI Switch。
* Profile Privacy。
* Badge / Title 后续扩展。
* muted / banned 居民友好提示。

### 9. Deployment State Terminology

以后 HANDOFF 必须分别记录以下状态，不得因为代码已经 push 就写成“已上线”：

```text
implemented
committed
pushed
migration applied
deployed
production verified
```

当前 Relationship Phase 2 状态：

```text
implementation complete
committed
merged to main
pushed
Production migration applied
Relationship Auth hotfix committed and pushed
latest Vercel deployment verification pending
production test-account flow paused pending hotfix verification
```

### 10. CHANGELOG POLICY

小时代长期区分三套记录：

* `HANDOFF.md` 是完整的技术交接与项目状态来源，记录实现、migration、RLS、Auth、权限、风险、部署与内部 TODO。
* Public Changelog 只记录普通居民能够看到或感受到的功能、体验与概括性修复，不得公开安全规则、权限实现、风控阈值或后台内部资料。
* Admin Changelog 记录 Owner/Admin 需要知道的后台、运营、Auth、安全、RLS、权限、Moderation 与 Infrastructure 变化，但仍不得记录 secret、token、password、API key 或任何认证凭证。

每一次实际产生代码、数据库或行为变化的任务，都必须执行以下判断并同步记录：

```text
Every implemented change must update HANDOFF.md.

Resident-facing change:
-> Public Changelog

Admin/Internal change:
-> Admin Changelog

Security/Risk/Auth/RLS/Permission internals:
-> Admin Changelog only

Mixed feature:
-> Split public and internal descriptions for each audience.
```

后续 Codex 完成实际开发任务时，最终报告必须包含 `CHANGELOG SYNC`，分别说明 HANDOFF、Public Changelog 与 Admin Changelog 是否更新以及分类原因。公开版本号继续按开发阶段累计，不因每个小修复频繁递增。

## 2026-09-10 Admin Changelog Foundation

当前状态：**implemented、committed、pushed，并已随 Production commit `02e7c48aea58c00dfe2095e7f97494102be90b0d` 部署验证。** 本次没有数据库变更，也不需要 Production migration。

* 新增 `/admin/changelog`，复用现有后台布局与侧栏，显示日期、阶段、类别、影响范围、状态与简要说明。
* Admin Changelog 数据位于 `server-only` 模块，不提供 Public API，也不会由 Public Changelog 页面引用。
* 页面在服务器端再次读取可信登录身份；Owner/Admin 可查看，Moderator、普通居民与未登录访客不能读取内容。侧栏入口同样只对 Owner/Admin 显示，但权限不依赖前端隐藏。
* Public Changelog 静态资料迁移到独立公开数据模块，并移除年龄统计、内容后台、留言审核工具、操作日志、业配后台等内部条目；居民可感知的功能与修复继续保留。
* Admin Changelog 初始整理了近期后台年龄统计、Relationship Auth 修复、有效阅读后台统计、留言审核与商业合作后台记录。本次分流本身只记录于 Admin Changelog，不增加 Public 版本号。
* 长期执行 `CHANGELOG POLICY`：任何实际项目变化必须更新 HANDOFF，再根据受众同步 Public、Admin 或两者分别描述。

## 2026-09-09 Relationship System V1 Phase 2

当前状态：**implementation complete、committed、已合并到 `main`、已 push，Production migration 已应用。** Production smoke test 已发现并修复 Browser/Server Auth Session 不同步问题；Auth hotfix commit `1960e7038b47fa672cedbe3fceb6c8fc1381ad34` 已 push。最新 Vercel deployment verification 与完整 production test-account flow 仍待完成，不得只因为 push 就标记为 production verified。

### 居民房间

* `/u/[username]` 显示公开的关注中与关注者数量，只统计 `accepted`，pending 不公开。
* 访客可关注、取消申请或取消关注；状态会区分关注、等待回应、已关注与互相关注。Mutual 仍由双向 accepted 动态计算，不保存额外字段或表。
* 未登录居民点击关注会先登录，成功后安全返回原房间；外部与异常 `returnTo` 会回退首页。
* 关注中与关注者名单在房间内分页显示，每页固定 20 条；房主可以取消关注或移除关注者，访客只能查看。
* 名单弹窗支持键盘焦点限制、Esc/背景关闭、关闭后焦点恢复与页面滚动锁定；加载、空资料与读取失败均有独立状态。

### 隐私与通知

* `/settings/privacy` 新增“任何居民可关注”与“关注需要批准”二选一；`follow_mode` 只通过现有 Server Action 保存，浏览器不直接更新该字段。
* 隐私保存任一路径失败或中断时，会重新读取服务器真实状态，不显示错误的成功结果；旧值或空值读取时安全回退为 `open`，不会自动写库。
* 新 migration 将 `notifications.relationship_id` 安全连接到 `user_follows`，删除关系后历史通知保留并把外键设为 null。
* open 关注、pending 申请、接受申请分别建立 `follow`、`follow_request`、`follow_accepted`；关系变化与通知处于同一数据库事务，重复请求不会生成重复通知。
* 关注通知继续进入现有“信箱”，不进入“互动回声”。申请卡可接受或拒绝，操作期间防止重复提交，完成后重新读取服务器状态。
* 接受申请后会进入“已读”并显示“已接受”；取消、拒绝或关系已不存在时不再提供操作按钮。取消关注、移除关注者、取消申请与拒绝申请不会额外发通知。
* 通知继续保留星标、重要、已读、删除与恢复能力；实时订阅只监听当前登录居民自己的通知。

### 数据与权限

* `user_follows` 仍是唯一关系来源，不新增 Mutual、Friend 或 Mention 表，也没有关系计数缓存。
* 新增 accepted-only 的公开汇总与分页读取 RPC；服务层校验 UUID、名单类型、页码与页长，公开响应只包含房间所需资料。
* 所有关系写操作仍由 Server Action 从登录 Session 取得 actor id，再调用仅授权 `service_role` 的状态转换 RPC；前端不能代表其他居民操作。
* `active` / `warned` 与减少关系的既有 Phase 1 规则保持不变；没有新增 Block、Friend、Mention、内容权限或「文案」行为。

### 本地验证与上线边界

* PGlite PostgreSQL 17 兼容隔离环境通过 Phase 1 核心回归与 Phase 2 通知事务测试；因本机没有 Docker/native PostgreSQL，上 Production 前仍必须在完整 disposable Supabase/PostgreSQL 环境再跑一次。
* Vitest：60 个测试文件、542 项测试全部通过；TypeScript、Phase 2 改动范围 ESLint、production build 与 `git diff --check` 通过。
* 全仓库 ESLint 仍有历史问题：本分支 183 errors / 50 warnings；对比基线 185 errors / 49 warnings，本阶段没有新增错误，新增警告为沿用现有运行时头像 `<img>` 方式。
* 本阶段最初的浏览器只读检查确认居民房间在 1280px 视口无横向溢出，关系读取失败状态不会拖垮房间；当时尚未进行 Production 写入测试。
* Phase 2 原开发分支：`codex/relationship-phase-2`；提交范围 `ba7ccef` 至 `b2fe365`，已通过提交 `2cece34` 合并到 `main` 并 push。Production migration 后续已受控应用；Auth hotfix 已 push，最新 Vercel 部署与完整测试账号闭环仍需单独核实。

### 后续

1. 核实 Auth hotfix commit `1960e7038b47fa672cedbe3fceb6c8fc1381ad34` 已由 Vercel 成功部署，不以 push 结果代替 deployment verification。
2. 用两个专用测试账号重新完成 login/refresh/session persistence，并继续 open、approval、accept、reject、cancel、unfollow、remove follower、隐私保存与通知实时更新 smoke test。
3. 测试完成后清理两个测试账号之间的关系资料，并单独记录 production verified 状态。
4. Block System 优先于 Mention 与 Friend；Mention 与 Friend 继续作为相互独立的后续阶段。

## 2026-09-08 Relationship System V1 Phase 1

已完成并上线的范围：Follow Core、Supabase 数据层、Server Actions，以及 `/admin/users/[id]` 中仅 Owner/Admin 可读取的 Relationship 区域。居民端 Follow UI、通知、Mention、Friend System 与「文案」均未开发。

### 数据与规则

* 新 migration：`20260908024825_relationship_follow_core.sql`，为 `profiles` 增加 `follow_mode`，并新增统一关系表 `user_follows`。
* Follow 为单向关系；状态仅有 `pending` 与 `accepted`；同一方向唯一且禁止关注自己。
* `open` 立即 accepted，`approval_required` 建立 pending；修改隐私模式不重算既有关系。
* Mutual 由双方 accepted 动态计算，不保存 `is_mutual`，也没有 mutual table 或计数缓存。
* 当前使用物理删除；unfollow、取消发出的 pending、拒绝收到的 pending、移除关注者彼此独立，不影响反方向关系。
* `active` / `warned` 可新增关注与接受申请；`muted` / `banned` / 未知状态禁止增加关系，但仍可减少既有关系。
* Block System 当前不存在，因此尚未连接；核心服务保留集中入口，未来接入时必须在新增关系前执行 Block 检查。

### 权限与后台

* 浏览器不能直接写入 `user_follows`，也不能直接调用关系状态转换 RPC；所有写操作由服务端从登录 Session 取得 actor id 后执行。
* RLS 只允许关系双方和 Owner/Admin 读取相关行；所有 `SECURITY DEFINER` RPC 固定空 `search_path`，并只授权 `service_role`。
* `/admin/users/[id]` 原有 Moderator 页面权限不变，但新的 Relationship API 与 Section 仅 Owner/Admin 可用，服务端会再次校验角色。
* 后台显示 Following、Followers、Mutual、Pending Received、Pending Sent 与 Follow Mode；明细按需读取并固定 20 条/页，显示头像、用户名、Resident UUID、状态与时间。
* Relationship 读取失败不会拖垮居民管理房间，会显示独立的错误与重新加载入口。

### 验证与部署边界

* 隔离 PostgreSQL 已验证 migration、约束、索引、RLS、状态转换、账号状态、动态 Mutual、管理员权限，以及并发 Follow 和 Accept/Cancel。
* Vitest：53 个测试文件、466 项测试通过；TypeScript、关系改动 focused ESLint、production build、`git diff --check` 通过。
* 全仓库 ESLint 仍有此前遗留的 185 errors / 49 warnings；本阶段没有扩大范围处理。
* migration 已于 2026-09-08 应用到 Production Supabase；远端记录为 `20260908105046_relationship_follow_core`，对应仓库文件 `20260908024825_relationship_follow_core.sql`。
* Vercel production 已自动部署提交 `6381ea7`，部署 `dpl_4nZcezVaVtC6puBNvd2FVkwCo8gx` 状态为 READY。
* 生产只读 smoke test 通过：主页与登入页返回 200，未登录访问 Relationship Admin API 返回 401，后台汇总与五种分页查询可正常读取，最近一小时未发现 Vercel runtime error。
* 生产环境没有写入测试关系或进行破坏性测试；migration 应用后 `user_follows` 为 0 行。

## 2026-09-01 近期交接总览

### 仓库与部署状态

* 当前分支：`main`。
* 截至 2026-09-09，本地 `main` 与 `origin/main` 已同步至 `5628cf1`。这只确认 Git pushed 状态，不代表最新 Vercel deployment 或 Production verification 已完成。
* 居民后台详情的「作品累计有效阅读」已在提交 `a1d64d1` 中完成并推送，不再属于未提交工作区。
* Relationship System V1 Phase 1 已 commit、push、deploy，Production Supabase migration 已应用。
* Relationship System V1 Phase 2 已 implementation complete、committed、合并并 push，Production migration 已应用；Auth hotfix `1960e7038b47fa672cedbe3fceb6c8fc1381ad34` 已 push，最新 Vercel deployment verification 与完整 production test-account flow 待完成。
* Alpha 0.9.8 已记录后台居民年龄分布、居民房间关系读取失败状态简化，以及信箱旧数据库结构兼容修复。
* 正式域名：`https://www.ourlittleage.com`。

### 手机端、图标与内容操作修复

* 浏览器 favicon 已改为与现有 Apple icon 一致，提交：`eb389b1`。
* Huawei P40 Pro 等手机在软键盘弹出时，登录输入框不再被异常推到页面顶部；改动只针对窄屏与移动键盘场景，电脑版布局保持不变，提交：`83b55a7`。
* 日记广场读取失败时不再误显示为空内容，并提供重新加载入口。
* 手机端文章与日记操作栏已稳定：自己的作品显示喜欢/分享各半；访客查看他人作品时显示喜欢/分享/举报三等分。
* 喜欢数量较大时采用稳定宽度与千、万、亿缩写，避免多位数造成按钮换行或跑位；辅助阅读仍保留完整数值。

### 公开内容分享

* 文章与日记统一分享面板已经完成并推送，不再是仅存在于本地的状态。
* 支持复制链接、系统原生分享，以及生成含故事开头预览的竖版 Story 分享图。
* Story 分享接口只允许读取 `published + public + 未删除` 的文章或日记；私人、隐藏、草稿与已删除内容不能生成公开分享图。
* 路由保持不变：文章使用 `/articles/[slug]`，日记使用 `/diary/[id]`。

### 有效阅读统计系统

已完成并推送的提交范围：`0c6b149` 至 `352652e`。

计数规则：

* 仅统计已发布、公开、未删除的文章与日记。
* 访客必须累计停留并实际显示页面内容 10 秒，隐藏标签页时间不计入。
* 同一阅读者对同一作品采用 12 小时去重；12 小时内重复进入不会持续增加。
* 登录作者阅读自己的作品不计数。
* 不保存 IP、设备信息、原始用户 ID 或原始匿名 Cookie；服务器使用 HMAC 生成不可直接识别居民的阅读者摘要。
* 公开页面默认不显示阅读数；精确数值只开放给 Owner/Admin 后台。
* 不补造历史阅读量；系统启用前的旧作品从零开始累计。

数据结构：

* 继续使用统一 `posts` 表，没有新增 articles 或 diaries 表。
* 私有统计表：`private.post_view_stats`、`private.post_view_daily`、`private.post_view_dedupe`。
* 私有 RPC：`record_effective_post_view`、`get_effective_post_view_counts`，只允许 `service_role` 执行。
* 去重记录每日清理，累计总数和 MYT 每日汇总保留。
* 必需服务器环境变量：`VIEWER_ID_SECRET`，必须为至少 32 字符的私密随机值；禁止使用 `NEXT_PUBLIC_` 前缀。

界面与接口：

* 公开计数入口：`POST /api/post-views`。
* Owner/Admin 批量读取入口：`GET /api/admin/content/view-counts`。
* `/admin/content` 每张文章或日记卡片右上角显示精确有效阅读数，不使用千、万缩写。
* 权限或读取失败时采用 fail-closed，界面显示「阅读数据暂不可用」，不会把失败伪装成 `0`。

验证记录：

* 数据库计数、12 小时边界、作者排除、内容状态、隐私权限与并发行为均有 pgTAP/自动化测试覆盖。
* 公开页面 10 秒可见停留、文章与日记接入、后台权限和精确显示均有 Vitest 覆盖。
* 正式构建通过。

### Google Analytics、Search Console 与网站监测

* Google Analytics 4 已接入 Root Layout，并通过环境变量 `NEXT_PUBLIC_GA_MEASUREMENT_ID` 配置。
* 当前 GA4 Measurement ID：`G-6QNWRT4M2Z`；CSP 已允许 Google Tag Manager 与 Google Analytics 所需来源。
* GA4 实时报告已经收到正式网站数据。
* Google Search Console 已验证 `ourlittleage.com`，canonical sitemap 保留 `https://www.ourlittleage.com/sitemap.xml`。
* 重复提交的非 `www` sitemap 已由负责人移除；当前 sitemap 状态成功，已发现约 50 个网页。
* Search Console 曾显示大量「已发现 - 尚未编入索引」，属于抓取/索引状态，不代表 sitemap 失败；需继续观察 Google 后续抓取。
* UptimeRobot 已建立 `https://www.ourlittleage.com` 的 HTTP 网站监测，免费方案采用 5 分钟间隔；当前状态为绿色正常。

### 已提交并推送：居民作品累计有效阅读

目标页面：`/admin/users/[id]` 的「完整资料」。

当前本地实现：

* 在最后一个资料格显示「作品累计有效阅读」。
* 汇总该居民所有未删除文章与日记的有效阅读次数，沿用 10 秒有效停留与 12 小时去重后的数据。
* 显示精确分组整数，例如 `12,438 次`，不使用缩写。
* 读取中显示「读取中...」；读取失败显示「阅读数据暂不可用」，不会显示错误的零。
* 仅 Owner/Admin 可以通过 `GET /api/admin/users/[id]/view-count` 读取。
* 没有新增数据库表或 migration，复用现有有效阅读统计 RPC，并支持大量作品分页与每批 200 个 ID 的查询上限。
* 当前验证：完整测试 48 个文件、438/438 tests 通过；TypeScript、focused ESLint、`git diff --check` 与 production build 通过。
* 状态：已在提交 `a1d64d1` 中 commit、push 并部署；Vercel production 历史已确认该提交为 READY。

### VIP System V1 Phase 1

当前状态：**implementation complete、local verification complete、已 commit（`eb2fc6f`）、push 到 `main`，并已包含在 Production commit `02e7c48aea58c00dfe2095e7f97494102be90b0d`。Production Supabase migration 已于 2026-09-12 应用并验证。**

* 新 migration：`20260909131821_vip_foundation.sql`。只建立 VIP Foundation，不修改 `profiles.role`，VIP 与 `owner/admin/moderator/user` 身份保持正交。
* `vip_feature_flags` 是服务端单例开关；`vip_entitlement_enabled`、`vip_public_ui_enabled`、`vip_purchase_enabled`、`vip_referral_reward_enabled`、`vip_public_badge_enabled` 全部默认并保持 `false`。缺行、异常或未知值按关闭处理。
* `vip_memberships` 每位居民最多一行当前状态，状态仅为 `active / cancelled / revoked`。有效权益由数据库可信时间动态判断：总开关开启、账号状态允许、`status = active`、`started_at <= now()`、`expires_at > now()`。
* `vip_membership_events` 保存只增不改的 `grant / extend / cancel / revoke` 事件。唯一 `request_id` 与事务锁保证重试不会重复改变状态或重复记账。
* `lib/vip/service.ts` 是统一的 server-only 入口，提供 flags、membership、entitlement、`isVipActive` 以及 Owner-only 的 grant/extend/cancel/revoke 核心操作。Owner/Admin actor 必须来自现有 Cookie Server Session；Admin 仅可读取核心状态，Moderator 与普通居民无 VIP 管理权限。
* RLS 已写入 migration；VIP 表和 RPC 不向 `anon/authenticated` 开放，写入只能走受控 service-role RPC，数据库内再次校验 Owner。事件表通过 trigger 阻止 UPDATE/DELETE。
* Phase 1 的 `cancelVip` 是立即取消；`cancel_at_period_end` 仅保留数据结构，未来语义尚未开放。grant/extend 使用明确时间，不把“月”硬编码为 30 天。
* 隔离 PGlite PostgreSQL 兼容环境已执行完整 migration，并在同一数据库连续两次通过 VIP SQL 回归；VIP Vitest 12/12、TypeScript、focused ESLint、production build 与 `git diff --check` 均通过。
* 本阶段没有购买、支付、Referral、公开 `/vip` 页面、公开 VIP 徽章、Admin VIP UI、Resident Detail 控制、营销、Security Center 或风险评分。
* Production 当前全部 VIP flags 仍为 OFF。migration applied 不等于 VIP enabled；启用任一居民权益、公开界面、购买、Referral 或徽章仍需后续独立审批。

### VIP System V1 Phase 2

当前状态：**implementation complete、local verification complete、已 commit（`02e7c48aea58c00dfe2095e7f97494102be90b0d`）、push 并部署至 Vercel Production（READY）。Phase 1 与 Phase 2 Production Supabase migration 已于 2026-09-12 依序应用并通过数据库/服务端 smoke verification。** 所有 VIP feature flags 继续保持 OFF，本阶段不是居民端公开功能。

* `/admin/users/[id]` 已接入 `VIP Membership` 区域。Owner/Admin 可查看储存状态、开始与到期时间、剩余时间、到期取消标记、数据库计算权益、最后更新时间及分页历史；储存状态与实际权益分开显示。
* Owner 可授予、延长、设为到期取消或立即撤销；Admin 只读；Moderator、普通居民与未登录访客不能读取。页面隐藏只用于体验，`/api/admin/users/[id]/vip`、server-only VIP service 与数据库 RPC 都会重新校验可信身份。
* Grant/Extend 只接收 `1..3650` 天，不接受浏览器时间。Grant 从数据库 `now()` 开始；active 会员从现有到期时间延长，已过期但储存状态仍为 active 时从数据库 `now()` 延长。cancelled/revoked 必须重新 Grant，不能用 Extend 暗中恢复。
* 到期取消保持 `status = active` 并设置 `cancel_at_period_end = true`，所以到期前权益判断不变；立即撤销设置 `status = revoked`。撤销前必须显示居民、当前到期时间、动作与原因的确认内容。
* 新 migration：`20260910133500_vip_admin_management.sql`。它依赖 Phase 1，向 `vip_membership_events` 增加内部 `request_payload`，并新增 `vip_admin_get_overview` 与 `vip_admin_apply_membership_action`。没有 DROP、TRUNCATE、数据清空或历史 migration 修改。
* `request_id`、事务级 advisory lock 与请求参数快照共同保证重复点击和不确定网络重试幂等。每次首次成功操作在同一数据库事务写入 append-only VIP event 与现有 `admin_logs`；动作名为 `vip_grant`、`vip_extend`、`vip_cancel_period_end`、`vip_revoke`。
* Admin VIP 历史只展示动作、管理员、原因、前后状态与时间，不向界面显示原始 JSON。现有后台操作日志也会把 VIP 日志转成人可读摘要，并隐藏内部 request/event 标识。
* 隔离 PGlite PostgreSQL 17 环境按顺序通过 Phase 1 migration、Phase 1 SQL test、Phase 2 migration 与 Phase 2 SQL test。权限矩阵、可信时间、active/expired 延长、到期取消、撤销、重复 request、双日志与 feature flag OFF 行为均有回归覆盖。
* 本阶段没有 Purchase、Payment、Referral、公开 VIP 页面/徽章、营销、Security Center、Risk Control 或独立 `/admin/vip` Dashboard。
* Production migration 已应用；数据库 migration history 记录为 `20260912080231 vip_foundation` 与 `20260912080326 vip_admin_management`。本地 migration 文件仍保持原名，未修改历史文件。代码部署与 migration applied 均不等于 VIP enabled。

### VIP Production Readiness Review（2026-09-11）

审查结论：**`SAFE TO APPLY PHASE 1 -> PHASE 2`。该结论已于 2026-09-12 按顺序执行，两个阶段均通过验证；VIP 未开启。**

* Vercel Production 当前运行 `02e7c48aea58c00dfe2095e7f97494102be90b0d`，状态为 READY；该提交已经包含 VIP Phase 1、Admin Changelog 与 VIP Phase 2。
* 审查当时的 Production Supabase 只读目录检查确认两份 VIP migration 均未记录，且当时不存在同名 VIP tables、functions、indexes、constraints、triggers、policies 或 types。现有 `profiles` 与 `admin_logs` 依赖字段及类型匹配。
* migration 顺序固定为 `20260909131821_vip_foundation.sql` 后接 `20260910133500_vip_admin_management.sql`。Phase 2 依赖 Phase 1 的三张表、状态约束及基础函数，不可反向执行。
* 两份 migration 没有 DROP、TRUNCATE、历史数据 DELETE、破坏性 CASCADE 或无关表重构。Phase 2 只为事件表增加 nullable `request_payload`、相容约束及后台 RPC。
* 五个 VIP flags 的数据库默认值全部为 `false`；服务端对缺行、读取错误、未知值与矛盾 entitlement 结果继续 fail closed。数据库迁移完成本身不会启用居民权益或公开界面。
* VIP 表启用 RLS 并撤销 `PUBLIC`、`anon`、`authenticated` 权限；VIP RPC 仅授权 `service_role`。读函数在数据库内再次验证 Owner/Admin，写函数再次验证 Owner、账号状态与输入。
* Phase 2 写入使用数据库 `now()`、`timestamptz`、唯一 `request_id`、request/user advisory transaction lock，并在同一函数事务更新 membership、写 append-only event 与 `admin_logs`。顺序重放四种动作只产生各一条事件和日志。
* 审查确认应用在 migration 缺失时只让 VIP 区域显示「暂时无法读取」，不会阻断居民完整资料页；普通居民路径不读取 VIP 后台资料。
* 隔离 PGlite 环境重新按顺序通过 Phase 1 migration、Phase 1 SQL test、Phase 2 migration 与 Phase 2 SQL test。真正双连接并发尚未在 Production 执行，保留为 migration 后专用测试账号 smoke test 项。
* Recovery 原则：若 Phase 1 成功而 Phase 2 失败，保持所有 flags OFF 并保留 Phase 1，修复后使用 forward migration 完成 Phase 2；不以 DROP Phase 1 作为默认恢复方式。

### VIP Production Migration Gate（2026-09-11）

历史闸门记录：Production Supabase 为 Free 方案，无法确认自动每日备份或 PITR，因此首次执行在任何数据库写入前暂停。项目负责人获知恢复限制后，于 2026-09-12 再次明确批准继续；执行期间依靠 migration transaction、全部 flags OFF 与 forward-repair 原则控制风险，没有使用 `supabase db push`，也没有同步无关 migration history。

### VIP Production Migration & Smoke Verification（2026-09-12）

* 严格按 `20260909131821_vip_foundation.sql` -> VERIFY -> `20260910133500_vip_admin_management.sql` -> VERIFY 执行。Production history 对应记录为 `20260912080231 vip_foundation` 与 `20260912080326 vip_admin_management`。
* Phase 1 三张 VIP 表、constraints、indexes、RLS、append-only trigger、基础函数与 grants 均通过检查；Phase 2 的 `request_payload` 约束、后台 overview/mutation RPC、空 `search_path` 与 service-role-only execute grants 均通过检查。
* 使用专用 QA Relationship A/B 测试。Owner Grant、Extend、Cancel at period end、Revoke 均成功，每次首次操作只产生一条 immutable event 与一条 `admin_logs`；同一 `request_id` 重放正确返回幂等结果。
* 真正双连接并发对同一账号、同一 Grant 与同一 `request_id` 同时发起两次调用：一次执行、一次幂等返回，最终只有一条 membership、event 与 admin log。
* 权限矩阵通过数据库真实调用验证：Owner 可写，Admin 只读，Moderator 与普通居民拒绝；临时角色测试在 transaction 内回滚，QA 账号均恢复为 `active user`。未登录浏览器访问 `/admin/users/[id]` 会返回居民登录入口。
* Cleanup 已删除两个 QA 账号的当前 membership；测试 events 与 admin logs 按审计要求保留，并新增 `vip_test_cleanup` 标记。两个账号均无残留 VIP membership。
* 全部五个 VIP flags 最终复核仍为 `false`，公开 entitlement 返回 `feature_disabled`。Purchase、Referral、公开 UI 与 Badge 均未启用。
* Vercel Production 首页返回 200，最近一小时没有 runtime error。没有发现普通居民路径回归。
* 由于没有可用的 Owner/Admin 浏览器登录 session，本轮没有提交认证秘密或绕过 Auth；Production Owner/Admin 页面视觉点击流程仍建议由负责人登录后做一次最终人工确认。数据库 RPC、权限、事务、审计与匿名 guard 已完成 Production 验证。
* Supabase Advisor 未发现 VIP 专属高危问题；VIP 表的「RLS enabled, no policy」为预期 deny-all 设计，并同时撤销 `PUBLIC/anon/authenticated` table grants。Advisor 仍报告若干既有全站权限/性能提醒，未在本次 narrow-scope migration 中改动。

## 本次交接：公开内容分享

分享功能已于 2026-08-27 合并到 `main`（功能提交 `93f1022`），现已推送。
文章和日记已接入统一分享面板，手机作者视角为喜欢/分享各半，访客视角为喜欢/分享/举报三等分。
Story 接口只读取公开、已发布且未删除的内容，采用 `private, no-store`，没有数据库或 Storage 变更。
已通过 265 项测试、正式 webpack 构建以及真实公开/非公开记录的接口检查；合并后在主目录再次运行 265 项测试，全部通过。
完整验证记录与真机待验项目见 `docs/superpowers/plans/2026-08-26-social-sharing-verification.md`。

## 当前状态

项目名称：

Our Little Age（小时代）

开发阶段：

社区平台 Alpha 阶段

---

## 已完成

### 用户系统

✓ 注册
✓ 登录
✓ Session检查

---

### 日记系统

✓ 创建日记
✓ 编辑日记
✓ Public
✓ Private
✓ Public View

---

### 文章系统

✓ 创建文章
✓ 编辑文章
✓ Draft
✓ Published
✓ Public View

---

### 广场系统

✓ 日记广场

/space/diaries

✓ 文章广场

/space/articles

---

### 评论系统

✓ Article Comments

✓ Diary Comments

✓ 删除评论

✓ 排序

---

### Home

✓ 最新文章跳转

✓ 最新日记跳转

✓ 广播系统

---

### Profile

✓ 公开居民房间

/u/[username]

✓ 资料编辑

/settings/profile

---

## 最近修复

### 2026-06

修复：

* 日记 Public View 权限问题
* 文章 Public View 权限问题
* Home 最新故事跳转错误
* Space 文章跳转错误
* Space 日记跳转错误
* 评论显示异常

---

## 历史待办快照（Needs verification）

以下列表来自早期开发阶段，不代表当前已经核实的待办。进入相关模块前必须先检查当前代码与 Production 状态；其中 Relationship 状态已按 2026-09-09 的实际 Git 状态同步。

高优先级：

1. Notification System

2. 多账号测试

3. Mobile UI测试

中优先级：

4. 收藏系统

5. 点赞系统

6. 关注系统

   * Phase 1：Follow Core + Supabase + Admin Relationship View 已完成并上线
   * Phase 2：居民端 Follow UI + Follow Notifications 已完成、commit、合并并 push，Production migration 已应用；Auth hotfix 的最新 Vercel deployment verification 与完整 production test-account flow 待完成
   * Mention System：后续独立阶段
   * Friend System：未来阶段
   * 原则：Follow ≠ Friend；Mutual Follow ≠ Friend

长期：

7. 等级系统

8. 称号系统

9. 世界事件系统

---

## 2026-08-24 业配后台阶段交接

### 本阶段已完成

业配资料层与 Admin 管理界面已经完成，保持默认关闭，且未接入任何公开页面投放。

迁移顺序：

1. `supabase/migrations/20260824130000_sponsorship_system.sql`
2. `supabase/migrations/20260824140000_sponsor_admin_mutations.sql`

Admin 路由：

* `/admin/sponsors`
* `/admin/sponsors/new`
* `/admin/sponsors/[id]`

Admin API：

* `GET/POST /api/admin/sponsors`
* `GET/PATCH /api/admin/sponsors/[id]`
* `GET/PATCH /api/admin/sponsors/settings`
* `GET /api/admin/sponsors/stats`
* `POST/DELETE /api/admin/sponsors/upload`

Owner 与 Admin 可管理；Moderator 没有业配导航，API 与数据库 RPC 仍执行权威权限检查。管理 RPC 仅授权 `service_role`，浏览器角色不可直接执行。

### 默认关闭与隐私

* 数据库总开关 `commercial_enabled` 默认 `false`。
* 八个广告位默认全部关闭，placement 记录也默认关闭。
* 新建业配默认保存为 `draft`。
* 只保存匿名每日曝光与点击汇总，不保存用户、IP、文章或阅读历史。
* 当前没有公开业配组件，也没有公开 serve、impression 或 click API；公开投放刻意留待后续阶段。

### 环境与本地验证

本地与部署环境需要：

* `NEXT_PUBLIC_SUPABASE_URL`
* `SUPABASE_SERVICE_ROLE_KEY`（仅服务端，禁止使用 `NEXT_PUBLIC_` 前缀）

2026-08-24 Task 7 本地门禁：

* `npm test`：PASS，6 个文件、110/110 tests。
* 自 `7009b48` 起 27 个 changed JS/TS/TSX 文件的 focused ESLint：PASS，0 findings。
* `npm run build`：PASS，TypeScript 完成，43/43 static pages；Admin 与五个 sponsorship API 路由均被识别。
* `npm audit --omit=dev`：PASS，0 vulnerabilities。
* `git diff --check 7009b48..HEAD`：PASS。
* 全仓 `npm run lint`：非零，209 errors、56 warnings；记录基线为 211 errors、56 warnings，且 changed-file 精确交集为 0。保留为既有 lint 债务。
* Vitest 仍显示既有的 Vite native config-loader ESM advisory，不影响测试结果。

Task 7 由 controller 在 linked Supabase 的独立可回滚事务中重新验证：Task 2 pgTAP `1..113`、Task 4 pgTAP `1..25`；ROLLBACK 后 sponsor tables 为 0，Task 4 functions 为 0。没有持久化任何 SQL。

### 上传、时区与界面证据

上传仅接受受限大小且结构校验通过的 JPEG、PNG 与 simple WebP，使用现有 `images` bucket 的 `sponsors/{campaign-id}/{placement}/...` 路径。未保存编辑产生的新上传可通过 `DELETE /api/admin/sponsors/upload` 补偿清理；该端点只接受严格的 sponsor 路径，不删除居民图片或既有任意路径。

排期统一按 `Asia/Kuala_Lumpur`（UTC+08）解释。统计范围为 `today`、`7d`、`30d`、`3m`。

Task 6 截图：

* Desktop 1440x900：`C:\Users\PC\.codex\visualizations\2026\08\24\01a032b3-fbc7-7632-8a79-56ed60d23d65\task6-sponsors-1440x900.png`
* Mobile 375x812：`C:\Users\PC\.codex\visualizations\2026\08\24\01a032b3-fbc7-7632-8a79-56ed60d23d65\task6-sponsors-375x812.png`

### 尚未发生与下一道门

* 生产 migration：未应用。
* 部署：未执行。
* 公开业配投放：不存在，未启用。

后续必须依序明确批准：review/merge，生产 migration apply，deploy，生产 smoke test。生产验证前保持总开关和所有广告位关闭。

---

## 2026-08-25 通知中心分流与互动聚合

### 本阶段已完成

`/notifications` 已分为一级「信箱 / 互动」。信箱继续使用原有未读、已读、重要、星标与垃圾桶功能；互动提供全部、喜欢、评论、回复筛选。旧互动通知通过现有 `type` 与历史标题前缀自动分类，不删除历史数据。

点赞通知现在由 `post_likes` / `comment_likes` 的有效行聚合。同一接收人、同一目标只保留一行 `type = 'like'` 通知：新增点赞更新人数、最近居民和 `last_activity_at`；取消点赞重新计算；人数归零时隐藏该组；重新点赞恢复同一通知 ID 并重新标记未读。

评论保存为 `type = 'comment'`；带 `parent_id` 的评论保存为 `type = 'reply'`，分别通知文章/日记作者或父评论作者。Navbar 与首页继续按未读且未删除的通知行计数，因此一个点赞聚合组计为 1。

### 已应用 migration

1. `supabase/migrations/20260825090556_notification_interactions.sql`
2. `supabase/migrations/20260825093954_notification_interaction_indexes_and_rls.sql`

新增字段：`actor_id`、`post_id`、`comment_id`、`actor_count`、`recent_actor_ids`、`last_activity_at`。没有新建主通知表，也没有清空或重写历史通知。

通知 UPDATE 权限已收窄：普通 authenticated 用户只能更新 `is_read`、`is_starred`、`is_important`、`deleted_at`，不能改写标题、内容、接收人或聚合字段。新增外键均有覆盖索引，通知 SELECT/UPDATE RLS 使用缓存式 `(select auth.uid())`。

### 验证结果

* pgTAP：29/29，通过；覆盖三人点赞聚合、取消、全取消、重新点赞复用、评论、回复、列权限、索引和 RLS。
* Vitest：10 个文件、143/143，通过。
* `npm run build`：通过，43/43 static pages。
* 通知相关 focused ESLint：通过。
* 浏览器：桌面与 375x812 手机通过；无横向溢出、Next.js error overlay 或 console error。
* 本地入口：`http://localhost:3000/notifications`。

### 历史兼容与限制

历史互动通知缺少 actor/target ID，因此只按旧标题分类到互动，无法安全合并；这些旧未读行仍各自计入 Navbar，读完后自然消退。新通知从 migration 应用后开始完整聚合。

当前评论组件尚未提供回复输入 UI，但数据库已有 `parent_id`，本阶段只保证未来或其他入口写入父评论时会产生正确 reply 通知，没有扩大评论系统范围。

Supabase 顾问仍报告仓库原有的 GraphQL 表可发现性、泄露密码保护未启用、notifications 两条 INSERT permissive policy 等全局告警；本阶段未越界修改这些既有系统。新 migration 引入的外键缺索引与通知 RLS init-plan 告警已经消除。

### 2026-08-25 通知界面复核

居民 `系小卓呀` 的文章历史上收到 4 条其他居民评论，时间为 2026-06-04 至 2026-06-27。数据库中没有对应的 active 或 soft-deleted 评论通知；这些评论早于评论通知触发器上线，因此当时从未创建通知，不是当前互动分类遗漏，也不是居民后来删除。当前 `comment_created_growth` trigger 已启用，后续新评论会产生 `comment` / `reply` 通知；本阶段没有补发几个月前的未读通知。

`/notifications` 一级「信箱 / 互动」现使用稳定的细边框选中状态，不再依赖浏览器焦点外观。信箱的未读、已读、重要、星标、垃圾桶筛选统一显示文字和数量，与互动筛选保持一致；正式信件的星标、重要、已读、删除、恢复操作在桌面显示图标并在 hover / keyboard focus 时显示名称，手机则保留图标和文字。

复核门禁：Vitest 11 个文件、147/147 tests；production build 通过；通知 focused ESLint 通过；浏览器无 error overlay 或 console error。

### 2026-08-25 反馈最终状态

`/admin/feedback` 将 `resolved`（已完成）与 `closed`（已关闭）视为反馈闭环的最终状态。进入任一最终状态后，卡片不再渲染右侧「处理中 / 已完成 / 关闭」操作区；`pending` 与 `in_progress` 仍保留处理入口。

Admin 桌面侧栏已压缩分组、菜单与图标间距，并限制在视口高度内独立滚动。常见桌面高度可直接看到 Owner 与系统选项；更矮视口不会再把底部菜单截断。

`/admin/logs` 的反馈状态操作已加入专属显示映射：处理中为蓝色、已完成为绿色、已关闭为柔和红色，并把历史日志中的英文状态值转换成完整中文说明。转换只发生在显示层，不修改既有 `admin_logs` 审计数据。

公告相关操作日志也已完整中文化，发布、预约、显示、关闭、删除及两种自动发布 action 均使用统一紫色标签；历史详情与 `admin_logs` 原始数据保持不变。

`/admin/sponsors/new` 与业配编辑页的排期控件已由单一 `datetime-local` 输入改为日期日历加 15 分钟时间下拉，并明确标示 MYT（UTC+8）。底层 ISO 转换、校验与数据库结构保持不变；投放权重字段新增相对展示机会说明。

状态、开始时间、结束时间与投放权重现使用等高标签行并在桌面顶端对齐。权重长说明已移入标签旁的信息按钮：hover / focus 显示简短 tooltip，点击打开含系统上限、100:50、1000:1 与十则业配极端比例的完整说明窗口。当前仍不设置同时有效业配的硬数量上限；单页展示上限维持数据库既有的 3。

投放权重输入新增格式防护：每个业配只接受 1–1000 的单个整数，阻止比例冒号、小数、正负号与科学计数法字符，粘贴非整数内容也会被拒绝并显示中文提示。说明窗口现明确示范广告 A 填 100、广告 B 填 25，而不是在一个输入框填写 100:25。

### 2026-08-25 业配合作申请

`/feedback` 新增独立的「业配合作」提交类型。选择后，表单切换为合作方或品牌名称、联系人、必填 Email、国家或地区、必填手机号码、合作主题与合作方案；普通反馈字段与 `feedbacks` 写入流程保持不变。

手机号码使用 `libphonenumber-js` 按所选国家验证并规范化为 E.164。当前支持马来西亚、新加坡、印度尼西亚、中国大陆、香港与台湾，表单会随国家显示对应输入示例。

合作申请写入独立的 `sponsor_inquiries` 表，不进入反馈中心。新增 Admin 路由 `/admin/sponsors/inquiries` 与侧栏「合作申请」入口，支持搜索、状态筛选和 `待查看 → 联系中 → 已接受 / 已婉拒` 处理；已接受与已婉拒为最终状态，前后端都禁止重新打开。

数据库保持最小权限：`anon` 与 `authenticated` 对申请表没有直接权限，RLS 已启用；居民提交通过验证登录身份的服务器 API，后台读取和更新仅由通过 Owner/Admin 授权的服务器 API 执行。没有接入反馈通知、广告投放、文件上传或自动建立业配活动。

新增 migration：`supabase/migrations/20260825131359_sponsor_inquiries.sql`。生产环境尚未应用。
