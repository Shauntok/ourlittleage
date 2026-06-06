# 小时代 PROJECT_CONTEXT.md

## 项目名称

小时代（Our Little Age）

正式域名：

https://www.ourlittleage.com

---

# 项目定位

小时代不是博客。

也不是论坛。

也不是社交媒体。

它是一个：

**居民长期居住的故事社区。**

核心关键词：

* 深夜
* 温柔
* 慢节奏
* 房间感
* 生活痕迹
* 长期陪伴

用户进入小时代后：

不是发动态离开。

而是像住进一个数字小镇。

---

# 当前开发阶段

## Alpha 0.4

状态：

🟢 已可使用

已完成：

* 登录注册
* 用户资料
* 居民房间
* 日记系统
* 文章系统
* 评论系统
* 深夜广场
* 在线居民
* 深夜广播
* 图片上传
* Banner系统
* Avatar系统
* Markdown支持

当前重点：

* Alpha Bug Sweep
* 权限测试
* 手机端测试
* 用户名系统测试
* 评论权限测试

暂停开发：

* 等级系统
* 收藏系统
* 举报系统
* 关注系统
* VIP系统
* 世界事件系统

先保证基础稳定。

---

# 技术栈

Frontend

* Next.js App Router
* TypeScript
* TailwindCSS

Backend

* Supabase

Auth

* Supabase Auth

Storage

* Supabase Storage

Markdown

* react-markdown

Chinese Conversion

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

## Admin

/admin

/admin/users

/admin/users/[id]

/admin/reports

/admin/logs

/admin/settings

/admin/broadcast

---

# Home 首页

文件：

app/home/page.tsx

功能：

* 深夜广播
* 在线居民
* 最新公开日记
* 最新公开文章
* 我的房间
* 房间设置
* 深夜氛围

依赖：

profiles

posts

comments

---

# 重要规则

最新日记：

跳转

/diary/[id]

最新文章：

跳转

/articles/[slug]

禁止使用：

/posts/

旧结构

---

# 用户系统

数据来源：

profiles

重要字段：

id

username

bio

avatar_url

banner_url

role

status

level

exp

trust_score

mood_emoji

status_message

status_expires_at

show_level

show_exp

show_trust_score

show_joined_days

created_at

last_seen_at

---

# 用户房间

文件：

app/u/[username]/page.tsx

定位：

公开居民主页

未来扩展：

* 收藏
* 关注
* 徽章
* 称号
* 共同好友
* 房间访客

---

# 日记系统

定位：

记录今天。

记录情绪。

记录深夜。

适合：

* 心情
* 碎片
* 生活
* 没说出口的话

---

规则

默认：

private

可切换：

public

---

路由

详情页：

/diary/[id]

使用：

ID

不要改成 slug

---

支持：

* Markdown
* 图片
* 评论

---

# 文章系统

定位：

认真表达。

完整故事。

长文内容。

作品创作。

---

路由

详情页：

/articles/[slug]

使用：

Slug

不要改成 ID

---

支持：

* Markdown
* 图片
* Tags
* Notes
* 评论

---

状态

draft

published

---

Visibility

public

private

hidden

unlisted

---

# 评论系统

组件：

PostComments.tsx

支持：

* 文章评论
* 日记评论

共用：

comments table

---

规则

用户只能删除自己的评论

不能删除别人评论

---

未来扩展：

* 回复
* 点赞
* 举报

---

# 广场系统

总入口：

/space

---

日记广场：

/space/diaries

特点：

轻

碎片

今天

情绪

---

文章广场：

/space/articles

特点：

故事

阅读

作品

长文

---

原则：

不要把日记和文章混成同一种流。

---

# Admin 系统

角色：

owner

admin

moderator

user

---

权限

moderator：

不能改身份

不能改角色

---

admin：

不能管理 owner

不能创建 owner

---

owner：

最高权限

不可被降级

不可被删除

---

# Supabase Tables

## profiles

用户资料

---

## posts

文章

日记

共用内容表

---

字段

id

type

title

slug

content

status

visibility

author_id

published_at

edited_at

edit_count

tags

notes

---

type

article

diary

---

## comments

评论

---

字段

id

post_id

author_id

content

created_at

updated_at

is_deleted

is_hidden

---

## notifications

通知

---

## admin_logs

后台日志

---

## badges

徽章定义

---

## user_badges

用户徽章

---

# Supabase Storage

avatars

用户头像

---

banners

房间背景

---

images

文章图片

日记图片

---

# UI 氛围组件

FloatingParticles

MouseGlow

PageTransition

PageRouterTransition

---

目标：

让整个社区像深夜里的小镇。

不是科技感。

不是赛博朋克。

不是论坛。

而是有温度的数字住所。

---

# 当前技术债

1.

username 唯一性尚未完全验证

---

2.

旧 route 残留检查

搜索：

/posts/

/write

---

3.

Navbar route 清理

---

4.

移动端全面测试尚未完成

---

# 开发原则

新增功能前先判断：

属于：

* 居民系统
* 广场系统
* 房间系统
* 管理系统
* 世界氛围系统

避免重复造轮子。

优先复用：

profiles

posts

comments

notifications

不要轻易新增重复 table。

---

# 长期目标

小时代最终会发展为：

一个让居民长期留下故事、房间和人生痕迹的数字社区。

重点不是流量。

重点不是短视频。

重点是：

“让人愿意留下来。”
