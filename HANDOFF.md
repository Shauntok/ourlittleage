# HANDOFF

## 2026-11-10 后台世界公告无法发布修复

正式 Supabase 日志显示公告插入被 RLS 拒绝。公告表的管理员 INSERT 规则要求 `created_by = auth.uid()`，而后台表单提交时漏掉 `created_by`。现在立即发布和预约发布都先取得当前登录账号，再把账号 ID 写入公告；未登录时直接提示重新登录。公告写入成功而通知发送失败时，页面明确显示“公告已发布，但通知发送失败”，避免管理员因旧的笼统错误提示重复发布。新增定向测试覆盖两种发布方式与通知失败场景；定向测试和生产构建已通过。没有修改数据库结构或权限策略，也没有为了测试向正式库发布公告。正式站点发布后仍需由 Owner 用实际公告验证发送和居民收件。

## 2026-11-10 皮肤设置柜门和日夜按钮重叠修正

上一轮仅调整了焦点方框，判断不完整，正式页仍有明显重叠。本次在本地独立预览页复现后确认两处主因：夜晚按钮使用一张尺寸和位置不吻合的局部贴图覆盖原画，露出原本的日间蓝边；经典玻璃选中时又由 CSS 给整扇门叠加方形边框，且原画的现代像素蓝边没有消失。现已重绘六张完整柜体状态图，组合「已应用背景日／夜 × 预览皮肤 × 预览时段」，选中状态直接画在柜门上，移除夜晚局部贴图、整门伪元素边框和桌面重复的圆形选中标记。原日间现代像素状态沿用已有画作。手机端仍使用原本的独立柜门版式。

本地独立预览页已目视检查现代像素夜晚、经典玻璃夜晚、经典玻璃日间，按钮和门框不再双重叠加；该临时预览路由已删除，未进入正式代码。正式站点尚需发布后再由居民账号核对实际画面。

## 2026-11-09 正式版 1.0.0 发布交接

负责人已决定将现代像素皮肤作为正式版 1.0.0 推送。居民公开更新日志改为「正式版 1.0.0」，概括现代像素日／夜皮肤、搜索与标签、广场与阅读写作、手机端调整、仅邻居可见等本批功能。旧玻璃皮肤继续可选；未主动选过皮肤的居民默认保留经典玻璃，已在本机选择现代像素的偏好不会被空的云端值覆盖。

本次皮肤提醒批次为 `modern-pixel-1-0-0`，发布时间界线为 2026-11-09 05:04:00 UTC；只向该时间前已注册、且该批次尚未领取提醒的居民在进入首页时展示一次。新居民不展示。弹窗沿用居民当时的玻璃或现代像素皮肤。未来普通样式修补不能更改该批次编号；推出下一套新皮肤时才设置新的编号与时间。

正式 Supabase 项目 `dsfuhzzexiledwrbknmh` 已按顺序应用并确认四项迁移：`viewer_room_skin_preference`（20261109050012）、`skin_release_prompt_receipt`（20261109050018）、`neighbor_visibility`（20261109050024）、`fix_neighbor_text_only_check`（20261109050102）。最后一项修正原迁移双重转义导致 Markdown 图片未被拒绝的问题；后续使用新增的修正迁移，不能仅重跑原迁移。旧迁移文件名与正式库记录的版本号本来不同，不要直接对正式库执行 `supabase db push` 或迁移历史修复。正式库的新增字段与邻居 SELECT 规则、纯文字约束已经只读核对；仍缺真实双账号写入／撤销关系的线上回归。

发布前本地检查：132 个测试文件共 905 项通过，TypeScript 与生产构建通过；皮肤默认值和日志调整后的定向测试 13 项通过。全站 `npm run lint` 未通过，主要扫描到仓库中旧工作树的 `.next` 生成文件及原有类型／组件错误，不能表述为 lint 全绿。前台多页手机视觉已在模拟视窗检查，但真机、完整角色业务和全站逐页回归仍未完成；正式推送可能暴露新问题，须上线后继续核对。

发布记录：功能提交 `95b7cd5` 已推送到 `main`，对应 Vercel Production 部署 `dpl_4DLiNdbFcPNBqPcGGBqHBd4Hxnz4` 为 READY。`https://www.ourlittleage.com` 的 `/home`、`/space`、`/settings/skin` 和 `/settings/changelog` 均返回 HTTP 200，更新日志页面内容含「正式版 1.0.0」。这只是发布与基本页面连通性检查，不代表手机真机、全部角色业务、一次性皮肤提醒或邻居可见权限已在正式环境完成验收。后续修复应在 1.0.0 范围内记录，不应提前把尚未上线的「邻居动态」写成现有功能。

**后续功能，未包含在 1.0.0：**「邻居动态」页面只显示当前居民关注的人新发布的日记与文章，与显示所有公开作品的广场分开。沿用现有 `user_follows` 和 `posts`，开始实现前先定清楚是否包含仅邻居可见作品以及排序和撤销关注后的行为。标签相关视觉设计也已获当前功能验收，但约定在页面整体完成后再重做。

## 2026-11-09 现代像素手机写作页发布确认（本地待验收）

`/diary/new` 与 `/articles/new` 的现代像素手机版，将「写作提示」移到编辑纸页日期／标题栏右端，点开后在栏下展开提示；原独立提示卡及页内「放到哪里」卡在手机宽度隐藏。填写内容并通过原有最低字数、文章标题和标签校验后，点「发布今天／发布文章」才出现现代像素日／夜配色的可见范围窗口，按既定顺序选择广场、只给自己看、仅邻居可见或隐藏，底部为「再写一写」和「确认发布」。确认后仍走原有发布、数量限制与邻居纯文字校验；草稿保存流程、桌面布局、经典玻璃皮肤、数据库和路由未改。400px 手机浏览器实测两页弹窗、提示展开和取消返回；6 项定向测试、TypeScript、组件 ESLint 与生产构建通过。仅本地修改，尚未提交、推送或部署；未向正式资料库提交测试作品。

## 2026-11-08 手机端场景渐变与后台日志补记（本地待验收）

负责人确认前台桌面版保持现状。现代像素手机端除广场外的场景图片高度由 440px 增至 528px（约 20%），仍按原始比例缩放；日／夜的淡出终点同步延至 528px，中段渐变放缓。首页、公告、垃圾桶的独立背景规则也同步调整。信箱标题的小块浅底改为向右渐隐；广场手机端主标题上方的场景占位从 104px 收至 52px。以上只改手机端样式，未修改图片原文件或桌面版前台布局。

受保护的 `/admin/changelog` 已补记后台 03 控制中心统一、文章标签、仅邻居可见规则准备及本次手机端修整。新记录按本地实际状态标为「待部署」或「待验证」；**没有**声称迁移已应用或线上已发布。此次没有更动数据库、路由、权限或生产环境。

## 2026-11-03 前台手机版与后台面板统一（本地待验收）

负责人明确：**前台这批调整只针对手机版；桌面版已满意，除非另行点名，不改桌面展示。** 后台是例外，已明确要求电脑与手机都沿用选定的 03「控制中心」框架。此次没有改数据库、权限规则或路由，也没有提交、推送或部署。

前台手机端已调整首页四格边角、日记／文章的顶部留白与可展开的日期回看、写作位置选择／操作按钮／提示与预览、阅读与举报窗、房间访客的关注按钮与徽章展开、关于网站的单页长卷、皮肤页标题位置，以及信箱和搜索页的小字对比度。移动导航「深夜广场」改为「广场」。现代像素页面使用原有日／夜专属画作，手机上保留图像比例，重新让背景图片与渐变在同一高度结束，避免出现水平断层；日记、文章标题与旁边说明的浅色底从左向右逐渐透明。经典玻璃版的桌面排版未作视觉调整。

后台已把共用浅色侧栏、顶栏（当前授权账号完整用户名与角色、刷新）及 03 控制中心的卡片／表单／表格颜色套到全部现有后台子页。页面内原有筛选和操作继续保留；未保存修改时，顶栏刷新会先确认。手机概况卡改为两列，业配页去掉旧移动导航留下的顶部空白。已在本地登录状态检查居民管理、居民详情、公告、安全、反馈、资料、业配等画面；15 个主要后台入口在 390px 宽度未出现横向溢出。TypeScript、后台侧栏测试通过；完整浏览器业务操作和 Owner／Admin／Moderator 分角色验收尚未做。

## 2026-11-03 后台管理改版与前端手机端工作顺序

负责人决定先整理后台管理的导航与控制中心，并继续完成后台管理部分；后台完成后，再检查和优化前端手机版。后台设计作为独立的管理界面规划，不套用现代像素皮肤。负责人从 01 与 03 草图中选定 03「紧凑资料台」。

2026-11-03 本地已实现 03 的后台控制中心与共用侧栏：控制中心改为六项概况、举报／待审评论／反馈／合作申请合并的待处理记录表、最近内容和运营摘要；数字从现有资料表和已有合作申请后台接口读取，桌面本页可按类型及文字筛选。共用侧栏按工作台、待处理、内容、居民、系统重新分组并统一图标；Owner/Admin/Moderator 的原有入口权限、未保存修改提示保留。控制中心与其他后台子页现已统一为浅色工作台；具体后续进展见上方记录。没有改变数据库、路由或居民前端皮肤。

后续细调：控制中心右上角原本固定的「管」改成从当前已授权 Owner/Admin/Moderator 的 `profiles.username` 读取完整用户名，并附当前角色；未设置用户名时显示说明文字，不显示认证邮箱。负责人随后确认其他后台子页直接沿用 03，故顶部横栏和左侧导航现已同步全后台。此次只是本地 UI 调整，TypeScript、定向 ESLint 通过。已在已登录的 localhost:3000/admin/homepage 验证显示「系小卓呀 OWNER」。

验证：本地 TypeScript、定向 ESLint、侧栏 6 项测试通过；在已登录的 localhost:3000/admin/homepage 查看真实数据与桌面画面，390px 窄屏 document 宽度未超出视窗。此为本地改动，尚未提交、推送或部署；前端手机版统一优化仍排在后台后续整理之后。

## 2026-11-03 文章标签功能：当前版本已获负责人验收，视觉设计待重做

状态：**本地实现；负责人于 2026-11-03 看过标签筛选页，并确认当前版本可以验收；尚未正式发布。** 文章新建／编辑页的标签输入会在保存时规范化，最多 5 个、每个最多 20 字；公开文章的标签可点击，进入搜索页的文章标签筛选。搜索框下方仅在输入关键词或选中标签时显示标签区，选中后可一键清除；搜索仅返回已发布、公开、未删除的文章。现代像素与经典玻璃版都已有对应样式，复用 `posts.tags` 和现有 `/tags/[tag]` 路由，不新增数据表。

开发验证：定向测试、TypeScript 检查通过；本地 `/search` 返回正常，中文标签链接会正确跳转到带标签筛选的搜索地址。负责人本次确认的是当前标签页的展示效果；尚未执行正式发布或真实账号的端到端发布检查。

**后续设计待办：等所有页面完成后，再回来重新设计标签相关界面**，包括文章编辑页的输入区、文章上的标签呈现和搜索页的标签区域。当前验收不代表这套标签视觉设计已经定稿；重做时保留已接通的保存、筛选与公开范围规则。

## 2026-11-02 写作可见范围顺序与「仅邻居可见」

状态：**本地代码和迁移已准备；迁移尚未应用，未部署。** 日记和文章的新建、草稿及已发布内容编辑页，在现代像素和经典玻璃皮肤下统一按「广场 → 只给自己看 → 仅邻居可见 → 隐藏」排列。默认选中项与旧内容的可见性不变。2026-11-02 按负责人要求，新增「仅链接可见」入口默认关闭，后台内容卡的快捷切换也移除；原本就是仅链接可见的旧作品，编辑时仍能保留该范围且旧链接继续可读。开关集中在 `lib/visibility/link-visibility.ts`。这只是前端入口控制，**不是数据库级 VIP 权限门槛**；将来按 VIP 开放时，须先设计服务端／数据库的资格校验，不能只打开前端开关。

