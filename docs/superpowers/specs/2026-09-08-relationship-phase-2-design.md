# Relationship System V1 Phase 2 Design

更新时间：2026-09-08

## 目标

在 Phase 1 已上线的 Follow Core 上，加入居民可实际使用的关注界面、公开关系名单、关注隐私设置与关注通知。关系变化与通知必须保持一致，不能出现关系成功但通知失败，或通知存在但关系并未成立的情况。

本阶段完成后，居民可以在公开房间关注其他居民、查看公开的关注中与关注者名单、整理自己的名单，并在现有小时代信箱中处理关注申请。

## 已确认范围

本阶段包含：

* 居民房间的关注按钮与关系状态。
* 所有访客可见的关注中与关注者数量。
* 房间内分页名单弹层。
* 房主在自己的名单中取消关注或移除关注者。
* `/settings/privacy` 的 `follow_mode` 设置。
* 关注、关注申请与接受申请通知。
* 信箱内接受或拒绝关注申请。
* 安全的公开 accepted 关系读取。
* 数据库、服务端、组件和端到端交互测试。

## 明确不做

本阶段不开发：

* Mention System。
* Friend System 或 Friend Request。
* Mutual Friend；Mutual Follow 仍不等于 Friend。
* 居民推荐、关系网络、关注动态 Feed 或排序算法。
* Close Friends、内容权限或内容可见性变化。
* 「文案」。
* Block System；当前仅继续保留未来接入点。
* Follow Growth Chart 或其他 Analytics Dashboard。
* 全面重构居民房间或通知中心。

## 核心原则

* Follow 是单向关系。
* Mutual Follow 由两个 accepted 关系动态计算，不存储 `is_mutual`。
* Follow 不授予任何内容权限。
* pending 不计入关注中、关注者或 mutual 数量。
* `follow_mode` 改变只影响未来请求，不重算既有 accepted 或 pending。
* 关系与对应通知在同一个数据库事务中完成。
* 所有关系写操作继续以服务器取得的登录 Session 为操作者来源。

## 数据库设计

### notifications 扩展

新增一份非破坏性 migration，为现有 `public.notifications` 增加：

```sql
relationship_id uuid null
```

外键指向 `public.user_follows(id)`，删除关系时使用 `ON DELETE SET NULL`。这样已完成的普通关注或接受通知可以保留历史，但已不存在的申请不会继续携带可操作的关系 ID。

为非空 `relationship_id` 增加覆盖索引。需要防止同一关系和同一通知类型重复建立；具体使用唯一索引或事务内存在性检查，以与当前通知表的索引规范一致为准。

通知类型使用：

* `follow`：开放关注模式下，有居民成功关注收件人。
* `follow_request`：有居民向收件人发出待批准申请。
* `follow_accepted`：收件人接受申请后，通知原申请人。

这些类型不能复用文章、日记、评论、回复或喜欢的类型与文字。

### 关系 RPC 通知联动

通过新 migration 使用 `CREATE OR REPLACE FUNCTION` 安全扩展 Phase 1 的关系 RPC，不修改历史 migration。

`relationship_follow_user()`：

* 新建 accepted 时，同一事务建立一封 `follow` 通知给被关注者。
* 新建 pending 时，同一事务建立一封 `follow_request` 通知给被申请者。
* 已存在 accepted 或 pending 时保持幂等，不建立第二条关系，也不建立第二封通知。
* 自己关注自己、账号状态不允许或用户不存在时，不建立关系也不建立通知。

`relationship_accept_request()`：

* 只有收到该 pending 的居民可以接受。
* 同一事务把关系转为 accepted、更新原 `follow_request` 为已处理状态，并给申请人建立一封 `follow_accepted` 通知。
* 并发 Accept/Cancel 时只能有一个最终结果，不允许留下错误的接受通知。

`relationship_cancel_pending()`：

* 申请人取消自己发出的 pending 后，收件人的对应申请通知不再出现在有效信箱中。
* 不发送额外通知。

