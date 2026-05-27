"use client";

import {
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { pinyin } from "pinyin-pro";
import TranslatedMarkdown from "@/components/TranslatedMarkdown";

export default function NewArticlePage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] =
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

  const [loading, setLoading] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

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
    }

    getUser();
  }, [router]);

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

  function resetForm() {
    setTitle("");
    setSlug("");
    setContent("");
    setTags("");
    setNotes("");
    setVisibility("public");
  }

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
      beforeText + selectedText + afterText;

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

  async function checkSlugExists() {
    if (!slug.trim()) return false;

    const { data } = await supabase
      .from("posts")
      .select("id")
      .eq("slug", slug.trim())
      .maybeSingle();

    return !!data;
  }

  async function publishArticle() {
    if (!currentUser) return;

    if (
      !title.trim() ||
      !slug.trim() ||
      !content.trim()
    ) {
      alert("请填写标题、slug 和文章内容。");
      return;
    }

    const confirmed =
      confirm("确定发布这篇文章吗？");

    if (!confirmed) return;

    setLoading(true);

    const exists =
      await checkSlugExists();

    if (exists) {
      alert("这个 slug 已经存在，请修改。");
      setLoading(false);
      return;
    }

    const finalSlug = generateSlug(slug.trim());

    const { data: newPost, error } =
      await supabase
        .from("posts")
        .insert([
          {
            type: "article",
            title: title.trim(),
            slug: finalSlug,
            content,
            status: "published",
            visibility,
            author_id: currentUser.id,
            tags,
            notes,
            published_at: new Date().toISOString(),
          },
        ])
        .select("id")
        .single();

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("文章发布成功 🔥");

    router.push(`/articles/${finalSlug}`);
  }

  async function saveDraft() {
    if (!currentUser) return;

    if (!title.trim() || !content.trim()) {
      alert("请至少填写标题和内容。");
      return;
    }

    setLoading(true);

    const finalSlug =
      generateSlug(slug.trim()) ||
      generateSlug(title.trim()) ||
      `${Date.now()}`;

    const { data: existing } =
      await supabase
        .from("posts")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle();

    if (existing) {
      alert("这个 slug 已经存在，请修改。");
      setLoading(false);
      return;
    }

    const { error } =
      await supabase.from("posts").insert([
        {
          type: "article",
          title: title.trim(),
          slug: finalSlug,
          content,
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
    const hasContent =
      title || slug || content || tags || notes;

    if (hasContent) {
      const confirmed = confirm(
        "确定放弃这篇文章吗？内容不会保存。"
      );

      if (!confirmed) return;
    }

    resetForm();

    router.push("/articles");
  }

  const toolbarButtonClass =
    "rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm hover:border-white/30 transition";

  return (
    <main className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[minmax(680px,1.5fr)_minmax(420px,0.9fr)]">
        {/* 左边：编辑区 */}
        <section className="space-y-6">
          <div>
            <p className="text-xs tracking-[0.4em] text-white/25">
              NEW ARTICLE
            </p>

            <h1 className="mt-5 text-5xl font-light">
              写一篇故事
            </h1>

            <p className="mt-4 text-sm leading-7 text-white/40">
              文章适合长一点的想法、故事、作品和那些你想认真留下来的东西。
            </p>
          </div>

          <input
            type="text"
            placeholder="文章标题"
            value={title}
            onChange={(e) => {
              const value = e.target.value;

              setTitle(value);
              setSlug(generateSlug(value));
            }}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 outline-none transition focus:border-white/40"
          />

          <input
            type="text"
            placeholder="slug，例如 my-night-story"
            value={slug}
            onChange={(e) =>
              setSlug(e.target.value)
            }
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

          {/* Markdown 工具栏 */}
          <div className="sticky top-4 z-20 flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-black/80 p-4 backdrop-blur-xl">
            <button
              type="button"
              onClick={() =>
                insertTextAtCursor("\n# 标题\n")
              }
              className={toolbarButtonClass}
            >
              H1
            </button>

            <button
              type="button"
              onClick={() =>
                insertTextAtCursor("\n## 小标题\n")
              }
              className={toolbarButtonClass}
            >
              H2
            </button>

            <button
              type="button"
              onClick={() =>
                insertTextAtCursor("**", "**")
              }
              className={toolbarButtonClass}
            >
              粗体
            </button>

            <button
              type="button"
              onClick={() =>
                insertTextAtCursor("\n> 引用内容\n")
              }
              className={toolbarButtonClass}
            >
              引用
            </button>

            <button
              type="button"
              onClick={() =>
                insertTextAtCursor("\n---\n")
              }
              className={toolbarButtonClass}
            >
              分割线
            </button>

            <button
              type="button"
              onClick={() =>
                insertTextAtCursor(
                  "\n```js\n// 在这里写代码\n```\n"
                )
              }
              className={toolbarButtonClass}
            >
              Code
            </button>

            <button
              type="button"
              onClick={() =>
                insertTextAtCursor(
                  "[链接文字](https://example.com)"
                )
              }
              className={toolbarButtonClass}
            >
              链接
            </button>

            <button
              type="button"
              onClick={() =>
                insertTextAtCursor(
                  "\n- 项目一\n- 项目二\n- 项目三\n"
                )
              }
              className={toolbarButtonClass}
            >
              清单
            </button>

            <button
              type="button"
              onClick={() =>
                insertTextAtCursor(
                  "\n> 💡 提示：这里写重点内容\n"
                )
              }
              className={toolbarButtonClass}
            >
              提示
            </button>
          </div>

          <textarea
            ref={textareaRef}
            placeholder="写下你的文章内容..."
            value={content}
            onChange={(e) =>
              setContent(e.target.value)
            }
            onKeyDown={(e) => {
              if (
                e.ctrlKey &&
                e.key.toLowerCase() === "b"
              ) {
                e.preventDefault();

                insertTextAtCursor("**", "**");
              }

              if (
                e.ctrlKey &&
                e.key.toLowerCase() === "s"
              ) {
                e.preventDefault();

                saveDraft();
              }
            }}
            rows={24}
            className="w-full min-h-[560px] rounded-2xl border border-white/10 bg-white/[0.04] p-5 leading-8 outline-none transition focus:border-white/40"
          />

          <div className="flex flex-wrap gap-4 pt-4">
            <button
              onClick={publishArticle}
              disabled={loading}
              className="rounded-full bg-white px-8 py-4 text-sm font-bold text-black transition hover:bg-white/90 disabled:opacity-40"
            >
              {loading
                ? "处理中..."
                : "发布文章"}
            </button>

            <button
              onClick={saveDraft}
              disabled={loading}
              className="rounded-full border border-white/10 bg-white/[0.04] px-8 py-4 text-sm text-white/70 transition hover:border-white/25 hover:text-white disabled:opacity-40"
            >
              保存草稿
            </button>

            <button
              onClick={discardArticle}
              className="rounded-full border border-red-500/20 bg-red-500/[0.06] px-8 py-4 text-sm text-red-200/80 transition hover:bg-red-500/[0.12]"
            >
              放弃
            </button>
          </div>
        </section>

        {/* 右边：设置 + 预览 */}
        <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start lg:pt-24">
          <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-2xl">
            <p className="text-xs tracking-[0.3em] text-white/30">
                可见性
            </p>

            <div className="mt-4 grid gap-2.5">
                {[
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
                        : "border-white/10 bg-white/[0.035] text-white/45 hover:border-white/20 hover:text-white/70"
                    }`}
                >
                    <div className="flex items-center gap-2.5">
                    <span>{item.icon}</span>
                    <span className="text-sm font-medium">
                        {item.title}
                    </span>
                    </div>

                    <p className="mt-1.5 text-[11px] leading-5 text-white/30">
                    {item.desc}
                    </p>
                </button>
                ))}
            </div>
            </div>

          <input
            type="text"
            placeholder="标签，用逗号隔开"
            value={tags}
            onChange={(e) =>
              setTags(e.target.value)
            }
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 outline-none transition focus:border-white/40"
          />

          <textarea
            placeholder="想法 / 大纲（只有自己看得到）"
            value={notes}
            onChange={(e) =>
              setNotes(e.target.value)
            }
            rows={7}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 leading-7 text-yellow-100 outline-none transition focus:border-white/40"
          />

          <div className="h-[520px] overflow-y-auto rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
            <p className="mb-5 text-sm text-white/35">
              Markdown 预览
            </p>

            {content ? (
            <article className="prose prose-invert max-w-none prose-p:leading-[2.2]">
                <TranslatedMarkdown
                content={content}
                />
            </article>
            ) : (
            <div className="space-y-6">
                <p className="text-sm leading-7 text-white/35">
                这里会显示文章预览。
                </p>

                <div className="flex justify-center py-4">
                <div className="relative h-20 w-16 rounded-sm border border-violet-400/50 bg-white/[0.025] shadow-[0_0_35px_rgba(139,92,246,0.18)]">
                    <div className="absolute left-3 top-5 h-[2px] w-6 rounded-full bg-violet-300/60" />
                    <div className="absolute left-3 top-8 h-[2px] w-7 rounded-full bg-white/25" />
                    <div className="absolute left-3 top-11 h-[2px] w-5 rounded-full bg-white/20" />

                    <div className="absolute -right-2 top-4 h-12 w-2 rounded-r-full border-y border-r border-violet-400/45" />

                    <div className="absolute -bottom-3 left-1/2 h-[1px] w-20 -translate-x-1/2 bg-violet-400/30 blur-sm" />
                </div>
                </div>

                <p className="text-sm leading-7 text-white/30">
                写下一个会被未来某个人读见的故事。
                </p>
            </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}