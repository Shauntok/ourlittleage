# AGENTS.md

## 小时代开发规则

在修改任何代码前，必须阅读：

* PROJECT_CONTEXT.md
* HANDOFF.md

---

# 项目原则

小时代（Our Little Age）

不是博客。

不是论坛。

不是社交媒体。

它是：

居民长期居住的故事社区。

修改代码时必须保持：

* 深夜感
* 温柔感
* 房间感
* 慢节奏

不要引入：

* 赛博朋克风
* 科技仪表盘风
* Reddit风
* Discord风
* Facebook风

---

# 路由规则

## Diary

必须使用：

/diary/[id]

原因：

日记按数据库 ID 访问。

禁止改成：

/diary/[slug]

---

## Articles

必须使用：

/articles/[slug]

原因：

文章已经采用 slug 系统。

禁止改成：

/articles/[id]

除非项目负责人明确要求。

---

## Space

广场：

/space

日记广场：

/space/diaries

文章广场：

/space/articles

不要混合内容流。

---

# 数据库规则

主要内容表：

posts

不要创建：

articles
diaries
article_posts
diary_posts

文章与日记共用：

posts

通过：

type

区分：

* article
* diary

---

# 用户资料规则

唯一资料表：

profiles

不要创建：

user_profiles
member_profiles
resident_profiles

统一使用：

profiles

---

# 评论规则

统一组件：

PostComments.tsx

统一表：

comments

不要创建：

article_comments
diary_comments

---

# Storage规则

avatars

用户头像

banners

房间背景

images

文章与日记图片

不要新增重复 Bucket。

---

# UI规则

整体风格：

黑色
极简
深夜
柔和

避免：

过亮
高饱和
彩虹色
科技仪表盘

---

# 开发原则

新增功能前：

先检查是否已有系统。

优先复用：

* profiles
* posts
* comments
* notifications

不要轻易新增：

* table
* bucket
* route
* component

---

# 修改原则

优先：

修复

重构

复用

最后才是：

新增

---

# 如果发现旧代码

例如：

/posts/
/write

不要立即删除。

先确认是否仍被引用。

确认无引用后再清理。

---

# 当前开发阶段

Alpha 0.4

当前任务：

1. Bug Sweep
2. 权限测试
3. 手机端测试
4. 用户名系统测试
5. 评论系统测试

暂停开发：

* 等级系统
* VIP系统
* 收藏系统
* 关注系统
* 举报系统
* 世界事件系统

除非项目负责人明确要求恢复开发。

---

# 最高规则

不要擅自改变：

* 数据结构
* 路由结构
* 用户体系
* 世界观

如果需要改变：

先提出方案。

不要直接修改。
