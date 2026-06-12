"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { addUserGrowth } from "@/lib/community-growth";
import { checkFirstArticleBadge } from "@/lib/badge-awards";
import {
  generateArticleSlug,
  checkArticleSlugExists,
} from "@/components/editor/articleSlugUtils";
import MarkdownPreview from "@/components/editor/MarkdownPreview";
import VisibilitySelector from "@/components/editor/VisibilitySelector";
import MarkdownToolbar from "@/components/editor/MarkdownToolbar";
import ArticleMetaFields from "@/components/editor/ArticleMetaFields";
import EditorPageHeader from "@/components/editor/EditorPageHeader";
import ArticleEditorActions from "@/components/editor/ArticleEditorActions";
import ArticleTitleFields from "@/components/editor/ArticleTitleFields";
import EditorTextarea from "@/components/editor/EditorTextarea";
import ArticleSideCards from "@/components/editor/ArticleSideCards";
import { uploadEditorImage } from "@/components/editor/editorImageUpload";
import { insertEditorText } from "@/components/editor/editorTextUtils";
import {
  validateArticleTitle,
  validateArticleContent,
} from "@/lib/editor/articleValidation";
import {
  isBlockedFromWriting,
  getWritingBlockMessage,
} from "@/lib/editor/writingGuard";

const DAILY_ARTICLE_LIMIT = 2;

function getTodayRange() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  return {
    todayStart,
    todayEnd,
  };
}

async function getTodayArticleCount(userId: string) {
  const { todayStart, todayEnd } = getTodayRange();

  const { data, error } = await supabase
    .from("posts")
    .select("id")
    .eq("author_id", userId)
    .eq("type", "article")
    .eq("status", "published")
    .gte("published_at", todayStart.toISOString())
    .lt("published_at", todayEnd.toISOString());

  if (error) throw error;

  return data?.length || 0;
}