负责人确认的新规则：单独使用 `posts.visibility = 'neighbors'`，复用现有 `posts` 和 `user_follows`，不新增表、Bucket 或路由。「邻居」指双方关注关系**都已接受**；作者本人和既有后台管理权限继续可读。权限按每次请求时的关系判断，取消任一方向关注后，下次访问即失去阅读权限。邻居作品不进入公开广场、全站搜索、站点地图、公开分享图或公开 metadata；合资格的邻居可在房主的「房间作品」中看见。「只给自己看」的已发布作品现在也进入作者自己的房间，访客仍由数据库 RLS 排除；草稿和隐藏作品只在作者个人列表。原有 `unlisted` 保留，旧链接行为不变。未来「邻居动态」仍是独立待办，本次未新增内容流。

图片边界：现有 `images` Bucket 是公开的，负责人确认第一版「仅邻居可见」只支持纯文字。四个编辑入口会阻止此范围上传图片、保存带 Markdown/HTML 图片或公开 images Bucket 链接的内容；迁移中的 `neighbor_posts_text_only` CHECK 约束再次阻止绕过前端写入。已配图作品需移除配图后才能切换。既有公开图片 URL 不会因移除正文而自动失效；未来若要支持邻居配图，须另外设计私有图片存储与旧链接迁移。本次不改现有 Bucket 的公开属性。

数据库迁移 `20261101083737_neighbor_visibility.sql` 允许互关读已发布的邻居作品，收紧评论与喜欢的读取及写入权限，使它们随帖子可见性变化；日记、文章详情复用数据库 RLS，公开 metadata 仍只查询 public/unlisted。`supabase/tests/neighbor_visibility.test.sql` 覆盖匿名、单向关注、待批准、互关、取消关注、草稿、互动和图片约束。2026-11-02 已在隔离的 Supabase Postgres 容器里，用精简的既有结构和政策基线执行迁移及 SQL 权限测试，结果通过；这不能替代正式库迁移前的真实结构复核。TypeScript、相关 Vitest 与本地生产构建已通过；本地客户端目前连接 Production Supabase，**在迁移实际应用前，邻居作品不会对互关居民正常开放**。不要把仅本地完成说成 Production 已启用。

正式库迁移序列截至 2026-09-24；本地还有 2026-10-18、2026-10-31 两条待应用迁移，并且既有迁移在正式库登记的版本号与本地文件名不同。2026-11-02 只读核对正式库时，原有政策名称和结构满足这条新迁移的预期，但**没有跳过待应用迁移直接改正式库**。上线前须先对齐迁移记录及顺序，确认本地客户端与正式站点的发布时间，再应用本迁移并做互关、取消互关的真实账号验收。

2026-11-02 上线判定：**暂不直接修改正式库访问规则。** 新 RLS 迁移会即时作用于当前线上用户，而 UI 改动、两条较早的迁移与真实互关账号验收尚未一起发布。负责人要求的「仅链接可见」默认关闭已在本地写作入口和后台快捷操作实施；不删除旧 `unlisted` 资料，不撤销旧链接读取权限。将来若改成 VIP 专属，必须另行设计数据库／服务端资格校验，不可把现在的前端开关当成权限边界。

2026-11-02 负责人确认发布关系树：草稿只在作者个人列表；已发布的公开作品进对应广场、作者房间、首页与搜索；私密作品只在作者个人列表和自己的房间；邻居作品只在作者及双方已接受互关的居民房间可见；隐藏作品只在作者个人列表；旧链接可见作品保留直接链接访问但停止新增入口。桌面现代像素写作工具栏展开后改为同一排，窄桌面必要时水平滚动；手机展开后仍两排。日记与文章共用 `ModernWritingPage.module.css`，因此同步生效。TypeScript 与共用编辑画面 4 项测试通过；由于浏览器控制工具未连接到用户当前标签页，尚未做已登录页面的实际宽度截图核对。

后续收到文章页仍分两排的反馈：文章比日记多一个 Code 工具，桌面端现将额外工具容器以 `display: contents` 并入同一 flex 行；700px 及以下仍恢复独立第二排。该调整仅作用于现代像素共用编辑页，经典玻璃工具栏未变。

## 2026-11-01 写日记与写文章的现代像素编辑页

状态：**本地实现，尚未提交或部署。** 负责人选定 01「窗边双纸页」。`/diary/new` 与 `/articles/new` 在 `modern_pixel` 下按需加载同一套 `ModernWritingPage` 与绘制边角的纸张布局：左侧写作，右侧可见范围、今日份额、写作提示与实时预览；文章另保留标题、链接名称、标签及私人提纲。日间／夜晚沿用现有日记、文章专属背景，并覆盖导航栏背后。两页的经典玻璃 JSX 及原有数据库写入、发布限额、草稿、上传图片、Markdown 工具、Ctrl+S、权限检查与文章 slug 规则均保留。现代像素手机布局将可见范围直接放在写作区下方，避免按钮触发旧版黑色弹窗；正式全站手机皮肤优化仍待所有页面完工后执行。未减少任何写作小功能。

验证：共用编辑画面 2 项交互测试、TypeScript、该组件 ESLint 与本地生产构建通过。现有两份编辑页的 ESLint 仍有原来的 `any` 类型错误，本次没有改动这些类型。由于浏览器控制工具未连接到当前已登录标签页，使用临时本地预览核对日间日记、夜晚文章桌面画面和 390px 夜晚文章手机画面；手机画面没有横向溢出。临时预览路由已移除；尚未在已登录账号的真实编辑流程中完成视觉核对或发布操作。草图位于本任务 `editor-drafts/01-window-writing-desk.png`。公开更新日志继续归入 **Alpha 0.9.9**；现代像素皮肤正式发布提醒保持未启用。

## 2026-11-01 日记广场与文章广场的现代像素纸页列表

状态：**本地实现并在浏览器核对，尚未提交或部署。** 负责人选定 03「纸页长廊」的带缩图改稿。`/space/diaries` 和 `/space/articles` 在现代像素皮肤下共用 `PublicSquareModernClient` 和同一套绘制边角、编号纸页布局，日／夜沿用街角阅览室背景；经典玻璃仍走原有广场列表。保留公开内容筛选、最新／热门排序、刷新、加载更多及日记 ID／文章 slug 路由。列表从帖子 Markdown 中提取第一张位于现有 Supabase `images` bucket 的上传图片作小缩图；没有上传图的帖子不显示替代图，也不把背景画作当成用户照片。缩图懒加载、异步解码。草图位于本任务 `public-square-drafts/03-paper-corridor-with-thumbnails.png`。

验证：本地浏览器查看日间日记与文章广场、夜晚日记广场，以及 390px 文章广场；测试结束恢复原本的日间偏好。6 项定向测试、TypeScript、生产构建与新增文件 ESLint 检查通过。旧文件的定向 ESLint 仍报告原有 `any` 类型与 `<img>` 提示，未在本次重写旧查询。当前实际列表前段作品未发现可显示的上传图片，所以真实缩图的渲染由带图片的组件测试验证，待有公开上传图作品时再进行浏览器实图核对。后续仍须完成写日记和写文章页面草图与实现，以及所有现代像素页面完成后的全站手机端统一优化；正式皮肤提醒继续保持未启用。

## 2026-10-31 现代像素阅读页与留言区

状态：**本地实现并在浏览器核对，尚未提交或部署。** 负责人选定 02「街角阅览室」。`/diary/[id]` 与 `/articles/[slug]` 的现代像素版共用宽纸张阅读框、绘制的固定边角、书架窗景与日／夜两张等构图背景；页面使用现有全站日／夜偏好。`PostComments.tsx` 复用原有评论、回复、喜欢、排序与删除逻辑，只在现代像素皮肤下呈现奶油纸张留言区和评论卡；经典玻璃仍使用原样式。阅读页保留现有可见性、编辑、喜欢、分享、举报和阅读记录逻辑。新画作位于 `public/images/page-backgrounds/reading-room-{day,evening}.webp`，各约 374KB / 321KB；生成提示要求街角阅览室、左右书架、中央村庄窗景、蓝色阅读椅，夜晚版只变更天色与灯光，无文字和界面。

验证：本地浏览器查看日间文章与日记、夜晚日记、带真实留言的夜晚文章，以及 390px 手机文章首屏和留言区；测试结束已将原本的日间偏好恢复。阅读相关 29 项定向测试、TypeScript 与生产构建通过。待续：写日记和写文章页面的现代像素草图与功能取舍；所有页面完成后再做全站手机皮肤优化；邻居动态仍待设计。正式皮肤提醒保持未启用。

## 2026-10-31 居民房间窗口、排版与皮肤发布后续计划

状态：**本地实现，尚未提交或部署。** 现代像素皮肤的「今日状态」、关注中、关注者窗口统一采用绘制边角、纸张与日／夜配色；心情选择继续使用原有普通 Emoji，原有状态保存、清除、关系分页与操作逻辑不变。居民房间的关注人数回到资料条右侧并垂直居中；居住天数移进「居民信息」，位于等级等资料卡上方；简介取消三行截断并允许长文字换行。经典玻璃皮肤不使用新窗口样式。公开更新日志继续归入 **Alpha 0.9.9**；现代像素皮肤正式释出时才开启「正式版 1.0.0」，不得提前宣称已正式推出。

待完成的现代像素页面：写日记与写文章页面再分别绘画同系列编辑皮肤，若要减少现有小功能须先和负责人逐项确定。等**所有页面**换上现代像素皮肤后，统一检查和优化这些页面的手机版布局、弹窗、滚动和触控。新增「邻居动态」的想法待设计：只展示当前居民已关注的人所发布的公开日记和文章，和展示全部公开内容的广场保持清楚区分；优先复用现有 `user_follows` 与 `posts`，不改变日记 ID、文章 slug 等路由规则。

三张阅读草图分别为「双页留白」「街角阅览室」「窗边书签」，文件位于 `C:\Users\PC\.codex\visualizations\2026\08\27\01a04160-48cd-7b01-8039-36281290ec6b\room-drafts\reading-0*.png`；负责人选择了第二款，评论区草图也已对应实现。

**未来每次正式推出新皮肤时的一次性提醒规则（本地机制已备好，目前未启用）：** 每个发布批次要有稳定编号和发布时间。仅向发布时间之前已加入的居民，在该批次发布后首次登录并进入 `/home` 时弹出一次；发布时间之后新加入的居民不弹。按钮为「等一下吧」与「带我去看看」，后者跳到 `/settings/skin`。在弹窗出现前，以条件更新占用该账号该发布批次的一次提醒机会；两种选择都不会重复提醒。下一个**新皮肤发布批次**才可再次提醒。弹窗按居民当前正在使用的皮肤绘制，不能按新皮肤绘制。一次性状态按账号持久保存，跨设备同样只提醒一次。负责人已明确同意增加最小资料字段；本地迁移为 `20261031090000_skin_release_prompt_receipt.sql`，仅在现有 `profiles` 增加 `last_skin_release_prompt_id`，不新增表或路由。`lib/skin-release-prompt.ts` 的 `ACTIVE_SKIN_RELEASE` 目前为 `null`，因此**现时不会向任何居民弹窗**。正式推出新皮肤前，须先应用并验证迁移，再把发布编号、皮肤名称、实际发布时间填入该配置；每次正式推出新皮肤时使用新的编号，开发期间的普通样式更新不要更改编号或触发提醒。0.9.9 期间不得启用，也不得将尚未释出的皮肤写成已正式发布。

验证：房间 300 字简介渲染、现代像素／经典首页路由、发布提醒资格与弹窗 11 项定向测试通过；TypeScript、`git diff --check` 通过。浏览器核对夜晚关注者窗口真实数据与桌面布局，也核对过今日状态日／夜和手机布局。皮肤提醒的数据迁移**没有**应用到 Supabase；未进行正式发布、跨设备生产验收、commit、push 或 deploy。


## 2026-10-29 皮肤试看、设置夜景与房间预览按钮修正

