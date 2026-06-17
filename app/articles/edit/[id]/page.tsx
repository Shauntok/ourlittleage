"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { pinyin } from "pinyin-pro";
import { supabase } from "@/lib/supabase";
import MarkdownPreview from "@/components/editor/MarkdownPreview";
import VisibilitySelector from "@/components/editor/VisibilitySelector";
import MarkdownToolbar from "@/components/editor/MarkdownToolbar";
import ArticleMetaFields from "@/components/editor/ArticleMetaFields";
import ArticleTitleFields from "@/components/editor/ArticleTitleFields";
import EditorTextarea from "@/components/editor/EditorTextarea";
import MobileVisibilityDialog from "@/components/editor/MobileVisibilityDialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { uploadEditorImage } from "@/components/editor/editorImageUpload";
import { insertEditorText } from "@/components/editor/editorTextUtils";

type ArticleVisibility = "public" | "hidden" | "unlisted" | "private";

const MIN_ARTICLE_CONTENT_LENGTH = 500;

const visibilityOptions = [
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
];

export default function EditArticlePage() {
  const params = useParams();
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const id = String(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [article, setArticle] = useState<any>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [visibility, setVisibility] = useState<ArticleVisibility>("public");

  const [originalSnapshot, setOriginalSnapshot] = useState("");
  const [editorMessage, setEditorMessage] = useState("");
  const [showVisibilityDialog, setShowVisibilityDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "saveArticle" | "publishDraft" | null
  >(null);

  const cleanTitle = title.trim();
  const cleanContent = content.trim();
  const titleCount = cleanTitle.length;
  const contentCount = cleanContent.length;
  const isDraft = article?.status === "draft";

  useEffect(() => {
    async function fetchArticle() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .eq("author_id", user.id)
        .eq("type", "article")
        .is("deleted_at", null)
        .single();

      if (error || !data) {
        router.push("/articles");
        return;
      }

      const loadedVisibility = (data.visibility || "public") as ArticleVisibility;

      setArticle(data);
      setTitle(data.title || "");
      setSlug(data.slug || "");
      setContent(data.content || "");
      setTags(data.tags || "");
      setNotes(data.notes || "");
      setVisibility(loadedVisibility);

      setOriginalSnapshot(
        JSON.stringify({
          title: data.title || "",
          slug: data.slug || "",
          content: data.content || "",
          tags: data.tags || "",
          notes: data.notes || "",
          visibility: loadedVisibility,
          status: data.status || "draft",
        })
      );

      setLoading(false);
    }

    fetchArticle();
  }, [id, router]);

  function generateSlug(value: string) {
    return pinyin(value, {
      toneType: "none",
      nonZh: "consecutive",
    })
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function makeSnapshot(nextStatus = article?.status || "draft") {
    return JSON.stringify({
      title,
      slug,
      content,
      tags,
      notes,
      visibility,
      status: nextStatus,
    });
  }

  const hasChanged = makeSnapshot() !== originalSnapshot;

  function validateTitle() {
    setEditorMessage("");

    if (!cleanTitle) {
      setEditorMessage("给这篇故事起个名字吧，之后才找得到它。");
      return false;
    }

    if (titleCount > 25) {
      setEditorMessage(`标题有点长了，目前是 ${titleCount} 个字，最多 25 个字。`);
      return false;
    }

    return true;
  }

  function validateContentForPublish() {
    setEditorMessage("");

    if (!cleanContent) {
      setEditorMessage("写一点点就好，不需要一次说完。");
      return false;
    }

    if (contentCount < MIN_ARTICLE_CONTENT_LENGTH) {
      setEditorMessage(
        `这篇故事还可以再慢慢展开一点，至少留下 ${MIN_ARTICLE_CONTENT_LENGTH} 个字吧。`
      );
      return false;
    }

    return true;
  }

  function validateContentForDraft() {
    setEditorMessage("");

    if (!cleanContent) {
      setEditorMessage("写一点点就好，我帮你先收进草稿箱。");
      return false;
    }

    return true;
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
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const publicUrl = await uploadEditorImage(file);
      insertTextAtCursor(`\n\n![](${publicUrl})\n\n`);
    } catch (error: any) {
      setEditorMessage(error.message);
    } finally {
      setUploading(false);
    }
  }

  async function checkSlug(finalSlug: string) {
    const { data } = await supabase
      .from("posts")
      .select("id")
      .eq("slug", finalSlug)
      .neq("id", id)
      .maybeSingle();

    return !!data;
  }

  async function saveDraft() {
    if (!validateTitle()) return;
    if (!validateContentForDraft()) return;

    const finalSlug =
      generateSlug(slug.trim()) || generateSlug(cleanTitle) || `article-${id}`;

    setSaving(true);

    const exists = await checkSlug(finalSlug);

    if (exists) {
      setEditorMessage("这个链接已经有人用过了，换一个 slug 吧。");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("posts")
      .update({
        title: cleanTitle,
        slug: finalSlug,
        content: cleanContent,
        tags,
        notes,
        visibility,
        status: "draft",
        edited_at: new Date().toISOString(),
      })
      .eq("id", id);

    setSaving(false);

    if (error) {
      setEditorMessage(error.message);
      return;
    }

    router.push("/drafts");
  }

  async function publishDraft() {
    if (!validateTitle()) return;
    if (!validateContentForPublish()) return;

    const finalSlug = generateSlug(slug.trim()) || generateSlug(cleanTitle);

    if (!finalSlug) {
      setEditorMessage("这个标题暂时生成不了链接，换个标题或手动填一下 slug 吧。");
      return;
    }

    setSaving(true);

    const exists = await checkSlug(finalSlug);

    if (exists) {
      setEditorMessage("这个链接已经有人用过了，换一个 slug 吧。");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("posts")
      .update({
        title: cleanTitle,
        slug: finalSlug,
        content: cleanContent,
        tags,
        notes,
        visibility,
        status: "published",
        published_at: new Date().toISOString(),
        edited_at: new Date().toISOString(),
      })
      .eq("id", id);

    setSaving(false);

    if (error) {
      setEditorMessage(error.message);
      return;
    }

    router.push(`/articles/${finalSlug}`);
  }

  async function saveArticle() {
    if (!validateTitle()) return;
    if (!validateContentForPublish()) return;

    const finalSlug = generateSlug(slug.trim()) || generateSlug(cleanTitle);

    if (!finalSlug) {
      setEditorMessage("这个标题暂时生成不了链接，换个标题或手动填一下 slug 吧。");
      return;
    }

    if (!hasChanged) {
      router.push(`/articles/${article.slug}`);
      return;
    }

    setSaving(true);

    const exists = await checkSlug(finalSlug);

    if (exists) {
      setEditorMessage("这个链接已经有人用过了，换一个 slug 吧。");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("posts")
      .update({
        title: cleanTitle,
        slug: finalSlug,
        content: cleanContent,
        tags,
        notes,
        visibility,
        edited_at: new Date().toISOString(),
      })
      .eq("id", id);

    setSaving(false);

    if (error) {
      setEditorMessage(error.message);
      return;
    }

    router.push(`/articles/${finalSlug}`);
  }

  async function deleteArticle() {
    setDeleting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("posts")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id || null,
        delete_reason: "author_soft_delete",
        edited_at: new Date().toISOString(),
      })
      .eq("id", id);

    setDeleting(false);

    if (error) {
      setEditorMessage(error.message);
      setShowDeleteDialog(false);
      return;
    }

    setShowDeleteDialog(false);
    router.push(isDraft ? "/drafts" : "/articles");
  }

  function leaveWithoutSaving() {
    if (hasChanged) {
      setEditorMessage("这一页还有没保存的修改。想离开的话，请先保存。");
      return;
    }

    router.push(isDraft ? "/drafts" : `/articles/${article.slug}`);
  }

  function handleSaveArticleClick() {
    if (window.innerWidth < 1024) {
      setPendingAction("saveArticle");
      setShowVisibilityDialog(true);
      return;
    }

    saveArticle();
  }

  function handlePublishDraftClick() {
    if (window.innerWidth < 1024) {
      setPendingAction("publishDraft");
      setShowVisibilityDialog(true);
      return;
    }

    publishDraft();
  }

  function confirmVisibilityAction() {
    setShowVisibilityDialog(false);

    if (pendingAction === "saveArticle") {
      saveArticle();
      return;
    }

    if (pendingAction === "publishDraft") {
      publishDraft();
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm tracking-[0.3em] text-white/35">
          正在打开文章...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-5 pb-24 pt-16 text-white md:px-6 md:py-24">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />
      <div className="pointer-events-none fixed left-1/2 top-1/3 -z-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl md:h-[560px] md:w-[560px]" />

      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]">
        <section className="space-y-6">
          <button
            onClick={leaveWithoutSaving}
            className="text-sm text-white/35 transition hover:text-white/70"
          >
            ← {isDraft ? "回到草稿箱" : "回到文章"}
          </button>

          <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-2xl md:p-8">
            <button
              type="button"
              onClick={() => setShowPromptDialog(true)}
              className="absolute right-5 top-5 inline-flex animate-pulse items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100 shadow-[0_0_26px_rgba(34,211,238,0.18)] transition hover:bg-cyan-400/15 lg:hidden"
            >
              ✨ 提示
            </button>

            <p className="pr-24 text-xs tracking-[0.4em] text-white/25 lg:pr-0">
              {isDraft ? "EDIT DRAFT" : "EDIT ARTICLE"}
            </p>

            <h1 className="mt-3 text-4xl font-light md:mt-5 md:text-5xl">
              {isDraft ? "继续写草稿" : "修改文章"}
            </h1>

            <p className="mt-3 text-sm leading-7 text-white/40 md:mt-4">
              {isDraft
                ? "这篇文章还没有发布。你可以先保存草稿，也可以准备好后发布。"
                : "慢慢整理这篇故事。修改会在保存后才真正生效。"}
            </p>
          </div>

          <ArticleTitleFields
            title={title}
            setTitle={setTitle}
            slug={slug}
            setSlug={setSlug}
            titleCount={titleCount}
            generateSlug={generateSlug}
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
            onSaveShortcut={isDraft ? saveDraft : saveArticle}
            insertTextAtCursor={insertTextAtCursor}
            variant="article"
          />

          <div className="lg:hidden">
            <ArticleMetaFields
              tags={tags}
              setTags={setTags}
              notes={notes}
              setNotes={setNotes}
            />
          </div>

          {editorMessage && (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {editorMessage}
            </div>
          )}

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2 text-xs">
              <p
                className={
                  contentCount < MIN_ARTICLE_CONTENT_LENGTH
                    ? "text-yellow-100/55"
                    : "text-emerald-100/55"
                }
              >
                已写 {contentCount} 字
                {contentCount < MIN_ARTICLE_CONTENT_LENGTH
                  ? ` · 距离发布建议还差 ${
                      MIN_ARTICLE_CONTENT_LENGTH - contentCount
                    } 字`
                  : " · 已达到发布长度"}
              </p>

              <p className="text-white/25">
                {isDraft ? "Ctrl + S 保存草稿。" : "Ctrl + S 保存修改。"}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:flex md:flex-wrap md:justify-end">
              <button
                onClick={leaveWithoutSaving}
                className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm text-white/70 transition hover:border-white/25 hover:text-white"
              >
                先这样
              </button>

              {isDraft ? (
                <>
                  <button
                    onClick={saveDraft}
                    disabled={saving}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm text-white/70 transition hover:border-white/25 hover:text-white disabled:opacity-40"
                  >
                    {saving ? "保存中..." : "保存草稿"}
                  </button>

                  <button
                    onClick={handlePublishDraftClick}
                    disabled={saving}
                    className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-40"
                  >
                    发布文章
                  </button>
                </>
              ) : (
                <button
                  onClick={handleSaveArticleClick}
                  disabled={saving}
                  className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-40"
                >
                  {saving ? "保存中..." : hasChanged ? "保存修改" : "回到文章"}
                </button>
              )}

              <button
                onClick={() => setShowDeleteDialog(true)}
                className="rounded-full border border-red-500/20 bg-red-500/[0.06] px-6 py-3 text-sm text-red-200/80 transition hover:bg-red-500/[0.12]"
              >
                移入回收站
              </button>
            </div>
          </div>
        </section>

        <aside className="hidden space-y-6 lg:sticky lg:top-24 lg:block lg:self-start">
          <div>
            <VisibilitySelector
              visibility={visibility}
              setVisibility={(value) => setVisibility(value as ArticleVisibility)}
              options={visibilityOptions}
            />
          </div>

          <ArticleMetaFields
            tags={tags}
            setTags={setTags}
            notes={notes}
            setNotes={setNotes}
          />

          <MarkdownPreview
            content={content}
            emptyTitle="这里会显示文章预览。"
            emptyText="写下一个会被未来某个人读见的故事。"
          />
        </aside>
      </div>

      {showPromptDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-5 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-xl"
            onClick={() => setShowPromptDialog(false)}
            aria-label="关闭写作提示"
          />

          <section className="relative z-10 w-full max-w-sm rounded-[2rem] border border-white/10 bg-zinc-950/95 p-6 text-white shadow-[0_0_80px_rgba(255,255,255,0.08)]">
            <p className="text-xs tracking-[0.35em] text-white/25">
              EDITING HINTS
            </p>

            <h2 className="mt-4 text-2xl font-light">整理提示</h2>

            <ul className="mt-5 space-y-4 text-sm leading-7 text-white/55">
              <li>• 不急着一次修完</li>
              <li>• 先保留真实，再慢慢整理</li>
              <li>• 删除一段，也是在替故事呼吸</li>
              <li>• 让这篇文章变成更接近你的样子</li>
            </ul>

            <button
              type="button"
              onClick={() => setShowPromptDialog(false)}
              className="mt-7 w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              知道了
            </button>
          </section>
        </div>
      )}

      <MobileVisibilityDialog
        open={showVisibilityDialog}
        visibility={visibility}
        setVisibility={(value) => setVisibility(value as ArticleVisibility)}
        options={visibilityOptions}
        title={isDraft ? "这篇草稿要发布到哪里？" : "这篇文章要保存成什么可见性？"}
        subtitle="选择可见性后，我就帮你把修改收好。"
        confirmText={isDraft ? "确定，发布文章" : "确定，保存修改"}
        cancelText="再看看"
        onClose={() => {
          setShowVisibilityDialog(false);
          setPendingAction(null);
        }}
        onConfirm={confirmVisibilityAction}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        title="移入回收站？"
        description="这篇文章不会立刻永久删除，会先进入回收站。之后仍然可以恢复。"
        confirmText="移入回收站"
        cancelText="再想想"
        danger
        loading={deleting}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={deleteArticle}
      />
    </main>
  );
}