`relationship_reject_request()`：

* 收件人拒绝 pending 后，对应申请通知结束，不发送额外通知。

`relationship_unfollow_user()` 与 `relationship_remove_follower()`：

* 继续只减少指定方向关系。
* 不发送通知。
* 不影响反方向关系。

### 通知处理状态

`follow_request` 是否仍可操作，以对应 `user_follows` 是否存在且状态为 pending 为最终依据。接受后原卡片显示已接受；取消或拒绝后不再留在有效信箱。前端不能只依赖本地按钮状态推断数据库结果。

### 公开关系读取

新增只读 RPC，名称在实施时遵循当前 relationship service 命名风格，提供：

```ts
getPublicRelationshipSummary(residentId)
listPublicResidentRelationships(residentId, kind, page, pageSize)
```

公开 Summary 只返回：

```ts
{
  followersCount: number;
  followingCount: number;
}
```

公开名单只允许 `followers` 与 `following`，只统计及返回 accepted。每页默认 20，最大 100，并稳定按 accepted 时间及关系 ID 排序。

公开名单项目返回居民展示所需的最小资料：

```ts
{
  residentId: string;
  username: string;
  avatarUrl: string | null;
  relationshipAt: string;
}
```

公开接口不得返回 pending、follow mode、邮箱、账号状态、角色、认证资料或其他管理信息。不存在的居民、非法 kind、非法页码和超出上限的 page size 必须失败关闭。

匿名与已登录居民可以执行公开只读 RPC。`user_follows` 的直接写权限与关系状态转换 RPC 权限保持 Phase 1 不变。

## 服务端边界

继续复用 `lib/relationships/service.ts` 与 `app/actions/relationships.ts`，不为每个页面复制关系查询和写入逻辑。

新增或扩展的服务能力包括：

* 获取当前居民与目标居民的关系状态。
* 获取公开关系数量。
* 分页读取公开 followers/following。
* 分页读取本人 followers/following，并允许相应减少关系操作。
* 在通知申请卡处理 accept/reject 后返回可信的最终状态。

所有 mutation Server Action 必须重新读取 Session，不能接受浏览器传入的 actor ID。所有输入使用 UUID、枚举和分页范围验证。错误对居民显示稳定、温和的产品文案，服务器日志保留可排查信息，但不得把数据库内部错误直接展示给浏览器。

## 居民房间设计

### 关系摘要

在居民资料区、简介与成长资料附近加入紧凑的关系行：

* `关注中 N`
* `关注者 N`
* 关注状态按钮

数量对所有访客可见。查看自己的房间时不显示关注按钮。

关注按钮状态：

| 数据状态 | 按钮文字 | 点击行为 |
| --- | --- | --- |
| 未登录 | 关注 | 前往登入页，并携带当前房间作为安全回跳地址 |
| 无 outbound | 关注 | 调用 Follow Action |
| outbound pending | 等待回应 | 确认后取消自己发出的申请 |
| outbound accepted，非 mutual | 已关注 | 确认后取消关注 |
| 双方 accepted | 互相关注 | 确认后只取消自己的 outbound |
| 当前居民就是房主 | 不显示 | 不允许关注自己 |

提交期间按钮保持固定尺寸并禁用，避免重复点击和布局跳动。成功后重新读取关系状态与数量；失败时恢复服务器确认前的显示，并给出错误提示。

### 名单弹层

点击 `关注中` 或 `关注者` 在当前房间打开弹层，不新增公开名单路由。

弹层要求：

* 显示头像、用户名与进入居民房间的入口。
* 每页 20 位，按服务器返回的总数显示上一页与下一页。
* 加载时保持稳定尺寸；空白、失败与重试状态清楚。
* 长用户名不能撑破容器。
* 手机端作为接近全屏的弹层，桌面端为居中弹层。
* 支持 Escape、关闭按钮、焦点管理与背景滚动锁定。

查看自己的房间时：