状态：**本地实现并在浏览器核对，尚未提交或部署。** `/settings/skin` 的日夜选择现在只更新木柜左门的房间画面与选择标记；柜体和全站背景继续显示已保存版本，点击“保存选择”后才切换全站。左门预览改为直接从同一套柜体画作中对齐截取，避免第二张房间图的框叠在原框内；右门旧版页面截图按柜门开口裁去硬直角。玻璃皮肤本身未修改。

`/settings/about` 的书本补画夜景，窗外改为月夜，纸张继续保持浅色可读；`/settings/account` 的钥匙柜补画夜景，并让缩小的锁、信封、登出插画平滑显示。房间设置页移除了“预览房间”按钮及其独立弹窗，页面原有横幅与主题图仍可看。新增画作：`public/images/about/archival-book-evening.webp`、`public/images/account-security/key-cabinet-evening.webp`。

验证：本地账号在夜晚模式下点“日间”，浏览器确认 `body[data-pixel-time]` 仍为 `evening`、柜体外景仍为夜晚，仅左门画面改为白天；保存后才变为 `day`，再保存恢复原有夜晚偏好。浏览器确认书本和钥匙柜夜景资源生效。皮肤及房间设置定向测试 4 项、TypeScript 检查与 `git diff --check` 通过。

## 2026-10-29 全站现代像素背景横带修复

状态：**本地修复与浏览器预览完成，尚未提交或部署。** 上一轮全高场景图按宽度等比铺满，1920px 宽屏下实际图像高度超过 940px；覆盖图片的渐变层却固定只画到 940px。渐变结束后仍有一截未遮罩的原画，形成用户截图中“底色—画面横带—底色”的断层。现让渐变层覆盖页面整个背景范围，但在距顶部 395px 达到 55% 遮罩、940px 达到实色，之后持续保持实色。统一应用于首页、广场及其他 `data-nav-scene` 页面，以及公告、垃圾桶的日夜样式。图片本身继续等比铺满，不拉伸；经典玻璃未变。

验证：在 1920px 宽屏上滚到广场与首页原本出现横带的位置，确认背景平滑归入底色、无重复露出；浏览器计算样式显示渐变层为 `100% 100%`，末端实色停在 `940px`。`npx tsc --noEmit` 和 `git diff --check` 通过。

## 2026-10-29 全高背景画试用与广场宽屏补边

状态：**本地试用，尚未提交或部署，等待负责人看效果。** 发现前一轮只把渐变遮罩设为 940px，原先 384–512px 高的横幅原画在半页处便结束。现为首页、日记、文章、搜索、信箱、居民房间及四个专属设置子页，分别以原画为参考补画并压缩日／夜各一张，共 20 张约 1672×941 的完整场景，保存在 `public/images/page-backgrounds/*-full.webp`；原横幅仍保留以便退回。反馈图原为 1024×768，按宽度等比显示时已足够覆盖 940px，因此沿用。广场、公告、垃圾桶以及其他本来已有完整高度的画作保留原图。

所有现代像素场景的图片层按 `max(100%, 1672px) auto` 等比铺满宽度，并与 940px 的广场式日夜渐变叠合；宽屏广场左右原先露出底色的原因是图片被固定为约 1670px 宽，现也改为等比铺满屏幕。没有纵向拉伸，月亮保持圆形。导航栏继续透出各页场景。经典玻璃皮肤未变。

验证：浏览器以 1920×940 实际预览夜晚首页、广场与搜索页，检查背景延伸、渐变和广场两侧；检查日夜画作联系图与本地文件。图像转换为 WebP 后每张约 260–570KB，单页仅加载所选日夜图。20 张新图尺寸均至少 1600×900；`npx tsc --noEmit` 与 `git diff --check` 通过。

## 2026-10-29 全站现代像素背景与导航栏透景对齐

状态：**本地试用，尚未提交或部署，供负责人看效果。** 现代像素首页、广场、日记、文章、搜索、信箱、反馈、居民房间、各设置页、公告与垃圾桶统一使用广场的 940px 渐变：日间顶部遮罩 16%、夜晚 21%，在 42% 处均为 55%，末端回到各页底色。清除了此前各路由更高优先级的旧渐变参数，避免表面统一而实际仍提前淡出。所有图片层从页面顶部开始，场景可透过顶部导航；导航栏日夜底色均为 78% 不透明度。各页继续使用自己的日夜画作和原始宽高比，经典玻璃皮肤未动。

限制：部分横幅原画的自然高度短于 940px；渐变参数一致，但不会凭空补出原画的下半部分。为避免月亮变椭圆或画面过度放大，本次不拉伸图片。

验证：浏览器实际检查广场、首页、搜索和皮肤设置的夜晚画面，以及皮肤设置加载时的日间样式；读取计算后的渐变和导航栏颜色，确认搜索此前残留的 427px 提前淡出已变成 940px 全程渐变。`npx tsc --noEmit` 与 `git diff --check` 均通过。

## 2026-10-29 全站广场渐变参数试用

状态：**本地试用，尚未提交或部署，等待负责人看效果。** 现代像素首页、日记、文章、搜索、信箱、反馈、居民房间、设置、更新日志、公告与垃圾桶的背景遮罩统一试用广场参数：日间顶部 16%、夜晚顶部 21%，两者在 42% 高度处为 55%，到 940px 完全融入各页原有底色。图片仍使用各页专属日夜原画并保持原始宽高比，经典玻璃不变。

限制：广场原画本身较高，横幅原画则在约 350–600px 结束；统一遮罩长度不会增加原画内容，因此它们的可见场景仍可能比广场短。本次保留试用效果供负责人判断是否改回较浅版本。

验证：本地浏览器预览夜晚首页与搜索页；CSS 改动经 TypeScript 检查和 `git diff --check` 验证。

## 2026-10-29 页面背景等比缩放收敛

状态：**本地样式修正与浏览器预览完成，尚未提交或部署。** 上一轮将图片按目标高度等比放大虽消除了椭圆月亮，却让部分页面横幅过度裁切。现根据各张原图的实际宽高恢复接近原图的展示宽度，图片高度交由浏览器按比例计算；渐变在画面实际结束处归入底色，夜晚背景稍下移，让月亮露出导航栏。首页、日记、文章、搜索、信箱、反馈、居民房间与四个专属设置页继续使用各自相关的日夜背景。广场、公告、垃圾桶、房间设置、更新日志和经典玻璃不变。

验证：本地浏览器检查夜晚首页、搜索、信箱和皮肤设置的完整场景与圆形月亮；390px 搜索页检查后恢复默认尺寸。TypeScript 检查与 `git diff --check` 通过。

## 2026-10-29 现代像素场景图比例修正

状态：**本地样式修正与浏览器预览完成，尚未提交或部署。** 首页、日记、文章、搜索、信箱、反馈、居民房间和四个专属设置背景此前分别固定图片宽度与高度，把横幅原画纵向拉长，月亮因此变成椭圆。现让图片宽度按原始比例计算、保留各页既有的渐变高度；反馈页原画较窄，改为按页面宽度等比铺满，避免两侧露出底色。夜晚场景轻微下移，信箱及皮肤页按月亮位置额外调整。日夜版共享等比规则，经典玻璃及已等比显示的广场、公告、垃圾桶不变。

验证：首页、文章、信箱、反馈、皮肤设置夜晚画面和 390px 手机首页浏览器预览；月亮不再椭圆、反馈页两侧不留空白，手机无新增横向溢出。恢复默认浏览器尺寸。

## 2026-10-29 居民账号菜单日夜配色

状态：**本地样式调整与夜晚浏览器预览完成，尚未提交或部署。** 现代像素皮肤的头像账号菜单现在跟随全站日／夜选择：日间保留浅色菜单，夜晚改为月亮蓝底、暖白文字、清楚的分隔线和悬停反馈；管理员、登出及未读提醒仍有各自的识别色。样式仅限现代像素的居民账号菜单，经典玻璃保持原样。

验证：夜晚首页打开账号菜单确认底色、文字、图标与未读提醒可辨认；日间沿用原有浅色样式。

## 2026-10-29 专属背景画面高度调整

状态：**本地实现与浏览器预览完成，尚未提交或部署。** 11 组新背景原本多只显示到约 400–600px，渐变层却延伸到 800–1150px，导致画面中途退成纯底色。现在分别提高背景图片层的高度，并为宽幅场景设置适合桌面的最小画面宽度，让图片与渐变一起缓缓延伸；首页、日记、文章、搜索、信箱、反馈、居民房间和四个专属设置背景的日夜版使用相同的尺寸调整。广场、公告、垃圾桶、房间设置、更新日志及经典玻璃保持原样，图片文件本身也未重新编码。

验证：浏览器对照广场并检查首页、日记、文章、信箱与居民房间的夜晚画面，确认新背景继续延伸到页面内容区、渐变衔接自然；日间版共享对应的画面尺寸规则。

## 2026-10-29 现代像素各页面专属日夜背景落地

状态：**本地实现与浏览器预览完成，尚未提交或部署。** 将已确认的 11 张日／夜对照草图拆分并压缩为 22 张网页图片，放在 `public/images/page-backgrounds/`。首页、日记、文章、搜索、信箱、反馈、居民房间和皮肤、隐私、账号安全、关于网站设置页各自使用对应场景，均维持原有渐变和导航栏透景。设置布局按当前子页选择背景；房间设置、更新日志、广场、公告和垃圾桶保留既有专属场景。经典玻璃皮肤未调整。

验证：浏览器实测夜晚版各目标路由加载对应背景，首页、信箱、皮肤页视觉检查；390px 首页检查无横向溢出，恢复浏览器默认尺寸。TypeScript 检查、7 个定向测试文件共 18 项测试和 `git diff --check` 通过。Public Changelog 归入 Alpha 0.9.9；无后台或安全行为变更。

## 2026-10-28 皮肤页夜晚木柜修复与分页面背景预览

状态：**本地实现与预览完成，尚未提交或部署。** `/settings/skin` 的木柜外景原本始终使用绘有日间白色背景的图片；已新增对应的夜晚绘画，并按当前日间／夜晚选择切换外景。浏览器检查夜晚木柜周围已不再出现白色块，柜门、预览与操作位置保持原样。经典玻璃皮肤未调整。

另外为首页、日记、文章、搜索、信箱、反馈、居民房间、皮肤设置、隐私设置、账号安全、关于网站分别绘制了 11 张日／夜对照背景草图，保存在本任务的 `background-previews` 目录，仅供用户挑选；**尚未安装到网站**。房间设置背景依用户要求保留原图。Public Changelog 仅记录已实现的夜晚木柜修复。

验证：夜晚皮肤页实际浏览器确认外景完整；TypeScript 检查、皮肤页 2 项定向测试与 `git diff --check` 通过。测试桩补齐现有 `setPixelTime` 方法以反映当前 Provider 接口。

## 2026-10-28 现代像素各页导航背景连贯

状态：**本地实现与浏览器预览完成，尚未提交或部署。** 负责人认可首页的半透明导航效果后，将同一做法延伸至广场、日记、文章、搜索、信箱、反馈、设置、更新日志与居民房间。各页复用原有的日间／夜晚场景图，场景从导航栏后方连续进入页面，并按页面调渐变；内容层原有的重复场景已关闭。公告页与垃圾桶页本来已有全页场景，此次统一其导航栏的柔和半透明效果。经典玻璃皮肤未改。

验证：本地浏览器检查上述页面的日间与夜晚背景、导航栏透明度及桌面无横向溢出；夜晚预览后恢复原有日间偏好。TypeScript 检查、7 个定向测试文件共 36 项测试和 `git diff --check` 通过。Public Changelog 已归入 Alpha 0.9.9；Admin Changelog 无需更新（无后台或安全行为变更）。

## 2026-10-28 现代像素首页导航背景试做

状态：**本地实现与浏览器预览完成，尚未提交或部署。** 仅在现代像素首页把现有日间／夜晚街景移到页面背景，使同一幅图从导航栏后方连续延伸到首页内容；移除首页内容层重复绘制的场景。导航栏日间使用 78% 浅色底、夜晚使用 78% 月蓝底，并对底图做轻度模糊，保留当前页高亮和文字对比度。经典玻璃与其他页面未调整。