export default function NewArticlePage() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<any>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [visibility, setVisibility] = useState("public");

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [remainingArticleCount, setRemainingArticleCount] =
    useState<number | null>(null);

  const cleanTitle = title.trim();
  const cleanContent = content.trim();

  const titleCount = cleanTitle.length;
  const contentCount = cleanContent.length;

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      setCurrentUser(user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", user.id)
        .maybeSingle();

      setCurrentProfile(profileData);

      if (isBlockedFromWriting(profileData?.status)) {
        router.push("/home");
        return;
      }

      try {
        const todayArticleCount = await getTodayArticleCount(user.id);

        setRemainingArticleCount(
          Math.max(DAILY_ARTICLE_LIMIT - todayArticleCount, 0)
        );
      } catch (error: any) {
        alert(error.message);
      }
    }

    getUser();
  }, [router]);

  function guardWriting(action: "publish" | "draft") {
    const message = getWritingBlockMessage(currentProfile?.status, action);

    if (message) {
      router.push("/home");
      return true;
    }

    return false;
  }

  function resetForm() {
    setTitle("");
    setSlug("");
    setContent("");
    setTags("");
    setNotes("");
    setVisibility("public");
  }

  function insertTextAtCursor(beforeText: string, afterText = "") {
    insertEditorText({
      textareaRef,
      beforeText,
      afterText,
      setContent,
    });
  }

  async function uploadImage(e: ChangeEvent<HTMLInputElement>) {
    if (guardWriting("publish")) return;

    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const publicUrl = await uploadEditorImage(file);
      insertTextAtCursor(`\n\n![](${publicUrl})\n\n`);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  }

  async function publishArticle() {
    if (guardWriting("publish")) return;
    if (!currentUser) return;

    if (!validateArticleTitle(title)) return;
    if (!validateArticleContent(content)) return;

    const finalSlug =
      generateArticleSlug(slug.trim()) || generateArticleSlug(cleanTitle);

    if (!finalSlug) {
      alert("slug 无法生成，请换一个标题或手动填写。");
      return;
    }

    const confirmed = confirm("确定发布这篇文章吗？");
    if (!confirmed) return;

    setLoading(true);

    try {
      const todayArticleCount = await getTodayArticleCount(currentUser.id);

      if (todayArticleCount >= DAILY_ARTICLE_LIMIT) {
        alert("今天已经发布了 2 篇文章。让故事沉淀一下，明天再继续吧。");
        setRemainingArticleCount(0);
        setLoading(false);
        return;
      }

      const exists = await checkArticleSlugExists(finalSlug);

      if (exists) {
        alert("这个 slug 已经存在，请修改。");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("posts").insert([
        {
          type: "article",
          title: cleanTitle,
          slug: finalSlug,
          content: cleanContent,
          status: "published",
          visibility,
          author_id: currentUser.id,
          tags,
          notes,
          published_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      await addUserGrowth({
        userId: currentUser.id,
        light: 0.08,
        reason: "publish_article",
      });

      await checkFirstArticleBadge(currentUser.id);

      setRemainingArticleCount(
        Math.max(DAILY_ARTICLE_LIMIT - (todayArticleCount + 1), 0)
      );

      alert("文章发布成功 🔥");
      router.push(`/articles/${finalSlug}`);
    } catch (error: any) {
      alert(error.message);
      setLoading(false);
    }
  }

  async function saveDraft() {
    if (guardWriting("draft")) return;
    if (!currentUser) return;

    if (!validateArticleTitle(title)) return;

    if (!cleanContent) {
      alert("请至少填写文章内容。");
      return;
    }

    setLoading(true);

    const finalSlug =
      generateArticleSlug(slug.trim()) ||
      generateArticleSlug(cleanTitle) ||
      `${Date.now()}`;

    const exists = await checkArticleSlugExists(finalSlug);

    if (exists) {
      alert("这个 slug 已经存在，请修改。");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("posts").insert([
      {
        type: "article",
        title: cleanTitle,
        slug: finalSlug,
        content: cleanContent,
        status: "draft",
        visibility,
        author_id: currentUser.id,
        tags,
        notes,
      },
    ]);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    resetForm();
    alert("草稿已保存 📝");
  }

  function discardArticle() {
    const hasContent = title || slug || content || tags || notes;

    if (hasContent) {
      const confirmed = confirm("确定放弃这篇文章吗？内容不会保存。");
      if (!confirmed) return;
    }

    resetForm();
    router.push("/articles");
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-5 pb-24 pt-14 text-white md:px-6 md:pt-36">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[minmax(680px,1.5fr)_minmax(420px,0.9fr)]">
        <section className="space-y-6">
          <EditorPageHeader
            eyebrow="NEW ARTICLE"
            title="写一篇故事"
            subtitle="文章适合长一点的想法、故事、作品和那些你想认真留下来的东西。"
          />

          <ArticleTitleFields
            title={title}
            setTitle={setTitle}
            slug={slug}
            setSlug={setSlug}
            titleCount={titleCount}
            generateSlug={generateArticleSlug}
          />

          <MarkdownToolbar
            uploading={uploading}
            uploadImage={uploadImage}
            insertTextAtCursor={insertTextAtCursor}
            variant="article"
          />

          <EditorTextarea
            textareaRef={textareaRef}
            content={content}
            setContent={setContent}
            placeholder="写下你的文章内容..."
            onSaveShortcut={saveDraft}
            insertTextAtCursor={insertTextAtCursor}
            variant="article"
          />

          <ArticleEditorActions
            contentCount={contentCount}
            loading={loading}
            publishArticle={publishArticle}
            saveDraft={saveDraft}
            discardArticle={discardArticle}
          />
        </section>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <VisibilitySelector
            visibility={visibility}
            setVisibility={setVisibility}
            options={[
              {
                key: "public",
                icon: "🌍",
                title: "公开发布",
                desc: "所有居民都可以看到。",
              },
              {
                key: "hidden",
                icon: "🙈",
                title: "隐藏文章",
                desc: "不会主动出现在公开列表。",
              },
              {
                key: "unlisted",
                icon: "🔗",
                title: "仅链接可见",
                desc: "有链接的人才能进入。",
              },
              {
                key: "private",
                icon: "🔒",
                title: "只给自己看",
                desc: "只有你自己能看到。",
              },
            ]}
          />

          <ArticleSideCards remainingCount={remainingArticleCount} />

          <ArticleMetaFields
            tags={tags}
            setTags={setTags}
            notes={notes}
            setNotes={setNotes}
          />

          <div className="hidden lg:block">
            <MarkdownPreview
              content={content}
              emptyTitle="这里会显示文章预览。"
              emptyText="写下一个会被未来某个人读见的故事。"
            />
          </div>
        </aside>
      </div>
    </main>
  );
}