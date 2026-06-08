# 小时代 PROJECT_CONTEXT.md

## 项目名称

小时代（Our Little Age）

正式域名：

https://www.ourlittleage.com

---

# 项目定位

小时代不是博客，也不是论坛，也不是社交媒体。

它是一个：

**居民长期居住的故事社区。**

核心关键词：

* 深夜
* 温柔
* 慢节奏
* 房间感
* 生活痕迹
* 长期陪伴

用户进入小时代后，不是发动态离开，而是像住进一个数字小镇。

重点不是流量。

重点不是短视频。

重点是：

**让人愿意留下来。**

---

# 当前开发阶段

## Alpha 0.5

更新时间：2026-06-09

状态：

🟢 已进入社区运营系统与成长系统闭环阶段

Alpha 0.5 的重点不再是单纯博客功能，而是让小时代开始具备：

* 居民成长
* 社区信任
* 徽章奖励
* 通知信箱
* 后台运营
* 举报处理
* 房间展示
* 首页居民控制台

---

# Alpha 0.5 已完成重点

## 成长系统 V1

核心文件：

lib/community-growth.ts

已完成：

* addUserGrowth()
* calculateLevel()
* 自动更新 profiles.exp
* 自动更新 profiles.trust_score
* 自动更新 profiles.level
* 自动写入 growth_logs
* 等级提升时自动发送 notifications

---

## 成长字段

profiles.exp

前台显示为：

留下的光

---

profiles.trust_score

前台显示为：

社区信任

---

profiles.level

根据 exp 自动计算。

当前规则：

* exp >= 10 → Lv5
* exp >= 6 → Lv4
* exp >= 3 → Lv3
* exp >= 1 → Lv2
* 其他 → Lv1

---

## 当前成长奖励规则

已接入：

* 发布文章：+0.08 留下的光
* 发布日记：+0.03 留下的光
* 发表评论：+0.01 留下的光
* 评论被喜欢：+0.003 留下的光
* 举报成功：+0.05 社区信任
* 恶意举报：-0.05 社区信任

所有成长变化都会写入：

growth_logs

---

# 徽章系统 V1

核心文件：

lib/badge-awards.ts

已完成：

* awardBadge()
* checkFirstArticleBadge()
* checkFirstDiaryBadge()
* checkFirstCommentBadge()

当前自动徽章：

## 初次发声

条件：

发布第一篇文章

---

## 深夜记录者

条件：

发布第一篇日记

---

## 温柔来信

条件：

发表第一条评论

---

# 通知信箱系统

路径：

/notifications

已支持：

* 未读
* 已读
* 重要
* 星标
* 垃圾桶
* 软删除
* 恢复
* Navbar 红点同步

相关事件：

notifications-updated

用于通知 Navbar 重新获取 unread count。

已修复：

获得徽章后通知存在，但 Navbar 红点不更新的问题。

---

# 评论喜欢系统

表：

comment_likes

已支持：

* 喜欢评论
* 取消喜欢
* 防止重复奖励
* rewarded 字段防止重复加光

规则：

同一居民只能对同一评论保留一个喜欢记录。

评论被喜欢时，评论作者获得：

+0.003 留下的光

---

# 举报系统成长闭环

路径：

/admin/reports

已支持：

* 举报列表
* 状态筛选
* 最新 / 最旧排序
* 同一目标举报次数提示
* 查看举报目标
* 隐藏被举报文章
* 隐藏被举报评论
* 警告用户
* 禁言用户
* 封禁用户
* 标记已解决
* 驳回
* 标记恶意举报

成长规则：

* 已解决：举报人 +0.05 社区信任
* 恶意举报：举报人 -0.05 社区信任

已使用 report_rewarded 防止重复奖励 / 重复扣分。

---

# 居民详情后台

路径：

/admin/users/[id]

已完成：

* 居民资料
* 角色管理
* 状态管理
* Owner 保护
* Admin 不能管理 owner
* Moderator 权限限制
* 留下的光显示
* 社区信任显示
* 等级显示
* 手动调整成长值
* 调整后写入 admin_logs
* 调整后发送通知
* 最近内容
* 最近评论
* 相关举报记录
* 已拥有徽章
* 最近管理记录
* 真实统计卡片

统计卡片已升级为真实总数：

* 文章总数
* 日记总数
* 评论总数
* 举报总数
* 徽章总数

不再只统计最近 8 条。

---

# 居民房间

路径：

/u/[username]

已完成：