验证：在 localhost:3000/home 实际查看日间和夜晚桌面效果；检查 390px 手机视窗的布局尺寸后恢复默认视窗；测试结束将居民皮肤偏好恢复为日间。Public Changelog 归入 Alpha 0.9.9 的视觉优化；Admin Changelog 无需更新（无后台或安全行为变更）。

更新时间：2026-09-24

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

### 7. Security Center 长期方向

Security Center Phase 1 已完成基础实现并通过 Production 验证，包含受保护的后台概览、居民人工风险与复核记录、不可变安全事件，以及现有评论词语检测入口。Phase 2A 人工流量防护也已完成 Production rollout 与 Owner/Admin 桌面、手机版验证。自动风险判断与自动处罚仍未启用。

Phase 2A 人工流量防护已于 2026-09-25 完成合并、push、Production migration、部署与线上验证。以下自动化与更深层整合仍属于未来规划：

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
Relationship Auth hotfix deployed and production verified
latest Vercel deployment verified
two-account Production test flow verified and closed
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

## 2026-09-14 P0 Password Recovery Identity Isolation Hotfix

当前状态：**implementation complete、committed、pushed、deployed、Production verified。** 修复提交 `9ee3396093a8addf9b27dd3bfd375bf86b8cf4b3` 已部署至 Vercel Production；两封重新签发的 QA 恢复邮件均完成跨浏览器密码重设，QA A / QA B 均可使用各自的新密码登录，未再修改浏览器原先登录的其他居民身份。Draft / Trash Production smoke test 已恢复并完成。

### Root cause 与影响

* 旧的 `/reset-password` 直接使用网站一般登录共用的 Browser Supabase client 调用 `updateUser()`，并未要求页面先收到可信的 `PASSWORD_RECOVERY` 事件。
* 密码恢复邮件原本由 PKCE Browser client 发出。链接若改在另一台电脑或另一个浏览器打开，缺少原浏览器保存的 code verifier，恢复 callback 无法建立对应会话；若该浏览器已有其他居民登录，会继续保留原有有效 session。
* 两个条件叠加后，重设页面仍会显示密码表单，并可能修改浏览器当前已登录居民的密码，而不是邮件链接对应的居民。此问题列为 P0，其他 Production smoke test 必须等待修复上线并验证。

### 修复

* `lib/auth/passwordRecovery.ts` 新增专用密码恢复 client。发信采用不依赖原设备 verifier 的 implicit recovery flow，且不读取或持久化网站的一般登录 session。
* 重设页面使用独立的 `sessionStorage` key 接收恢复 session；只有收到 `PASSWORD_RECOVERY` 且带有有效居民身份时才显示密码表单。
* 提交前再次通过恢复 client 向 Supabase 验证当前居民，并要求 ID 与恢复事件确认的居民完全一致；密码更新只通过这一个隔离 client 执行，客户端传入的居民 ID 不受信任。
* 页面明确显示本次重设对应的邮箱。无效、过期、未验证或身份不一致的链接会隐藏密码表单，并持续显示可阅读的错误说明和重新申请入口，不再短暂闪烁后消失。
* 重设成功后清除专用恢复 session 与本机原有登录 session，再引导居民重新登录，避免旧账号画面造成身份误解。
* 没有修改 Supabase schema、migration、RLS、Auth Dashboard 配置、Relationship、Notification 或 Draft / Trash 行为；没有读取或写入 Production 数据。

### 验证

* 密码恢复定向 Vitest：3 个文件、7/7 tests 通过。覆盖无恢复链接、伪造 recovery URL、有效恢复身份、提交前身份不一致、隔离发信 client 与临时恢复 storage。
* Auth、密码恢复与 Changelog 定向回归：8 个文件、63/63 tests 通过；其中密码恢复专属测试为 3 个文件、7/7 tests。
* TypeScript、focused ESLint、production build（46/46 static pages）与 `git diff --check` 全部通过。

## 2026-09-13 Draft / Trash Lifecycle Fix

当前状态：**implementation complete、committed、pushed、deployed、Production verified。** 功能提交 `1f2e3426fedcbc7e425cc2a4e1f5e07eab7f8652` 已由 Vercel 自动部署至 Production；没有数据库 schema 变更，不需要 Production migration。专用 QA 居民已完成日记与文章的草稿、发布、删除、恢复、状态保留、数量、每日额度、所有权隔离、旧链接和 15 天清理规则验证。

### 行为与实现

* `/drafts` 不再维护独立草稿列表，旧地址会转到 `/trash`。居民菜单在桌面与手机端统一将「草稿箱」替换为「垃圾桶」。
* 桌面居民账号菜单与手机居民菜单已将操作 Emoji 全部替换为统一的 Lucide 线性图标。每行使用固定 20px 图标轨道、18px 图标和独立尾部状态栏，文字起点保持一致，未读徽章不会挤动标签。
* 日记草稿继续由 `/diary` 的「草稿」分类管理，点击草稿直接进入 `/diary/[id]/edit`；文章草稿继续由 `/articles` 的「草稿」分类管理，点击草稿直接进入 `/articles/edit/[id]`。
* 新增 `/trash`，只读取当前登录居民自己的 `posts` 软删除记录，并仅显示 `diary` / `article`。已发布内容和草稿均保留原 `status`，恢复时不会改变原来的草稿或发布状态。
* 删除与恢复统一通过 `app/actions/trash.ts` 的 Server Action，actor 来自可信 Cookie Session；不接受客户端传入居民身份。删除时间、恢复时间与保留期限均使用服务器时间。
* `lib/server/postTrash.ts` 统一提供本人垃圾桶读取、软删除、恢复及过期清理。读取与 mutation 均限制 owner、内容类型和生命周期状态；过期内容不能再恢复。
* 复用现有每日 Vercel Cron `/api/cron/publish-announcements`，每天清理删除时间达到 15 天的日记与文章。清理使用既有 service-role 服务端环境，不新增 scheduler，也不提供手动永久删除入口。
* 日记新建页的每日额度查询继续只统计 `deleted_at IS NULL` 的有效日记；进入垃圾桶的日记不占用当前有效额度，恢复后会重新计入。
* `/trash` 已加入 robots 禁止抓取列表。垃圾桶加载失败时显示独立错误状态，不把数据库失败误报为空垃圾桶。

### Scope 与部署边界

* 没有修改 `posts` schema、RLS、Auth、Relationship、Notifications、Security Center、VIP 或 Admin 权限。
* 没有新增 migration；功能实现与部署本身不要求 Production schema 写入。最终 smoke test 只创建和操作明确标记的 QA 内容，没有触碰普通居民资料。
* Public Changelog 已在现有 Alpha 0.9.8 阶段累计居民可见的垃圾桶、草稿入口与循环修复说明；Admin Changelog 不适用。
### 本地验证

* 定向 Vitest：13 个文件、30/30 tests，通过。覆盖正常列表排除删除内容、草稿编辑路由、旧 `/drafts` redirect、删除链接循环、本人权限、恢复、保留期限边界、Cron 清理条件及桌面/手机菜单入口与统一图标栅格。
* TypeScript：`npx tsc --noEmit` 通过。
* Focused ESLint：新文件与直接支持模块通过；涉及的既有编辑器、列表及 Navbar 在排除其原有 `no-explicit-any`、React Compiler 与 `<img>` 基线规则后为 0 errors。没有在本任务扩大清理旧 lint 债务。
* Production build：通过，46/46 static pages，`/trash` 为动态 server-rendered route，`/drafts` 保留为旧地址兼容入口。
* 桌面 1440x900 与手机 375x812 实际渲染通过。手机恢复按钮宽 330px，页面 `scrollWidth 370 <= viewport 375`，无横向溢出；菜单图标均为 18px，手机 7 个标签的起点统一为 x=86，桌面 7 个标签的起点统一为 x=1025.5。视觉检查用临时预览逻辑已删除，未进入最终工作区。
* `git diff --check`：通过。仅有 Windows 工作区既有 LF -> CRLF 提示，没有 whitespace error。
* Production deployment：Vercel deployment `dpl_6ZLRsSSiptiKHWkvrFQqkDQEozGJ` 为 `READY`，目标为 `production`，Git ref 为 `main`，正式域名 `ourlittleage.com` 与 `www.ourlittleage.com` 已指向该部署。
### Production 最终验证（2026-09-14）

* QA B 完成日记草稿、已发布日记、文章草稿与已发布文章的 Create -> Delete -> Trash -> Restore 闭环；恢复后四类内容均保留原 `draft` / `published` 状态。
* All / Published / Draft 数量在删除后减少、恢复后增加。已发布日记进入垃圾桶后当日可用额度由 2 恢复为 3，恢复内容后回到 2，确认已删除日记不占有效额度。
* 已删除日记 `/diary/[id]/edit` 与文章 `/articles/edit/[id]` 均只跳转一次至 `/trash`，没有继续编辑入口或 redirect loop；旧 `/drafts` 同样只跳转一次至 `/trash`。
* QA A 的垃圾桶保持空白，不能看到 QA B 的删除内容；直接访问 QA B 已删除文章的旧编辑地址仍回到 QA A 自己的空垃圾桶，QA B 记录未被修改。Server Action owner 条件与既有 RLS 定向测试继续通过。
* Production 桌面页面无横向溢出；部署前同一提交的 375x812 与 1440x900 实际渲染结果继续适用。定向回归 9 个文件、19/19 tests 通过。
* Production Vercel Cron 继续使用 `/api/cron/publish-announcements`，部署配置为每日 `0 0 * * *`。无授权请求返回 401；handler 使用服务器时间，只清理 `deleted_at <= now - 15 days` 的 `diary` / `article`，因此 `<15 days` 保留、`>=15 days` 可清理。边界由 handler-level 定向测试验证，没有篡改 Production `deleted_at` 制造 aged fixture。
* 最终部署 `dpl_Bg6ZhnexGJhPXQ4JZygo8Q8x1d5J` 为 `READY`，Production 运行密码恢复 hotfix 提交 `9ee3396093a8addf9b27dd3bfd375bf86b8cf4b3`；相关路由最近一小时没有 Vercel runtime error。
* QA cleanup：测试内容 ID 147-150 已全部软删除并保留原状态，普通内容列表无残留；四条 QA-only 记录按产品生命周期在垃圾桶保留 15 天，之后由现有 Cron 清理。没有对普通居民数据执行操作。

## 2026-09-12 Security Center Phase 1

当前状态：**Phase 1 与 Phase 2A 均已 implementation complete、committed、pushed、deployed，并通过 Production 验证。Phase 2A 上线前离站逻辑备份已于 2026-09-24 完成并验证；Security Center、Profile lifecycle、Moderation review lifecycle 与 Phase 2A migrations 均已受控应用至 Production。最终数据库权限矩阵、保留期隐私、Owner/Admin 线上页面与健康检查通过；自动风险判断与自动处置保持关闭。**

### 已实现

* 新增 migration `supabase/migrations/20260912150000_security_center_foundation.sql`：建立 `security_feature_flags`、`security_events` 与 `security_risk_profiles`。
* `security_events` 采用 append-only 保护；人工风险、复核与内部备注操作使用 request ID + fingerprint 幂等处理，并在同一数据库事务写入一条 Security Event 与一条 `admin_logs`。
* 风险资料与 `profiles.status` 保持独立。人工风险调整不会自动警告、禁言、封禁居民，也不会触发其他处罚。
* Security Center 与事件收集开关默认开启；`risk_evaluation_enabled` 与 `automatic_enforcement_enabled` 默认且持续关闭。
* 新增受保护 RPC：`security_get_feature_flags`、`security_admin_get_overview`、`security_admin_get_resident`、`security_owner_apply_risk_action`。浏览器角色没有直接表或 RPC 权限，服务端继续使用可信会话取得 actor。
* 新增 `/api/admin/security` 与 `/api/admin/users/[id]/security`。Owner/Admin 可读；只有 Owner 可修改风险、复核状态与内部备注；Moderator、普通居民与匿名访客均被 Server/API 与数据库边界拒绝。
* 新增 `/admin/security` 与侧栏入口，显示人工复核数量、风险分布、只读 feature flags、分页安全事件，以及词语检测区块。
* 词语检测继续复用 `comment_moderation_keywords`、`comment_moderation_flags`、`rescan_comment_moderation` 与原 `/admin/comments` 审核流程。Security Center 只显示启用/停用数量、待检查数量与最近五条命中，不复制评论正文或审核动作，也不产生风险事件。
* `/admin/comments?filter=flagged` 只接受 `flagged` 深链接；其他 URL filter 均回到原本的今日视图。
* `/admin/users/[id]` 增加独立 Security 区域：账号状态、风险等级、复核状态与历史清楚分开；Owner 可写，Admin 只读；读取失败不会使居民管理房间崩溃。

