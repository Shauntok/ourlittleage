"use client";

import {
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

import {
  useParams,
  useRouter,
} from "next/navigation";

import TranslatedMarkdown from "@/components/TranslatedMarkdown";

export default function EditArticlePage() {
  const params = useParams();
  const router = useRouter();

  const id = String(params.id);

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [article, setArticle] =
    useState<any>(null);

  const [title, setTitle] =
    useState("");

  const [slug, setSlug] =
    useState("");

  const [content, setContent] =
    useState("");

  const [tags, setTags] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [visibility, setVisibility] =
    useState("public");

  const [originalSnapshot, setOriginalSnapshot] =
    useState("");

  useEffect(() => {
    async function fetchArticle() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/";
        return;
      }

      const { data, error } =
        await supabase
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
      setVisibility(
        data.visibility || "public"
      );

      const snapshot = JSON.stringify({
        title: data.title || "",
        slug: data.slug || "",
        content: data.content || "",
        tags: data.tags || "",
        notes: data.notes || "",
        visibility:
          data.visibility || "public",
      });

      setOriginalSnapshot(snapshot);

      setLoading(false);
    }

    fetchArticle();
  }, [id, router]);

  function makeSnapshot() {
    return JSON.stringify({
      title,
      slug,
      content,
      tags,
      notes,
      visibility,
    });
  }

  const hasChanged =
    makeSnapshot() !== originalSnapshot;

  function insertTextAtCursor(
    beforeText: string,
    afterText = ""
  ) {
    const textarea = textareaRef.current;

    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const selectedText =
      textarea.value.slice(start, end);

    const insertText =
      beforeText +
      selectedText +
      afterText;

    textarea.setRangeText(
      insertText,
      start,
      end,
      "end"
    );

    setContent(textarea.value);

    const newPosition =
      start + insertText.length;

    textarea.focus();

    textarea.setSelectionRange(
      newPosition,
      newPosition
    );
  }

  async function uploadImage(
    e: ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    setUploading(true);

    const cleanName =
      file.name.replace(/\s+/g, "-");

    const fileName =
      `${Date.now()}-${cleanName}`;

    const { error } =
      await supabase.storage
        .from("images")
        .upload(fileName, file);

    setUploading(false);

    if (error) {
      alert(error.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("images")
      .getPublicUrl(fileName);

    insertTextAtCursor(
      `\n\n![](${publicUrl})\n\n`
    );
  }

  async function saveArticle() {
    if (
      !title.trim() ||
      !slug.trim() ||
      !content.trim()
    ) {
      alert("标题、slug 和内容不能为空。");
      return;
    }

    if (!hasChanged) {
      window.location.href =
        `/articles/${id}`;
      return;
    }

    setSaving(true);

    const { error } =
      await supabase
        .from("posts")
        .update({
          title,
          slug,
          content,
          tags,
          notes,
          visibility,
          edited_at:
            new Date().toISOString(),
        })
        .eq("id", id);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href =
      `/articles/${id}`;
  }

  async function deleteArticle() {
    const confirmed = confirm(
      "确定删除这篇文章吗？"
    );

    if (!confirmed) return;

    const { error } =
      await supabase
        .from("posts")
        .delete()
        .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href =
      "/articles";
  }

  function leaveWithoutSaving() {
    if (hasChanged) {
      const confirmed = confirm(
        "你还有没保存的修改，确定离开吗？"
      );

      if (!confirmed) return;
    }

    window.location.href =
      `/articles/${id}`;
  }

  const toolbarButtonClass =
    "rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm hover:border-white/30 transition";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        正在打开文章...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[minmax(680px,1.5fr)_minmax(420px,0.9fr)]">

        <section className="space-y-6">

          <button
            onClick={leaveWithoutSaving}
            className="text-sm text-white/35 transition hover:text-white/70"
          >
            ← 回到文章
          </button>

          <div>
            <p className="text-xs tracking-[0.4em] text-white/25">
              EDIT ARTICLE
            </p>

            <h1 className="mt-5 text-5xl font-light">
              修改文章
            </h1>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            placeholder="文章标题"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 outline-none transition focus:border-white/40"
          />

          <input
            type="text"
            value={slug}
            onChange={(e) =>
              setSlug(e.target.value)
            }
            placeholder="slug"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 outline-none transition focus:border-white/40"
          />

          <div>
            <label className="inline-flex cursor-pointer items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-white/70 transition hover:border-white/25 hover:text-white">
              <span>
                {uploading
                  ? "上传中..."
                  : "📸 上传图片"}
              </span>

              <input
                type="file"
                accept="image/*"
                onChange={uploadImage}
                className="hidden"
              />
            </label>
          </div>

          <div className="sticky top-4 z-20 flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-black/80 p-4 backdrop-blur-xl">

            <button
              type="button"
              onClick={() =>
                insertTextAtCursor(
                  "\n# 标题\n"
                )
              }
              className={toolbarButtonClass}
            >
              H1
            </button>

            <button
              type="button"
              onClick={() =>
                insertTextAtCursor(
                  "\n## 小标题\n"
                )
              }
              className={toolbarButtonClass}
            >
              H2
            </button>

            <button
              type="button"
              onClick={() =>
                insertTextAtCursor(
                  "**",
                  "**"
                )
              }
              className={toolbarButtonClass}
            >
              粗体
            </button>

          </div>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) =>
              setContent(e.target.value)
            }
            onKeyDown={(e) => {
              if (
                e.ctrlKey &&
                e.key.toLowerCase() === "s"
              ) {
                e.preventDefault();
                saveArticle();
              }
            }}
            rows={24}
            className="w-full min-h-[560px] rounded-2xl border border-white/10 bg-white/[0.04] p-5 leading-8 outline-none transition focus:border-white/40"
          />

          <div className="flex flex-wrap gap-4">

            <button
              onClick={saveArticle}
              disabled={saving}
              className="rounded-full bg-white px-8 py-4 text-sm font-bold text-black transition hover:bg-white/90 disabled:opacity-40"
            >
              {saving
                ? "保存中..."
                : hasChanged
                ? "保存修改"
                : "回到文章"}
            </button>

            <button
              onClick={leaveWithoutSaving}
              className="rounded-full border border-white/10 bg-white/[0.04] px-8 py-4 text-sm text-white/70 transition hover:border-white/25 hover:text-white"
            >
              先这样
            </button>

            <button
              onClick={deleteArticle}
              className="rounded-full border border-red-500/20 bg-red-500/[0.06] px-8 py-4 text-sm text-red-200/80 transition hover:bg-red-500/[0.12]"
            >
              删除
            </button>

          </div>
        </section>

        <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start lg:pt-24">

          <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-2xl">

            <p className="text-xs tracking-[0.3em] text-white/30">
              可见性
            </p>

            <div className="mt-4 grid gap-2.5">

              {[
                {
                  key: "public",
                  label: "🌍 公开发布",
                },
                {
                  key: "hidden",
                  label: "🙈 隐藏文章",
                },
                {
                  key: "unlisted",
                  label: "🔗 链接可见",
                },
                {
                  key: "private",
                  label: "🔒 只给自己看",
                },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    setVisibility(item.key)
                  }
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    visibility === item.key
                      ? "border-white/25 bg-white/[0.09] text-white"
                      : "border-white/10 bg-white/[0.035] text-white/45"
                  }`}
                >
                  {item.label}
                </button>
              ))}

            </div>

          </div>

          <input
            type="text"
            value={tags}
            onChange={(e) =>
              setTags(e.target.value)
            }
            placeholder="标签"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 outline-none transition focus:border-white/40"
          />

          <textarea
            value={notes}
            onChange={(e) =>
              setNotes(e.target.value)
            }
            rows={6}
            placeholder="私密笔记"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 leading-7 outline-none transition focus:border-white/40"
          />

          <div className="h-[520px] overflow-y-auto rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">

            <p className="mb-5 text-sm text-white/35">
              Markdown 预览
            </p>

            <article className="prose prose-invert max-w-none prose-p:leading-[2.2]">
              <TranslatedMarkdown
                content={content}
              />
            </article>

          </div>

        </aside>
      </div>
    </main>
  );
}