* 公开资料
* Banner
* Avatar
* 当前状态
* 等级
* 留下的光
* 社区信任
* 徽章胶囊
* 最近获得徽章区块
* 最近留下的光 activity 区块
* 成长记录展示
* 公开文章
* 公开日记
* 喜欢数
* 评论数

未来扩展：

* 收藏
* 关注
* 称号
* 共同好友
* 房间访客

---

# Home 首页

路径：

/home

定位：

居民控制台 + 世界动态入口

已完成：

* 深夜广播
* 世界公告
* 最新文章
* 最新日记
* 在线居民
* 写日记
* 写文章
* 成长卡片

  * LIGHT
  * TRUST
  * BADGES
* 快捷入口

  * 写下今天
  * 写一篇故事
  * 小时代信箱
  * 回到我的房间

已修复：

旧 /write 路由改为：

/articles/new

---

# 技术栈

Frontend：

* Next.js App Router
* TypeScript
* TailwindCSS

Backend：

* Supabase

Auth：

* Supabase Auth

Storage：

* Supabase Storage

Markdown：

* react-markdown

Chinese Conversion：

* opencc-js

---

# 正式路由结构

## Landing

游客入口：

/

---

## Home

居民首页：

/home

---

## Diary

我的日记：

/diary

新建日记：

/diary/new

日记详情：

/diary/[id]

编辑日记：

/diary/[id]/edit

---

## Articles

我的文章：

/articles

新建文章：

/articles/new

文章详情：

/articles/[slug]

编辑文章：

/articles/edit/[id]

---

## Space

总广场：

/space

日记广场：

/space/diaries

文章广场：

/space/articles

---

## Resident Room

公开居民主页：

/u/[username]

个人资料设置：

/settings/profile

---

## Notifications

小时代信箱：

/notifications

---

## Admin

/admin

/admin/users

/admin/users/[id]

/admin/reports

/admin/logs

/admin/settings

/admin/broadcast

---

# 重要路由规则

最新日记跳转：

/diary/[id]

最新文章跳转：

/articles/[slug]

禁止继续使用旧结构：

/posts/

/write

---

# 用户系统

数据来源：

profiles

重要字段：

* id
* username
* bio
* avatar_url
* banner_url
* role
* status
* level
* exp
* trust_score
* mood_emoji
* status_message
* status_expires_at
* show_level
* show_exp
* show_trust_score
* show_joined_days
* created_at
* last_seen_at

---

# 日记系统

定位：

记录今天、情绪、深夜、生活碎片、没说出口的话。

规则：

默认 private

可切换 public

详情页：

/diary/[id]

使用 ID，不要改成 slug。

支持：

* Markdown
* 图片
* 评论
* 举报
* 喜欢 / 评论互动

---

# 文章系统

定位：

认真表达、完整故事、长文内容、作品创作。

详情页：

/articles/[slug]

使用 slug，不要改成 ID。

支持：

* Markdown
* 图片
* Tags
* Notes
* 评论
* 举报
* 喜欢 / 评论互动

状态：

* draft
* published

Visibility：

* public
* private
* hidden
* unlisted

---

# 评论系统

组件：

PostComments.tsx

支持：

* 文章评论
* 日记评论
* 评论删除
* 评论举报
* 评论喜欢
* 评论成长奖励

规则：

用户只能删除自己的评论。

不能删除别人评论。

管理员可在后台隐藏 / 删除评论。

---

# 广场系统

总入口：

/space

---

## 日记广场

路径：

/space/diaries

特点：

* 轻
* 碎片
* 今天
* 情绪

---

## 文章广场

路径：

/space/articles

特点：

* 故事
* 阅读
* 作品
* 长文

原则：

不要把日记和文章混成同一种流。

---

# Admin 系统

角色：

* owner
* admin
* moderator
* user

权限规则：

## moderator

不能：

* 改身份
* 改角色
* 改成长
* 改权限

主要负责：

* 内容审核
* 评论审核
* 举报处理

---

## admin

不能：

* 管理 owner
* 创建 owner
* 删除 owner

---

## owner

最高权限。

不可被降级。

不可被删除。

---

# Supabase Tables

## profiles

用户资料

---

## posts

文章 / 日记共用内容表

字段：

* id
* type
* title
* slug
* content
* status
* visibility
* author_id
* published_at
* edited_at
* edit_count
* tags
* notes

type：

* article
* diary

---

## comments

评论表

字段：