### 验证与限制

* 已新增 `supabase/tests/security_center_foundation.test.sql`，覆盖 schema、默认值、角色矩阵、append-only、幂等、审计与账号状态独立性；账号 lifecycle regression 进一步覆盖删除事件 subject 与 actor 的真实 `auth.users -> profiles` 级联流程。
* Readiness Review 的只读 Production catalog 检查确认目标 migration 尚未记录，同名 tables/functions/triggers/indexes/policies 均不存在，现有 `profiles`、`admin_logs` 与评论词语检测依赖匹配；Production PostgreSQL 为 17.6，隔离验证环境为 PGlite PostgreSQL 18.3。
* **Lifecycle 修复：**`security_events.user_id` / `actor_id` 现作为无 profile FK 的 immutable historical UUID 保存。删除居民或 actor 不会更新或删除安全事件，资料生命周期可以完成，事件 UUID、reason 与 metadata 保持原值；普通 UPDATE/DELETE 仍由 append-only trigger 拒绝。
* 修复后的 migration 与完整 SQL verification 已在隔离 PGlite PostgreSQL 18.3 环境通过；subject 删除、actor 删除、RLS、RPC、幂等与审计回归均通过。本次 SQL 未使用 PostgreSQL 18-only feature，保持与 Production PostgreSQL 17.6 兼容。
* 最终只读 Production 检查确认 migration history 与 catalog 中仍无 Security Center 对象或命名冲突；现有 46 名居民，首次 migration 预计建立 46 条默认 `low` / `no_review_required` 风险资料，不修改 `profiles.status`。
* Production 为 Supabase Free plan，没有平台自动每日备份或 PITR。上线前闸门已使用 Supabase CLI `db dump` / `pg_dump` 生成并验证离站逻辑备份；异常时继续保持自动评估与自动处置关闭，并优先使用 forward repair migration。
* Vitest 定向测试、TypeScript、focused ESLint、Production build 与 `git diff --check` 均已通过；Production apply 已在独立明确批准后执行。
* Public Changelog：不适用。本阶段是内部后台、安全与权限基础，只同步 HANDOFF 与 Admin Changelog。

### Production Migration 与验证状态（2026-09-13）

* 已验证备份位于仓库外 `C:\Backups\ourlittleage\20260913T113408+0800`；roles、schema、data、migration history 与 SHA-256 manifest 均可读取，未写入数据库凭据，未进入 Git。
* Production migration 已成功应用，远端 migration history 为 `20260913034004 security_center_foundation`；没有应用其他 Security migration。
* `security_feature_flags`、`security_risk_profiles`、`security_events`、约束、索引、触发器、RPC 与 RLS 均存在。46/46 居民风险资料初始化为 `low` / `no_review_required`，原有 46 个 `profiles.status = active` 未改变。
* Production flags：Security Center 与事件收集开启；`risk_evaluation_enabled = false`、`automatic_enforcement_enabled = false`。不存在自动警告、禁言、封禁、登出或内容删除。
* Owner QA 操作已验证 risk、review、internal note、request ID 幂等，以及每次有效 mutation 同时产生 Security Event 与 Admin Log；QA 风险资料已恢复为默认状态。六条 QA 安全事件与六条对应 Admin Log 按 append-only 审计规则保留。
* `security_events` 的 UPDATE 与 DELETE 均被 append-only trigger 以 `42501` 拒绝。普通 authenticated / anon 没有安全表读取、事件写入或安全 RPC 执行权限。
* 首个 Production lifecycle blocker（`notifications.user_id NOT NULL` 搭配 `ON DELETE SET NULL`）已由 forward repair 修正为 `NOT NULL + ON DELETE CASCADE`。
* 已批准生命周期规则：通知收件箱、风险资料、VIP 当前会员与居民徽章随账号删除；运营/审核归因保留记录并把已删除操作者设为 `NULL`；Security Event、Admin Log 与 VIP Event 保留不可变历史 UUID；社区内容 FK 本阶段不改。
* 新增 forward migration `supabase/migrations/20260913035922_fix_profile_lifecycle_foreign_keys.sql` 与 SQL 回归 `supabase/tests/profile_lifecycle_forward_repair.test.sql`。测试先在旧 schema 上因通知收件人规则失败，再在 migration 后通过完整 Profile lifecycle、多个通知、无关居民、归因匿名化、审计 UUID 保留与 Security Event append-only 回归。
* Forward repair 已应用 Production，远端 migration history 为 `20260913090355 fix_profile_lifecycle_foreign_keys`。最终 FK catalog、46 个 Profile、140 条通知、0 个空收件人及 0 个孤儿通知均验证正常。
* **已解除的 Production blocker：**真实事务化 QA 删除曾在 `comment_moderation_flags.reviewed_by` 执行 `SET NULL` 时触发 `comment_moderation_flags_review_check`；该 check 要求 `cleared` 状态必须同时保留非空 `reviewed_by` 与 `reviewed_at`，导致 PostgreSQL `23514`。失败测试事务完整回滚，未影响现有居民资料。
* 产品规则已修正：`comment_moderation_flags.reviewed_by` 属于 historical moderation attribution。Pending 继续允许 `NULL`；Cleared 记录在 reviewer Profile 删除后保留原 UUID、状态与时间，不保存额外 PII。
* 新增 forward migration `supabase/migrations/20260913113218_fix_moderation_review_lifecycle.sql`：只删除 `comment_moderation_flags_reviewed_by_fkey`，保持 column nullable、`comment_moderation_flags_review_check`、索引及现有 rows 不变。代码提交 `115bcca0b14edfe215a4322677fe96040faf337e` 已 push 至 `main`，Production migration history 记录为 `20260913115107 fix_moderation_review_lifecycle`。
* 新增 `supabase/tests/moderation_review_lifecycle_forward_repair.test.sql`，并更新完整 lifecycle regression。测试已先在旧 FK 设计上准确复现 check failure，再于新 migration 后确认 reviewer Profile 可删除、Cleared flag 与 reviewer UUID 保留、Pending flag 继续合法、review check 仍存在；完整 Profile lifecycle 与 Security Event append-only 回归通过。
* Narrow `SET NULL` audit 只检查 `reports.reporter_id`、`comment_moderation_keywords.created_by`、`comment_moderation_flags.reviewed_by`、`growth_logs.actor_id`、`posts.deleted_by`、`user_badges.assigned_by`。除已修正的 moderation reviewer 冲突外，其余五列没有 CHECK、trigger 或 function/RPC 的确定性 lifecycle 矛盾，保持现状。
* Production 重测已确认 reviewer Profile 可删除，Cleared flag、状态、时间与历史 reviewer UUID 保留，Pending flag 继续合法；完整 Profile lifecycle、Security Event append-only、Owner/Admin/Moderator/Resident 权限矩阵与幂等审计均通过。
* Production 测试全部在事务中回滚；QA auth、profile、通知、安全事件、后台日志、VIP 事件与审核 flag 残留均为 0。先前已记录的六条 QA Security Event 与六条 Admin Log 继续按 append-only 审计规则保留。
* Vercel Production deployment `dpl_69yoh77dNtjXDzx3mLRsdKkQ2Rdf` 已部署提交 `115bcca0b14edfe215a4322677fe96040faf337e`，状态 `READY`，正式域名 alias 正常；检查窗口内没有 runtime error。
* 当前没有可用的 Owner/Admin 浏览器登录 session，因此后台 Security Center 与 Resident Detail 的最终视觉点击验证标记为 deferred；未绕过认证。数据库权限、事务、审计、匿名访问守卫与 Production 页面响应已经验证。
* **结论：`PROFILE LIFECYCLE REPAIR PRODUCTION VERIFIED`，并且 `SECURITY CENTER PHASE 1 PRODUCTION VERIFIED`。** 自动风险判断与自动处置仍关闭。

### Phase 2A Production 状态（2026-09-25）

```text
implemented: yes
committed: yes
pushed: yes, main
migration applied: yes
deployed: yes
production verified: yes
```

* 设计文档：`docs/superpowers/specs/2026-09-24-security-center-phase-2a-design.md`；实施计划：`docs/superpowers/plans/2026-09-24-security-center-phase-2a.md`。
* 新增 forward migration `supabase/migrations/20260924130000_security_firewall_operations.sql`，建立受保护的 `security_firewall_requests` 生命周期、严格约束、RLS、索引、事件词汇扩展与 service-role-only RPC。没有修改历史 migration。
* 新增 RPC：`security_admin_get_firewall_requests`、`security_owner_create_firewall_request`、`security_owner_transition_firewall_request`、`security_cleanup_firewall_targets`。创建、转换、Security Event 与 Admin Log 保持同一事务，request ID 支持幂等重试。
* Phase 2A 仅建立人工流程：IP/CIDR 防护单、解除防护、Rate Limit 观察方案、Owner 人工确认、不可变审计与结束记录 90 天后匿名化。数据库重新验证公开网络、最小 CIDR 范围与合法状态转换。
* Owner 可读取仍在保留期内的完整目标并执行生命周期操作；Admin 只读且只收到遮罩目标；Moderator、resident 与 anonymous 在页面、API、RPC、grant 和 RLS 边界均无权访问。
* 新增受保护 API `/api/admin/security/firewall`、`/api/admin/security/firewall/[id]`，以及 `/admin/security` 内独立「流量防护」区域。区块有自己的 loading、error、retry、筛选与分页，不会因失败隐藏 Phase 1 或词语检测。
* 新增每日 retention route `/api/cron/security-firewall-retention`，由 `CRON_SECRET` 保护；数据库使用可信时间，只处理 `resolved / cancelled / failed` 且已满 90 天的记录。匿名化会销毁完整目标、遮罩目标、目标衍生指纹、自由备注与外部规则标识，只保留随机对象 ID、状态、actor 与时间等非目标审计资料。Production 已部署每日 `00:30 UTC` 的 Cron，未授权请求返回 401，重复执行安全。
* 首轮 Production Readiness Review 发现旧保留设计仍可用遮罩目标与确定性指纹验证原 IPv4，因此判定 `NOT SAFE`。本地 privacy repair 已改为活动期保留重复检测，结束满 90 天后销毁所有持久目标衍生值；Phase 2A Security Event 与 Admin Log 从写入时起只记录随机请求/对象 ID、状态和结构化事件，不复制目标、遮罩值或自由备注。
* 新增负向重识别与历史关联回归：匿名化后原候选与替代候选都无法通过保留资料验证；两个不同时间的同目标历史记录不共享目标衍生指纹。Owner/Admin API 与后台 UI 都只显示「目标已匿名化」。
* Vercel Firewall 继续作为实际规则与实时流量的 source of truth；应用没有 Vercel Access Token，也不会调用 Vercel mutation API。Production 规则必须由 Owner 在 Vercel 独立完成后，再回到安全中心确认。
* `Ban Resident != Block IP`；防护单不会修改 `profiles.status` 或 `security_risk_profiles`。`risk_evaluation_enabled = false` 与 `automatic_enforcement_enabled = false` 持续关闭。
* 本地使用完全隔离的 PostgreSQL 17 临时集群验证 Phase 1 与 Phase 2A SQL suites；没有连接或写入 Production。Privacy repair 完成后已重新通过 TypeScript、focused ESLint、154 项聚焦 Vitest、Production build 与 `git diff --check`。
* 2026-09-24 Final Production Readiness Review 的只读 Production catalog 检查确认 Phase 2A 尚未应用且无同名对象冲突，但发现 Production `admin_logs.admin_id` 为 `NOT NULL`，而原 `security_cleanup_firewall_targets()` 会尝试写入 `admin_id = null`，导致 90 天匿名化事务回滚。该版本结论为 `NOT SAFE`。
* System Retention Audit Compatibility Fix 已在尚未应用的 Phase 2A migration 内完成：自动保留期清理不再写 `admin_logs`，只写一条 actorless、append-only、无目标衍生资料的 `security_events` 系统事件；人工 Owner 创建与生命周期操作继续以真实 Owner UUID 写入 Admin Log 与 Security Event。没有修改 Production `admin_logs` schema。
* SQL fixture 已对齐 Production，固定 `admin_logs.admin_id NOT NULL`。隔离 PostgreSQL 17 按 Production 真实约束重新通过 Phase 1 与 Phase 2A SQL suites，覆盖系统事件、人工审计、90 天边界、幂等、候选重识别与历史关联。后续 Final Production Readiness Review 已通过，并在独立明确批准后执行 rollout；没有发布或自动修改任何 Vercel Firewall 规则。

