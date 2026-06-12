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
import { uploadEditorImage } from "@/components/editor/editorImageUpload";
import { insertEditorText } from "@/components/editor/editorTextUtils";

export default function EditArticlePage() {
  const params = useParams();
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const id = String(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [article, setArticle] = useState<any>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [originalSnapshot, setOriginalSnapshot] = useState("");

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
        .single();

      if (error || !data) {
        router.push("/articles");
        return;
      }

      setArticle(data);
      setTitle(data.title || "");
      setSlug(data.slug || "");
      setContent(data.content || "");
      setTags(data.tags || "");
      setNotes(data.notes || "");
      setVisibility(data.visibility || "public");

      setOriginalSnapshot(
        JSON.stringify({
          title: data.title || "",
          slug: data.slug || "",
          content: data.content || "",
          tags: data.tags || "",
          notes: data.notes || "",
          visibility: data.visibility || "public",
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
    if (!cleanTitle) {
      alert("请输入文章标题。");
      return false;
    }

    if (titleCount > 25) {
      alert(`文章标题不能超过 25 个字。目前是 ${titleCount} 个字。`);
      return false;
    }

    return true;
  }

  function validateContent() {
    if (!cleanContent) {
      alert("请输入文章内容。");
      return false;
    }

    if (contentCount < 500) {
      alert(`文章正文至少需要 500 字。目前只有 ${contentCount} 字。`);
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
      alert(error.message);
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

    if (!cleanContent) {
      alert("请至少填写一点文章内容。");
      return;
    }

    const finalSlug =
      generateSlug(slug.trim()) || generateSlug(cleanTitle) || `article-${id}`;

    setSaving(true);

    const exists = await checkSlug(finalSlug);

    if (exists) {
      alert("这个 slug 已经存在，请修改。");
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
      alert(error.message);
      return;
    }

    router.push("/drafts");
  }

  async function publishDraft() {
    if (!validateTitle()) return;
    if (!validateContent()) return;

    const finalSlug = generateSlug(slug.trim()) || generateSlug(cleanTitle);

    if (!finalSlug) {
      alert("slug 无法生成，请换一个标题或手动填写。");
      return;
    }

    const confirmed = confirm("确定发布这篇草稿吗？");
    if (!confirmed) return;

    setSaving(true);

    const exists = await checkSlug(finalSlug);

    if (exists) {
      alert("这个 slug 已经存在，请修改。");
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
      alert(error.message);
      return;
    }

    router.push(`/articles/${finalSlug}`);
  }

  async function saveArticle() {
    if (!validateTitle()) return;
    if (!validateContent()) return;

    const finalSlug = generateSlug(slug.trim()) || generateSlug(cleanTitle);

    if (!finalSlug) {
      alert("slug 无法生成，请换一个标题或手动填写。");
      return;
    }

    if (!hasChanged) {
      router.push(`/articles/${article.slug}`);
      return;
    }

    setSaving(true);

    const exists = await checkSlug(finalSlug);

    if (exists) {
      alert("这个 slug 已经存在，请修改。");
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
      alert(error.message);
      return;
    }

    router.push(`/articles/${finalSlug}`);
  }

  async function deleteArticle() {
    const confirmed = confirm("确定删除这篇文章吗？");
    if (!confirmed) return;

    const { error } = await supabase.from("posts").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    router.push(isDraft ? "/drafts" : "/articles");
  }

  function leaveWithoutSaving() {
    if (hasChanged) {
      const confirmed = confirm("你还有没保存的修改，确定离开吗？");
      if (!confirmed) return;
    }

    router.push(isDraft ? "/drafts" : `/articles/${article.slug}`);
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

          <div>
            <p className="text-xs tracking-[0.4em] text-white/25">
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

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2 text-xs">
              <p
                className={
                  contentCount < 500
                    ? "text-yellow-100/55"
                    : "text-emerald-100/55"
                }
              >
                已写 {contentCount} 字
                {contentCount < 500
                  ? ` · 距离发布建议还差 ${500 - contentCount} 字`
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
                    onClick={publishDraft}
                    disabled={saving}
                    className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-40"
                  >
                    发布文章
                  </button>
                </>
              ) : (
                <button
                  onClick={saveArticle}
                  disabled={saving}
                  className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-40"
                >
                  {saving ? "保存中..." : hasChanged ? "保存修改" : "回到文章"}
                </button>
              )}

              <button
                onClick={deleteArticle}
                className="rounded-full border border-red-500/20 bg-red-500/[0.06] px-6 py-3 text-sm text-red-200/80 transition hover:bg-red-500/[0.12]"
              >
                删除
              </button>
            </div>
          </div>
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