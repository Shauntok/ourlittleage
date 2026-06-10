# 小时代 PROJECT_CONTEXT v2.0

更新时间：
2026-06-11

项目状态：
Alpha 0.6

正式域名：

https://www.ourlittleage.com

---

# 项目定位

小时代（Our Little Age）

不是博客。

不是论坛。

不是社交媒体。

而是：

居民长期居住的故事社区。

核心关键词：

* 深夜
* 温柔
* 慢节奏
* 房间感
* 生活痕迹
* 长期陪伴

用户不是来刷内容。

而是来住下。

最终目标：

让人愿意留下来。

---

# 当前开发阶段

Alpha 0.6

状态：

🟢 功能主体完成

🟢 社区闭环完成

🟡 上线前打磨阶段

Alpha 截止时间：

2026-06-15
12:00 PM

---

# 当前完成度

整体进度：

85% ~ 90%

当前阶段：

不再是做功能。

而是：

* 打磨
* 测试
* 修Bug
* 手机适配
* 权限验证
* 上线准备

---

# 核心世界观

小时代是一个数字小镇。

居民拥有自己的房间。

可以留下：

* 日记
* 故事
* 作品
* 回忆
* 心情

居民之间通过：

* 评论
* 喜欢
* 举报
* 成长
* 徽章

建立联系。

---

# Home 首页 V2

路径：

/home

定位：

居民控制台

已完成：

* 深夜广播
* 世界公告
* 在线居民
* 最新日记
* 最新文章
* 写日记入口
* 写文章入口
* 小时代信箱
* 我的房间入口
* RoomStatusButton
* Atmosphere 系统

组件：

* FloatingParticles
* MouseGlow
* RoomStatusButton

---

# 广场系统 V2

路径：

/space

定位：

整个世界的公共入口

---

包含：

## 最新日记

来源：

/space/diaries

---

## 热门日记

根据：

likes × 3
+
comments × 2

计算

---

## 最新文章

来源：

/space/articles

---

## 热门文章

根据：

likes × 3
+
comments × 2

计算

---

移动端：

Feed 切换模式

桌面端：

四大区域同时展示

---

# 日记广场 V2

路径：

/space/diaries

特点：

* 今天
* 情绪
* 碎片
* 深夜

设计：

* 作者信息左侧
* 类型标签右侧
* 喜欢数量
* 评论数量
* 深夜氛围卡片

---

# 文章广场 V2

路径：

/space/articles

特点：

* 长文
* 故事
* 阅读
* 作品

设计：

* 作者信息左侧
* 类型标签右侧
* 喜欢数量
* 评论数量
* Tags展示

---

# 居民房间 V2

路径：

/u/[username]

定位：

居民公开主页

已完成：

* Banner
* Avatar
* 房间主题
* 房间状态
* 等级
* 留下的光
* 社区信任
* 徽章展示
* 公开文章
* 公开日记

---

支持主题：

* default
* ocean
* forest
* sunset
* mist

---

公开内容筛选：

* 全部
* 日记
* 文章

---

成长展示：

* Lv
* 留下的光
* 社区信任
* 等级进度条

---

# 成长系统 V1

核心文件：

lib/community-growth.ts

已完成：

* addUserGrowth()
* calculateLevel()
* 自动升级
* 自动通知
* growth_logs

---

成长字段

profiles.exp

前台名称：

留下的光

---

profiles.trust_score

前台名称：

社区信任

---

profiles.level

等级

规则：

Lv1 ~ Lv5

---

当前成长奖励

发布文章：

+0.08 光

发布日记：

+0.03 光

发表评论：

+0.01 光

评论被喜欢：

+0.003 光

举报成功：

+0.05 信任

恶意举报：

-0.05 信任

---

# 徽章系统 V1

核心文件：

lib/badge-awards.ts

自动徽章：

* 初次发声
* 深夜记录者
* 温柔来信

支持：

* 自动发放
* 后台发放
* 房间展示
* 通知提醒

---

# 评论系统

组件：

PostComments.tsx

支持：

* 评论
* 删除自己评论
* 举报评论
* 评论喜欢
* 评论成长奖励

评论喜欢规则：

同一居民只能保留一个喜欢记录

---

# 举报系统

路径：

/admin/reports

支持：

* 举报文章
* 举报日记
* 举报评论
* 举报用户

管理操作：

* 隐藏内容
* 警告用户
* 禁言用户
* 封禁用户
* 驳回举报
* 标记恶意举报

成长闭环：

已解决：

+0.05 信任

恶意举报：

-0.05 信任

---

# 通知系统

路径：

/notifications

支持：

* 未读
* 已读
* 星标
* 重要
* 垃圾桶
* 恢复
* 软删除

Navbar 红点同步：

notifications-updated

---

# 后台系统

角色：

owner
admin
moderator
user

---

已完成模块：

* Dashboard
* 用户管理
* 居民详情
* 举报管理
* 公告管理
* 徽章管理
* 全站信件
* 操作日志
* 反馈管理

---

# UI 系统

当前统一组件：

* FloatingParticles
* MouseGlow
* RoomStatusButton
* PageTransition
* PageRouterTransition
* TranslatedText

---

# 页面动画系统

新增：

PageRouterTransition

作用：

* 页面局部淡入
* 页面局部淡出
* 避免切页闪白
* 避免整页重建感

状态：

已接入核心页面

---

# Supabase Tables

核心：

* profiles
* posts
* comments
* comment_likes
* post_likes
* reports
* notifications
* growth_logs
* badges
* user_badges
* admin_logs

---

# Storage Buckets

avatars

banners

images

---

# 上线前 P0

必须完成：

* username 唯一性验证
* Route残留检查
* Navbar检查
* 权限测试
* 手机端测试
* 测试数据清理

---

# 当前技术债

1. username 验证强化

检查：

* unique
* not null
* 大小写
* 特殊字符
* 中文用户名

---

2. 手机端全面测试

重点：

* /home
* /space
* /space/articles
* /space/diaries
* /u/[username]
* /notifications
* /admin

---

3. PageRouterTransition 全站统一

状态：

进行中

---

# Alpha 0.7 候选功能

上线后再做：

* 收藏系统
* 关注系统
* 用户称号系统
* 房间访客
* 世界事件系统
* 官方活动系统

---

# 长期目标

小时代最终会发展成：

一个让居民长期留下故事、房间和人生痕迹的数字社区。

用户不是来消费内容。

而是来住下。

最终目标：

让人愿意留下来。