#### Phase 2A Production rollout 与验证

* 上线前备份位于仓库外 `C:\Backups\ourlittleage\20260924T155342Z`；roles、schema、完整 logical dump、migration history、restore list 与 SHA-256 manifest 均已验证，未保存数据库密码或进入 Git。
* 已按批准范围将 `b727ccd^..94efe38` 合并至 `main`，最终功能提交为 `a4b2c27292d58745bc99bd63f16e1f12ea81bd6c`，无冲突并已 push。隔离 PostgreSQL 17 的 Phase 1 + Phase 2A SQL suites 通过；12 个定向 Vitest 文件共 150/150 tests、TypeScript、focused ESLint、Production build 与 `git diff --check` 全部通过。
* 仅应用 `20260924130000_security_firewall_operations.sql`；Production migration history 记录为 `20260924160220 security_firewall_operations`。`security_firewall_requests`、约束、索引、RLS 与四个 service-role-only RPC 均存在；普通 authenticated / anon 没有表权限或 RPC 执行权限。
* Production 事务化 smoke test 验证 Owner 写入、Admin 遮罩只读、Moderator/resident 拒绝、request ID 幂等、人工双审计与系统单一 actorless Security Event。90 天匿名化会清除所有目标衍生资料，重复清理保持幂等；测试事务全部回滚，`security_firewall_requests` 无残留，既有 6 条安全事件与 26 条后台日志未改变。
* `risk_evaluation_enabled = false`、`automatic_enforcement_enabled = false` 持续关闭。应用未加入 Vercel token，也没有 Vercel mutation API 或自动处罚路径；实际 Firewall 规则继续由 Owner 在 Vercel 独立人工操作。
* Vercel Production deployment `dpl_J9hd7Fs1nutZjufpPB5EhKoeZCFx` 状态为 `READY`，正式域名运行提交 `a4b2c27292d58745bc99bd63f16e1f12ea81bd6c`。部署后的未授权 Cron 请求返回 401，Production 检查窗口内没有 Vercel runtime error 或 Security Firewall 相关 Supabase error。
* Owner 在 1440x900 与 390x844 实际验证安全中心、流量防护、人工操作说明、词语检测与安全事件；页面无横向溢出或浏览器错误。Admin 使用临时提升的专用 QA A 在相同桌面与手机视口验证遮罩只读：没有网络目标输入、建立防护单或确认写入入口，HTML 不含完整网络目标。测试结束后 QA A 已恢复为 `user / active`，刷新 `/admin/security` 会立即回到 `/home`。
* 普通居民浏览器访问被拒绝；Moderator、resident 与 anonymous 的数据库/API/RPC 权限边界由 Production 事务测试和定向回归确认。没有创建真实防护单、没有修改普通居民资料，也没有遗留 Phase 2A QA operational row。
* Public Changelog 不适用；本阶段只同步 HANDOFF 与 Admin Changelog。结论：`SECURITY CENTER PHASE 2A PRODUCTION VERIFIED`。

## 2026-09-10 Admin Changelog Foundation

当前状态：**implemented、committed、pushed，并已随 Production commit `02e7c48aea58c00dfe2095e7f97494102be90b0d` 部署验证。** 本次没有数据库变更，也不需要 Production migration。

* 新增 `/admin/changelog`，复用现有后台布局与侧栏，显示日期、阶段、类别、影响范围、状态与简要说明。
* Admin Changelog 数据位于 `server-only` 模块，不提供 Public API，也不会由 Public Changelog 页面引用。
* 页面在服务器端再次读取可信登录身份；Owner/Admin 可查看，Moderator、普通居民与未登录访客不能读取内容。侧栏入口同样只对 Owner/Admin 显示，但权限不依赖前端隐藏。
* Public Changelog 静态资料迁移到独立公开数据模块，并移除年龄统计、内容后台、留言审核工具、操作日志、业配后台等内部条目；居民可感知的功能与修复继续保留。
* Admin Changelog 初始整理了近期后台年龄统计、Relationship Auth 修复、有效阅读后台统计、留言审核与商业合作后台记录。本次分流本身只记录于 Admin Changelog，不增加 Public 版本号。
* 长期执行 `CHANGELOG POLICY`：任何实际项目变化必须更新 HANDOFF，再根据受众同步 Public、Admin 或两者分别描述。

## 2026-09-09 Relationship System V1 Phase 2

当前状态：**implementation complete、committed、已合并到 `main`、已 push、Production migration 已应用、Vercel deployment 已验证，并于 2026-09-19 完成双测试账号 Production 闭环。Relationship System V1 Phase 2 已 Production verified / closed。** Browser/Server Auth Session 不同步问题已由 Auth hotfix commit `1960e7038b47fa672cedbe3fceb6c8fc1381ad34` 修复并完成 Production 验证。

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

### 验证与 Production 闭环

* 开发阶段 PGlite PostgreSQL 17 兼容隔离环境通过 Phase 1 核心回归与 Phase 2 通知事务测试；随后两阶段 migration 均已受控应用 Production，并完成真实双账号验证。
* 原完整回归记录为 Vitest 60 个测试文件、542 项测试全部通过；2026-09-19 最终闭环再次执行 8 个 Relationship 直接相关测试文件，共 60 项全部通过。
* 全仓库 ESLint 仍有历史问题：本分支 183 errors / 50 warnings；对比基线 185 errors / 49 warnings，本阶段没有新增错误，新增警告为沿用现有运行时头像 `<img>` 方式。
* 使用 `QA_Relationship_A` 与 `QA_Relationship_B` 在正式站完成 open follow、unfollow、approval request、cancel pending、reject、accept、mutual、break mutual 与 remove follower。所有状态在刷新及登出/重新登录后保持正确。
* `approval_required` 不计入 accepted 数量；接受后 Followers / Following 正确增加。Mutual 只由两条 accepted 关系动态推导；解除一个方向后反方向保留，Mutual 立即消失。
* `follow`、`follow_request`、`follow_accepted` 分类正确；取消、拒绝、取消关注与移除关注者不产生额外通知。同一关系动作未产生 duplicate row 或 duplicate notification。
* 普通居民直接访问 `/admin/users/[id]` 被服务器权限守卫送回 `/home`；Server Action actor 继续只取可信 Cookie Session，浏览器不能代表另一居民操作。
* 手机 390x844 与桌面 1440x900 视口均正确显示关注计数、按钮与“互相关注”，没有关系控件重叠或溢出；刷新后状态保持。
* 测试窗口内相关 Vercel routes 没有 runtime error，浏览器控制台没有 Relationship / Auth / RLS error，也没有 redirect loop。
* QA 清理完成：两个账号之间 `user_follows = 0`，QA B 的 `follow_mode` 已恢复为 `open`，活动测试通知为 0。六条本轮关系通知按正常信箱删除流程保留在垃圾桶，没有硬删除或影响旧通知。
* Phase 2 原开发分支：`codex/relationship-phase-2`；提交范围 `ba7ccef` 至 `b2fe365`，已通过提交 `2cece34` 合并到 `main` 并 push。Auth hotfix、Production deployment 与完整测试账号闭环现均已验证。

### 后续

1. Relationship System V1 已关闭，不再保留 Phase 2 Production 验证待办。
2. Block System 仍优先于 Mention 与 Friend；Mention 与 Friend 继续作为相互独立的后续阶段，不得把 Mutual Follow 当作 Friendship。

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
* Relationship System V1 Phase 2 已 implementation complete、committed、合并并 push，Production migration 已应用；Auth hotfix `1960e7038b47fa672cedbe3fceb6c8fc1381ad34` 已部署并验证，双测试账号 Production 闭环于 2026-09-19 完成，Relationship V1 已关闭。
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

## 2026-10-17 居民房间现代像素风 UI 第一页

按逐页草图确认流程，只调整 `/u/[username]` 居民房间的视觉表现：顶部导航、夜间卧室横幅、叠放头像、资料与关注统计、成长条、徽章和作品卡片均按获批参考图重新排版，并加入桌面/手机响应式像素边框。自定义房间背景与头像优先保留；只有 `banner_url` 为空时才使用 `public/images/resident-room-pixel-night.png` 默认像素卧室。无头像时使用中性人物图标，不按性别生成或切换角色动画。

关注/关注者操作、关系状态、房间状态、头像上传、资料读取、文章与日记链接、筛选和分页逻辑均未改变。Relationship controls 仅调整视觉标签结构与桌面纵向位置，不改变按钮行为；桌面资料区整体下移 24px，并将资料文字再下移 12px，为「新住民」标签与横幅留出间距，同时让关系控件维持已确认的位置。成长统计、成长进度与徽章分区的横向分隔线按负责人像素稿实现：每端在线前使用六格小像素，保留已确认的阶梯走向并在末端下方增加第六格；横线从第六格底边开始，不从像素点下穿过。共享 Navbar 与关系组件的像素样式由 `/u/[username]` 页面标记限定，不影响其他页面。此次只完成第一张页面，后续页面仍须先展示草图并得到确认。

本地预览后进一步美化居民房间导航品牌小屋：更换为淡紫色阶梯像素屋顶剪影与深色小门，匹配已确认的参考样式；图标位置、尺寸、链接行为保持不变。成长统计卡片将 `Lv.N` 改为「等级 N」，并以书写笔图标替换剑形图标；等级读取和成长逻辑不变。

Public Changelog 将此居民可见视觉更新并入现有 Alpha 0.9.8 累计阶段，没有新增版本号。导航框与成长统计卡片使用已确认的第 4 款像素阶梯边角，包含内侧细框和角落色块；使用静态 CSS，不增加脚本、动画或图片请求。当前仅为本地未提交实现；未 commit、push、deploy，也未进行 Production 验证。

## 2026-10-18 居民账号菜单外框横线

居民房间头像账号菜单外框的顶线和底线改为三段细线、两处断口；内部资料区、后台管理区与登出区分隔线恢复原样。外框竖线、角落方块、页面主导航、菜单内容与交互保持不变。样式为静态 CSS。Public Changelog 并入 Alpha 0.9.8 累计阶段，未新增版本号。本地未提交，未 push、deploy 或进行 Production 验证。

同页整页 Navbar 外框线从 1px 微调为 2px；边角形状、颜色、尺寸与导航布局不变。Public Changelog 并入 Alpha 0.9.8 累计阶段，未新增版本号。本地未提交，未 push、deploy 或进行 Production 验证。

居民房间横幅高度在手机端从 190px 增至 206px；桌面端从 300px 增至 332px。继续使用 `object-cover`，图片不变形，房间资料内容按原有叠放布局跟随横幅下移。Public Changelog 并入 Alpha 0.9.8 累计阶段，未新增版本号。本地未提交，未 push、deploy 或进行 Production 验证。

## 2026-10-18 居民房间生产样式修复