* `关注中` 项目提供 `取消关注`，确认后执行。
* `关注者` 项目提供 `移除关注者`，确认后执行。
* 操作成功后刷新当前页、总数和房间摘要；最后一项被移除造成页码越界时回到有效的最后一页。

查看别人的房间时名单只读，不在名单内增加批量关注或快捷关注按钮。

## 隐私设置设计

在 `/settings/privacy` 增加“关注方式”分组，使用二选一控件而不是二元开关：

* `任何居民可直接关注` 对应 `open`。
* `关注前需要我批准` 对应 `approval_required`。

读取时包含 `follow_mode`，保存时通过 `setFollowMode()` Server Action，不允许浏览器直接更新该字段。保存失败时保留原服务器状态并提示，成功后明确显示已保存。

现有成长资料隐私设置继续按原逻辑保存，不因这次改动改变含义。

## 信箱设计

关注相关通知继续放在现有「信箱」，不进入「互动回声」，也不新增第三个顶层分区。

新增独立 `RelationshipNotificationCard`，避免把申请逻辑塞入普通信箱卡或现有互动卡。

### follow

显示关注者头像、用户名和“关注了你”，点击居民资料可进入其房间。保留现有信箱的已读、星标、重要和移入垃圾桶能力。

### follow_request

未处理时显示：

* 申请人头像与用户名。
* 进入申请人房间入口。
* `接受` 与 `拒绝` 两个明确按钮。

处理期间两个按钮禁用。接受成功后卡片显示 `已接受`，关系与未读数量重新读取；拒绝成功后卡片从有效信箱移除。申请已在别处取消或处理时，重新读取后显示已结束状态，不允许重复操作。

### follow_accepted

显示对方已接受关注申请，并提供进入对方房间的入口。不提供反向关注或 Friend 快捷操作。

所有关注通知只描述居民关系，不能出现“你的文章”“你的日记”“你的留言”等内容归属文字。

## 通知生命周期

| 操作 | 收件人 | 通知 | 结果 |
| --- | --- | --- | --- |
| A 关注 open 的 B | B | `follow` | 建立一次 |
| A 申请关注 approval_required 的 B | B | `follow_request` | 可接受或拒绝 |
| A 重复点击同一关系 | 无新增 | 无新增 | 幂等 |
| B 接受 A | A | `follow_accepted` | 建立一次 |
| A 取消 pending | 无 | 无新增 | B 的申请结束 |
| B 拒绝 pending | 无 | 无新增 | 申请结束 |
| A 取消关注 B | 无 | 无新增 | 只删除 A 到 B |
| B 移除 A | 无 | 无新增 | 只删除 A 到 B |

## 权限与隐私

* `active`、`warned` 可新增关注和接受申请。
* `muted`、`banned`、未知状态禁止新增关注和接受申请，但本人仍可取消关注、取消 pending、拒绝 pending 和移除关注者。
* 普通居民不能替别人关注、接受请求、拒绝请求或移除关注者。
* 公开读取只显示 accepted 关系和必要的公开 profile 字段。
* pending 只允许关系双方与 Owner/Admin 读取。
* Moderator 不获得新的管理关系权限。
* Admin Relationship View 继续仅 Owner/Admin 可用。
* 密码、Token、Session、Service Role Key 与任何 Auth 秘密不得进入前端或通知内容。
* Block System 尚不存在。本阶段不创建临时 Block 表；未来接入必须继续在统一 Follow Service/RPC 入口检查。

## 加载、空白与错误状态

房间关系摘要读取失败时只隐藏或替换关系区域，不影响房间、作品与资料继续显示。名单读取失败不关闭整个房间，弹层提供重试。

空白文案：

* 没有关注者：`这个居民目前还没有关注者。`
* 没有关注中：`这个居民目前还没有关注任何人。`
* 没有待处理申请：信箱维持现有空白状态，不增加空的关系菜单。