* id
* post_id
* author_id
* content
* created_at
* updated_at
* is_deleted
* is_hidden

---

## comment_likes

评论喜欢系统

字段：

* id
* comment_id
* user_id
* is_active
* rewarded
* created_at
* updated_at

作用：

* 评论喜欢
* 取消喜欢
* 评论成长奖励

规则：

同一居民只能对同一评论保留一个喜欢记录。

---

## growth_logs

成长记录

字段：

* id
* user_id
* light_change
* trust_change
* reason
* created_at

作用：

* 记录留下的光变动
* 记录社区信任变动
* 居民房间 activity 展示
* 未来成长历史
* 数据分析
* 管理后台审查

---

## notifications

通知 / 信箱

用途：

* 系统通知
* 徽章通知
* 等级通知
* 管理通知
* 未来互动通知

---

## reports

举报系统

用途：

* 举报文章
* 举报日记
* 举报评论
* 举报用户

关键字段：

* reporter_id
* target_type
* target_id
* reason
* details
* status
* is_malicious
* report_rewarded
* handled_by
* handled_at

---

## admin_logs

后台日志

用途：

记录管理员重要操作。

---

## badges

徽章定义

用途：

保存徽章名称、描述、颜色等。

---

## user_badges

用户徽章

用途：

记录居民已获得的徽章。

规则：

unique(user_id, badge_id)

防止重复获得。

---

# Supabase Storage

avatars

用户头像

---

banners

房间背景

---

images

文章图片 / 日记图片

---

# UI 氛围组件

* FloatingParticles
* MouseGlow
* PageTransition
* PageRouterTransition

目标：

让整个社区像深夜里的小镇。

不是科技感。

不是赛博朋克。

不是论坛。

而是有温度的数字住所。

---

# 世界观视觉规划

当前 Alpha：

使用 Emoji 作为临时图标资源。

例如：

🏅 🌙 📜 ✨

---

Beta 规划：

逐步替换为小时代原创视觉资源。

风格方向：

* 信封
* 邮票
* 羽毛笔
* 蜡封
* 日记本
* 月亮
* 萤火虫
* 旧照片
* 纸船
* 小灯
* 房间
* 深夜窗户

---

未来建立：

小时代官方徽章体系 V1

包含：

* 深夜系列
* 故事系列
* 书信系列
* 守护者系列
* 活动限定系列
* 节日限定系列

资源来源：

AI 生成 + 自定义设计。

最终逐步替换全部 Emoji 占位资源。

---

# Alpha 上线前清理提醒

上线前需要清理测试数据。

重点包括：

* 测试文章
* 测试日记
* 测试评论
* 测试举报
* 测试通知
* 测试 growth_logs
* 测试 user_badges
* 测试 admin_logs
* 测试账号资料

目标：

让正式 Alpha 居民进入一个干净的新世界。

---

# 当前技术债

## 1. username 唯一性尚未完全验证

需要检查：

* unique
* not null
* 大小写冲突
* 重名修改
* 空白字符
* 特殊字符
* 中文用户名

---

## 2. 旧 route 残留检查

需要搜索：

/posts/

/write

确保全部迁移到：

/diary/[id]

/articles/[slug]

/articles/new

---

## 3. Navbar route 清理

确认 Navbar 所有入口都是当前正式路由。

---

## 4. 移动端全面测试尚未完成

重点测试：

* /home
* /space
* /space/articles
* /space/diaries
* /u/[username]
* /diary
* /articles
* /notifications
* /admin

---

# 开发原则

新增功能前先判断属于：

* 居民系统
* 广场系统
* 房间系统
* 管理系统
* 世界氛围系统

避免重复造轮子。

优先复用：

* profiles
* posts
* comments
* notifications
* reports
* growth_logs
* badges
* user_badges

不要轻易新增重复 table。

---

# 下一阶段建议

## P0 Alpha Bug Sweep

上线前必须做：

* username 唯一性验证
* route 残留检查
* Navbar route 检查
* 手机端测试
* 权限测试
* 测试数据清理

---

## P1 Alpha 0.6

可继续做：

* 收藏系统
* 关注系统
* 徽章视觉资源
* 用户称号系统
* 居民等级展示优化
* 房间访客
* 世界事件系统

---

# 长期目标

小时代最终会发展为：

一个让居民长期留下故事、房间和人生痕迹的数字社区。

用户不是来消费内容，而是来住下。

用户不是来刷完离开，而是来慢慢留下自己。

最终目标：

**让人愿意留下来。**