修复生产构建中 `body:has(main[data-resident-room])` 作用域规则未进入输出 CSS，导致共享 Navbar 与关注关系控件样式丢失的问题。改由 `SiteShell` 按 `/u/` 路由为 body 设置明确样式作用域标记；确认生产 CSS 包含 Navbar 与关系控件规则，且不再依赖旧选择器。构建成功；本地未提交，未 push、deploy 或进行 Production 验证。

## 2026-10-18 居民房间像素心情入口预览

居民房间横幅右上方的状态入口改为像素心形按钮，浅薄荷色内部承载「设置心情」文字，已有状态时仍展示状态内容。鼠标悬停、键盘聚焦和按下时内部颜色提亮，悬停/聚焦时增加轻柔外沿光感；键盘焦点有清晰轮廓。只影响 `/u/[username]` 的 floating 变体；首页状态卡片、状态弹窗、资料保存逻辑和访客可见性保持不变。无新增图片请求或动画依赖。Public Changelog 并入 Alpha 0.9.8 累计阶段。当前本地未提交，未 push、deploy 或进行 Production 验证。

按居民确认的参考图重绘浮动心形：采用严格镜像的 32×27 阶梯网格，手机与桌面保持近似正方像素比例；外层改为柔和玫瑰粉，内层使用暖深棕描边，中心改为浅腮红渐层，文字使用深暖棕并居中。只调整浮动入口的外观尺寸、形状和配色，状态交互与数据逻辑不变。Public Changelog 同步为浅粉色像素心形。本地未提交，未 push、deploy 或进行 Production 验证。

根据反馈将心形横向收窄约 10%，保持原有高度、像素轮廓网格、颜色、文字中心点与左右对称；手机和桌面使用相同比例。首页状态卡片不受影响。Public Changelog 同步标记为收窄版。本地未提交，未 push、deploy 或进行 Production 验证。

后续对照负责人再次提供的原图，撤回横向压缩，恢复参考图宽高比例；将心形下半部阶梯延长并细化，让两侧逐步收尖至底端，避免轮廓显得短胖或像牌匾。维持顶部凹口、双层描边、颜色、文字居中和严格左右对称；仅 floating 入口变化。本地未提交，未 push、deploy 或进行 Production 验证。

2026-10-18 按负责人提供的像素画替换此前估算的 CSS 心形：按原图 14×14 单元提取为 43×38 网格，准确保留红色外线（173 格）、深灰内线（166 格）和粉色主体（856 格），棋盘背景不带入页面。三层分别使用独立 CSS 颜色变量，SVG 按像素格渲染并保持原图比例，文字与状态交互继续叠放在中心。新增网格尺寸、颜色格数和左右对称测试。本地未提交，未 push、deploy 或进行 Production 验证。

按负责人要求仅替换三层配色，像素轮廓和 43×38 网格不变：外线恢复玫瑰粉 `#bf8188`，内线恢复暖深棕 `#382927`，主体恢复浅腮红渐层 `#f7d9d5` 至 `#f0cbc7`。三个色层仍分开配置，悬停时整体柔和提亮。本地未提交，未 push、deploy 或进行 Production 验证。

按负责人新提供的像素画，仅替换居民房间 floating 心情入口的轮廓：按原图提取为 44×35 网格，逐格保留包含偏右下阴影的深色像素形状，棋盘背景不带入页面；原有玫瑰粉外线、暖深棕内线与浅腮红渐层主体颜色保持不变。SVG 视窗与按钮宽高比按新网格同步调整，文字、状态交互及首页卡片不变。Public Changelog 并入 Alpha 0.9.8 累计阶段。本地未提交，未 push、deploy 或进行 Production 验证。

按负责人再次提供的像素画，继续只微调居民房间 floating 心情入口的 44×35 网格轮廓与深色阴影像素；三层原有颜色和主体渐层、按钮比例、文字及交互均不变，透明棋盘背景未带入。Public Changelog 更新为最新轮廓说明。本地未提交，未 push、deploy 或进行 Production 验证。

按负责人反馈，撤回最新一张像素稿的轮廓调整，恢复到前一版其确认更满意的 44×35 爱心像素网格（R 162 格、D 194 格、P 809 格）。玫瑰粉外线、暖深棕内线、浅腮红渐层、按钮尺寸、文字和交互不变。Public Changelog 保持为居民确认轮廓的描述。本地未提交，未 push、deploy 或进行 Production 验证。

按负责人要求，居民房间浮动爱心图形整体缩至原 SVG 显示区域的 92%，按钮占位和 44×35 像素轮廓不变；文字内容组上移 4px。颜色、渐层、状态逻辑与交互不变。Public Changelog 同步记录外观微调。本地未提交，未 push、deploy 或进行 Production 验证。

按负责人要求再将浮动爱心图形相对当前尺寸缩小 10%（SVG 宽高各为按钮的 82.8%），并在空状态的「设置心情」文字左侧加入随机装饰 Emoji。鼠标每次进入整个状态按钮时，当前 Emoji 向右淡出，动画结束后随机切换到不同 Emoji；已有居民心情或状态时仍显示其原内容，不被装饰 Emoji 覆盖。支持 reduced-motion 偏好。按钮占位、轮廓、配色、渐层、文字垂直位置和点击逻辑不变。Public Changelog 已同步。本地未提交，未 push、deploy 或进行 Production 验证。

按负责人反馈移除新增的随机装饰 Emoji 与悬停切换动画，空状态文字恢复独立居中；将浮动心形相对当前大小再缩小 15%（SVG 宽高为按钮的 70.38%）。居民已选的真实心情 Emoji 仍按原有状态展示。按钮占位、像素轮廓、配色、渐层与点击行为不变。Public Changelog 已同步。本地未提交，未 push、deploy 或进行 Production 验证。

按负责人要求，在上述尺寸基础上再将浮动心形缩小 10%（SVG 宽高为按钮的 63.34%），文字组上移 4px。像素轮廓、配色、渐层、状态 Emoji 与按钮交互不变。Public Changelog 已同步。本地未提交，未 push、deploy 或进行 Production 验证。

按负责人要求将浮动心形在当前基础上再缩小 5%（SVG 宽高为按钮的 60.17%），整体向右上各移动 2px，并将心形整体不透明度设为 80%。仅影响 SVG 心形，不改变文字、按钮占位、轮廓、色值或状态交互。Public Changelog 已同步。本地未提交，未 push、deploy 或进行 Production 验证。

按负责人反馈撤回上项外观调整，恢复到居中定位的 63.34% SVG 尺寸、原有不透明度，以及上移 4px 的文字组。修正定位时移除会覆盖 SVG 居中变换的平移工具类。Public Changelog 已恢复对应说明。本地未提交，未 push、deploy 或进行 Production 验证。

按负责人再次确认，仅将浮动心形在恢复版基础上缩小 5%（SVG 宽高为按钮的 60.17%），并设为 80% 不透明度；保持原本居中位置、上移 4px 的文字、轮廓、配色及交互不变。Public Changelog 已同步。本地未提交，未 push、deploy 或进行 Production 验证。

按负责人确认的方案，将今日状态弹窗整体改为现代像素风：外框使用阶梯切角与柔和淡紫描边，标题及底部使用分段横线，表情选项、输入框和操作按钮统一为克制的像素直角样式；保留深色夜间底色、原有弹窗布局、响应式滚动、状态保存/清除逻辑及键盘焦点提示。Public Changelog 已同步。本地未提交，未 push、deploy 或进行 Production 验证。

按负责人提供的导航栏参考图，将今日状态弹窗外框四角改为独立淡紫像素方块，细边框从角标之间延伸；移除原有阶梯切角，弹窗内部样式与布局不变。Public Changelog 已同步。本地未提交，未 push、deploy 或进行 Production 验证。

按负责人要求，在今日状态弹窗外框的上、下、左、右四条边线中央各加入 8px 缺口，保留四角像素方块与原有分段内容分隔线。其余样式与行为不变。Public Changelog 已同步。本地未提交，未 push、deploy 或进行 Production 验证。

按负责人新参考图将四个外框角标改为 3×3 青蓝像素方块 `#00B7EF`，中心 1×1 橙色像素 `#FF7E00`；角标与边线之间保持 4px 空隙，四边中央原有缺口保留。参考图的棋盘底色未引入。Public Changelog 已同步。本地未提交，未 push、deploy 或进行 Production 验证。

修正角标绘制层级：中心橙色 1×1 像素位于青蓝 3×3 方块上层，确保四个角的双颜色都可见；尺寸、颜色、与边线间距和边线缺口不变。

修复右上、左下与右下橙色中心格偏移：改用各角边缘固定 4px 的定位语法，使四个橙色 1×1 像素均准确处于各自青蓝 3×3 方块中心。其他尺寸、颜色和缺口不变。

按负责人最新要求，将四角 3×3 底色由青蓝改为浅紫 `#B8A9D6`，中心橙色像素 `#FF7E00` 保留；已校准的居中位置、角块与边线间距及四边中央缺口保持不变。

## 2026-10-18 居民房间称号暂时关闭

居民房间资料区暂时默认隐藏称号标签（包括「新住民」及其他等级称号），优先进行房间皮肤打磨。称号计算、居民等级与升级规则均保留，不涉及数据或权限变更。通过 `SHOW_RESIDENT_TITLE` 控制显示；恢复时将其设为 `true`。

回看日期：2026-10-25（马来西亚时间）。届时检查居民称号是否需要调整，并决定是否重新开启标签。本项目前仅为本地实现，未 commit、push、deploy 或进行 Production 验证。

## 2026-10-18 居民房间关注统计位置微调

居民房间资料区的「关注中 / 关注者」两个计数按钮整体下移 8px；仅调整视觉位置，统计、名单弹窗、关注操作及占位布局不变。当前本地未提交，未 push、deploy 或进行 Production 验证。

## 2026-10-18 居民房间浏览者皮肤偏好

设置侧栏新增「皮肤」入口，提供「现代像素」与「旧版」两种居民房间外观。该偏好属于当前登录浏览者：登录者选择的皮肤应用于其浏览的所有 `/u/[username]` 房间，而不是由房主控制访客看到的外观；未登录或偏好无效时默认为现代像素。旧版恢复圆角与柔和玻璃质感，并覆盖房间导航、状态入口/弹窗及关系控件；不影响其他路由。现有 `profiles.theme` 仍只控制房间背景氛围。

旧版外观基准已从 GitHub `components/UserRoomClient.tsx` 找回并校验：来源提交 `bc6ae515716b6147370a5ddec7e392063b4b9250`，文件 blob `61cb8bb8ea21ae8d38a29c597741f4bced61cf45`；原始实现仍由 Git 历史保存，来源记录在 `components/room-skins/classic/README.md`。旧版覆盖样式独立于 `components/room-skins/classic/classic-room-skin.module.css`，仅在浏览者选择旧版时通过动态导入加载；共用房间数据和交互逻辑不复制。生产构建中该皮肤 CSS 独立约 1.2 KB gzip。

2026-10-18 根据负责人反馈，补齐经典房间皮肤的整体布局还原，而不只覆盖边框质感：恢复广场返回入口、旧版房间宽度与封面高度、头像叠放、纵向资料/关系区、胶囊式等级数据、渐变成长条，并移除现代像素统计卡和阶梯分隔装饰。共用数据、路由、互动与现代像素版布局保持不变；称号继续暂时隐藏。本地未提交，未 push、deploy 或进行 Production 验证。

更正上一条的实现方式：负责人要求经典皮肤使用原版代码，已从 GitHub 提交 `bc6ae515716b6147370a5ddec7e392063b4b9250` 逐字复制 `components/UserRoomClient.tsx` 至独立模块 `components/room-skins/classic/ClassicUserRoomClient.tsx`；本地 Git blob `61cb8bb8ea21ae8d38a29c597741f4bced61cf45` 与 GitHub 源文件完全一致。`UserRoomClient` 仅按浏览者所选皮肤分流渲染，原始现代像素实现保留。构建通过，皮肤与房间相关测试 5 项通过。本地未提交，未 push、deploy 或进行 Production 验证。