关系 mutation 失败时使用统一、不会泄露数据库细节的提示。未登录只引导登入，不显示权限错误堆栈。

## 组件边界

实施时优先采用以下职责拆分，最终文件名可以按仓库现有命名小幅调整：

* `components/relationships/ResidentRelationshipControls.tsx`：房间数量与关注按钮状态。
* `components/relationships/ResidentRelationshipDialog.tsx`：分页名单弹层与房主操作。
* `components/notifications/RelationshipNotificationCard.tsx`：关注、申请与接受通知显示和操作。
* `lib/relationships/service.ts`：统一服务器关系查询和 mutation 包装。
* `lib/notifications/model.ts`：关注通知识别与信箱分类。
* `app/actions/relationships.ts`：Session 绑定后的居民端调用入口。

现有 `UserRoomClient` 与 `app/notifications/page.tsx` 只负责组合这些组件和刷新数据，不继续承载完整关系业务逻辑。

## 测试策略

所有行为采用测试先行。

### Database

新增数据库测试覆盖：

* open Follow 同事务建立 accepted 与一封 `follow`。
* approval Follow 同事务建立 pending 与一封 `follow_request`。
* 同一 Follow 重复或并发请求不重复关系、不重复通知。
* Accept 同事务更新关系、结束申请并建立一封 `follow_accepted`。
* Accept 与 Cancel 并发只有一个可信结果。
* Cancel、Reject、Unfollow、Remove Follower 不建立额外通知。
* 公开 Summary 与名单只统计 accepted。
* 匿名读取不能看见 pending 或敏感 profile 字段。
* 非参与者不能读取 pending。
* 账号状态规则与 Phase 1 一致。

### Service 与 Actions

测试覆盖：

* Session actor 不能由参数伪造。
* UUID、kind、page、pageSize 验证。
* 公开分页数据转换与越界页处理。
* 未登录 mutation 返回登入提示。
* 关系错误不会把内部 Supabase 错误直接返回浏览器。

### Components

测试覆盖：

* 本人房间不显示关注按钮。
* 未登录点击关注进入登入并保留安全回跳地址。
* 未关注、pending、accepted、mutual 四种状态文字与操作。
* 提交期间禁用和失败恢复。
* 数量弹层、分页、空白、错误、重试与页码回退。
* 本人名单可取消关注或移除关注者；别人名单只读。
* `follow_mode` 读取、保存与失败状态。
* 三种通知类型不会被归类为文章/日记互动。
* 申请接受、拒绝、已处理和已取消状态。
* Navbar 未读数在通知处理后刷新。

### 完成门禁

本地完成前运行：

* Relationship 与 Notification 数据库测试。
* 完整 Vitest。
* TypeScript。
* 改动文件 focused ESLint。
* Production build。
* `git diff --check`。
* 手机与桌面主要视口的浏览器检查。

如果全仓库 ESLint 仍有与本阶段无关的历史错误，需要准确记录；本阶段新增或修改文件不能新增 lint error。

## 发布边界

Phase 2 实施完成后先停在本地，进行完整自检和报告。未经负责人再次确认，不得：

* 应用新的 Production Supabase migration。
* 推送或部署 Phase 2。
* 在 Production 写入测试关系或通知。
* 开始 Mention、Friend、文案或其他后续阶段。

## 验收结果

Phase 2 可被视为完成的条件：

1. 居民房间能可靠显示公开数量与当前关系状态。
2. 所有访客能分页查看 accepted 的关注中与关注者名单。
3. 登录居民能关注、取消申请、取消关注和整理自己的关系名单。
4. 需要批准的申请能在信箱中接受或拒绝。
5. 关系与通知在任何成功、失败、重复或并发情况下都不会互相矛盾。
6. 关注通知不会造成文章、日记、留言或 Friend 关系的归属误会。
7. 所有权限在服务器和数据库层都无法通过直接请求绕过。
8. Phase 1 的 Admin Relationship View、账号状态规则和现有通知功能没有回归。