新增 `profiles.room_view_skin` 字段迁移 `20261018190000_viewer_room_skin_preference.sql`，复用现有 profiles 行与 RLS，不新增表、Bucket 或 Storage 资源。迁移只新增在本地，尚未应用到 Supabase；迁移未应用时设置会保存在本机 localStorage，并在设置页明确提示未启用跨设备同步。当前本地未提交，未 push、deploy 或进行 Production 验证。

2026-10-18 按负责人确认的长期方案统一皮肤应用范围：皮肤属于当前浏览者，Navbar 与其浏览的居民房间读取同一个 `RoomViewSkinProvider` 状态，进入他人房间时两处外观一致。Navbar 复用已有 profile 请求同步 `room_view_skin`，房间加载器不再重复查询浏览者资料；设置页切换时立即更新共享状态，并继续保存至 localStorage / `profiles.room_view_skin`。现代像素与经典房间由独立动态组件分流，只挂载所选皮肤；经典房间与 Navbar 样式置于独立样式包，选中经典版后才动态加载。构建资源检查确认经典样式 CSS 独立约 12.9 KB（未压缩），现代房间模块 CSS 约 12.8 KB；实际传输大小会由压缩与缓存决定。相关测试与生产构建通过。迁移仍未应用 Supabase；本地未提交、未 push、未 deploy 或进行 Production 验证。

2026-10-18 修复经典皮肤在 `/u/[username]` 路由中仍露出像素导航边框的问题。运行时确认浏览者状态与 Navbar 属性均为 `classic`，但 CSS Modules 将合并选择器中的 `::before` 规则丢失，房间专用像素框因此仍可见。将伪元素与菜单框隐藏规则拆分后，构建产物包含正确的 `::before { display: none }`，本地浏览器验证旧版房间 Navbar 恢复圆角样式。相关 10 项测试通过；本地未提交、未 push、未 deploy 或进行 Production 验证。

## 2026-10-19 深夜广场现代像素 UI

按负责人确认的草稿重做 `/space` 页面视觉：顶部使用原创夜间居民广场像素场景与标题叠层；日记/文章入口改为夜景裁切、浅紫分段边角与简洁图标；最新内容卡片和空状态采用同一克制像素边框体系。生成场景转为 640px WebP（约 44 KB）。保留现有 `posts` 查询、日记 ID 路由、文章 slug 路由、手机 Feed 筛选以及桌面最新/热门日记和文章四区；Navbar、其他页面、数据库与交互逻辑不变。新增 SpaceClient 页面回归测试，目标测试与 ESLint 通过；Production build 成功。本地浏览器确认新页面语义结构已加载，页面和场景资源均返回 200；像素视觉细节由负责人在预览中确认。当前本地未提交、未 push、未 deploy 或进行 Production 验证。

负责人选定第三版草稿后，将 `/space` 主题切换为「小镇广场」日间版本：换为晴日庭院像素场景和雾蓝浅色画布，卡片文字改深色高对比，保留浅紫像素边框及橙色角标中心。页面标题与 metadata 同步；移除可见的月亮/深夜语义。既有手机 Feed、桌面四区、`posts` 查询及路由均不变。日景素材为 640px WebP（约 81 KB）；旧夜景素材保留但不再被页面引用。Production build 成功；定向页面测试 4 项通过，SpaceClient 与测试文件 ESLint 通过。浏览器验证 `/space` 现显示「小镇广场」及白日庭院语义图，页面和新图片资源均返回 200；像素视觉细节仍由负责人确认。本地未提交、未 push、未 deploy 或进行 Production 验证。

按负责人要求，为 `/space` 的「日记广场」与「文章广场」入口分别重绘并替换背景：日记入口使用阳光庭院长椅与橘白猫，文章入口使用花园阅读桌、书本与茶杯。图片压为 900×410 WebP，分别约 103 KB 与 93 KB；两张图片的左侧渐层为入口文字保留清晰阅读空间，既有卡片尺寸、像素边框、角标和路由行为不变。为背景图加入可访问名称，并扩展 SpaceClient 回归测试。定向测试 4 项通过，SpaceClient 与测试文件 ESLint 通过，Production build 成功；本地页面和两张图片均返回 200，浏览器已确认入口插画呈现。像素视觉细节由负责人在预览中确认。本地未提交、未 push、未 deploy 或进行 Production 验证。

## 2026-10-21 晴天街区广场皮肤

负责人选定第三款「晴天街区」草稿。现代像素 `/space` 改为短街景横幅、左侧紧凑最新日记与右侧日记/文章入口；热门内容、最新文章、手机筛选和原有帖子查询仍保留。街景与入口素材作为 WebP 放在 `public/images`，现代像素样式独立于 `components/site-skins/modern-pixel/space.module.css`。

旧版广场组件从仓库 HEAD 原代码逐行复制至 `components/room-skins/classic/ClassicSpaceClient.tsx`，由浏览者皮肤状态动态切换，两款广场均按需加载，旧版布局和数据入口不使用新 CSS。当前皮肤选择实际覆盖导航、居民房间及广场；首页与其他页面主体仍待后续逐页接入，不应称为全站主体已完成。没有新增数据表、Bucket 或路由。定向测试与本地生产构建通过；未进行浏览器视觉验收、commit、push、deploy 或 Production 验证。

2026-10-22 现代像素广场左侧「最新内容」区加入日记/文章双页轮播。默认日记，每 10 秒交替；鼠标停在整个左区或键盘焦点位于其中时暂停，离开后重新计满 10 秒。底部两个刻度按钮可直接切换，滑页从左进入、向右退出；浏览器标签页隐藏时暂停，减少动态效果偏好下取消位移动画。右侧入口、手机原有 Feed、帖子查询与经典皮肤均不改。

同日按负责人截图微调：轮播刻度底色与现代像素广场画布一致；移除桌面下方重复的整组「最新文章」，文章仍保留在上方轮播、右侧入口、手机 Feed 与「热门文章」区。经典皮肤不变。

## 2026-10-22 日记与文章个人页皮肤

现代像素 `/diary` 使用「日历窗」布局，日期可翻月筛选；现代像素 `/articles` 使用同系列「文章索引」布局，以月份索引取代常驻月历，并保留具体日期筛选。文章搜索从输入首个字符起显示标题、标签与内容片段建议，建议区在正常布局中展开，月份索引随之下移；右侧文章列表同时按关键词筛选。全部／已发布／草稿每页最多五篇，采用 1 篇重点卡＋两排各 2 篇短卡，通过分页继续浏览。经典日记与文章页面分别保留为独立组件，两套皮肤按浏览者偏好动态加载；仍使用现有 `posts`、日记 ID 路由及文章 slug 路由，没有新增数据结构或资源 Bucket。此项仅在本地实现，尚未 commit、push、deploy 或进行 Production 验证。

## 2026-10-22 现代像素房间试改撤回

按负责人要求，撤回本地现代像素房间的浅雾蓝背景与浅色徽章试改，恢复此前的房间背景和深色徽章。其他房间样式、经典皮肤及数据行为不变。仅本地撤回，未 commit、push、deploy 或进行 Production 验证。

## 2026-10-22 现代像素首页「街区入口」

负责人选定第一版草图，将现代像素 `/home` 改为白日街景短横幅、2×2 常用入口与并列公告栏、最新日记/文章及今日状态三栏；在线居民继续显示在下方。沿用现有登录检查、公告、通知、公开帖子、在线居民和状态保存逻辑；仅为最新帖子补读发布时间用于日期显示。现代版独立于 `components/site-skins/modern-pixel/ModernHomeClient.tsx` 与 `home.module.css`，只在浏览者选择现代像素时按需加载；经典／玻璃首页保留原渲染。未新增数据表、Bucket 或路由。本地页面预览、定向测试和类型检查通过；未 commit、push、deploy 或进行 Production 验证。

## 2026-10-23 现代像素全站导航「云白轻框」

负责人从三款导航草图中选定第二款。仅针对 `modern_pixel` 浏览者皮肤，将共用 Navbar 调整为雾蓝页背景上的云白导航面、浅紫边框及角标、细橙底线；按当前路径显示浅紫栏目选中态，搜索、账号入口、未登录入口与桌面/手机居民菜单同步使用浅色文字和背景。经典／玻璃 Navbar 样式及其动态加载边界不变，未改数据库、路由或用户资料。本地导航测试、TypeScript 与桌面/手机视觉检查通过；3001 本地预览已刷新。Public Changelog 已同步；Admin Changelog 不适用。此项仅在本地实现，尚未 commit、push、deploy 或进行 Production 验证。

同日微调现代像素 Navbar 的右侧账号入口：仅显示头像，隐藏头像旁的用户名，未读数量徽章贴在头像右上角。展开后的居民菜单与经典／玻璃 Navbar 不变。Public Changelog 已同步；Admin Changelog 不适用。本地未提交、未 push、deploy 或进行 Production 验证。

## 2026-10-23 现代像素信箱「街区分拣台」

负责人从三款信箱草图中选定第二款。`/notifications` 在浏览者选用 `modern_pixel` 时按需加载独立的晴天邮局分拣台：左侧分类、中间列表、右侧读信与操作；手机端选信后进入可返回的读信视图。信箱/互动分类、未读/已读/重要/星标/垃圾桶、读信状态、星标、重要、软删除与恢复、关注申请处理继续使用现有通知数据和操作；选中来信本身不会自动标记为已读。经典／玻璃版原有页面渲染保持不变，无新增表、Bucket 或路由。Public Changelog 已同步；Admin Changelog 不适用。此项仅在本地实现，尚未 commit、push、deploy 或进行 Production 验证。

同日负责人确认信封草图：现代像素信箱的五个分类共用紧凑信封外观，保留头像、类型、标题、摘要与未读橙点；右侧选中信件以拆开的信封和抽出的信纸呈现，原正文、链接和操作不变。互动通知及经典／玻璃皮肤不套用信封样式。仅为视觉调整，未改通知数据或操作行为。

## 2026-10-23 街区搜索双皮肤

负责人确认现代像素与经典玻璃搜索草图后，重做 `/search`。两套页面按浏览者皮肤偏好分别按需加载，搜索逻辑共用；首页红色公告板仅完成草图，本次未改 `/home`。公开搜索显式限定 `posts` 中已发布、公开、未删除的日记和文章，自己的草稿、私密及未列出内容不进入全站结果。按标题优先、正文与标签其次搜索，结果分页读取，数量查询不下载正文；日记链接使用 ID，文章链接使用 slug。输入后展开建议并推动后续内容，支持类型筛选、清除、错误重试及 `q/type/page` 可分享地址。未新增表、Bucket、路由或数据库迁移。

定向测试 6 项、TypeScript、相关 ESLint 通过；本地浏览器已核对两套皮肤、真实公开结果、文章筛选、分页、搜索地址刷新恢复。原现代像素偏好在短暂预览旧版后已恢复。未执行生产构建；本地未提交、未 push、未 deploy，也未进行 Production 验证。

## 2026-10-24 现代像素更新日志「版本档案柜」

负责人选定 01「版本档案柜」草图。`/settings/changelog` 在现代像素皮肤下使用绘制的晴天档案室、四层木柜及花饰信纸：抽屉每页展示四个版本，可翻到往期；选择版本后，右侧按「新功能／修复／优化」阅读对应真实记录，长记录默认显示各类前三项并可展开全文。三张插画压缩为 WebP，总计约 842 KB。设置共用侧栏继续使用原有组件，经典玻璃皮肤保留此前的完整列表布局。未新增数据表、Bucket、路由或权限。

Public Changelog 的 Alpha 0.9.8 条目按居民可理解的页面与功能重新归类，合并零碎的房间边框、横幅与间距说明，并把原有两项用户可见故障归入「修复」；补入已在本地实现的公告、垃圾桶、设置画面与本次档案柜外观。原版本号与日期未改，旧版本记录未改。Admin Changelog 无后台或安全行为变化，不更新。定向测试 7 项、TypeScript、相关 ESLint、本地生产构建（47/47 静态页）和浏览器视觉核对通过。本地未提交、未 push、deploy 或进行 Production 验证。
