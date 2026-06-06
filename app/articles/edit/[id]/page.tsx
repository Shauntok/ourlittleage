"use client";

import {
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { pinyin } from "pinyin-pro";
import { supabase } from "@/lib/supabase";
import TranslatedMarkdown from "@/components/TranslatedMarkdown";

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
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.slice(start, end);
    const insertText = beforeText + selectedText + afterText;

    textarea.setRangeText(insertText, start, end, "end");
    setContent(textarea.value);

    const newPosition = start + insertText.length;
    textarea.focus();
    textarea.setSelectionRange(newPosition, newPosition);
  }

  async function uploadImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const cleanName = file.name.replace(/\s+/g, "-");
    const fileName = `${Date.now()}-${cleanName}`;

    const { error } = await supabase.storage
      .from("images")
      .upload(fileName, file);

    setUploading(false);

    if (error) {
      alert(error.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("images").getPublicUrl(fileName);

    insertTextAtCursor(`\n\n![](${publicUrl})\n\n`);
  }

  async function saveArticle() {
    if (!validateTitle()) return;
    if (!validateContent()) return;

    const finalSlug =
      generateSlug(slug.trim()) || generateSlug(cleanTitle);

    if (!finalSlug) {
      alert("slug 无法生成，请换一个标题或手动填写。");
      return;
    }

    if (!hasChanged) {
      router.push(`/articles/${article.slug}`);
      return;
    }

    setSaving(true);

    const { data: existing } = await supabase
      .from("posts")
      .select("id")
      .eq("slug", finalSlug)
      .neq("id", id)
      .maybeSingle();

    if (existing) {
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

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/articles");
  }

  function leaveWithoutSaving() {
    if (hasChanged) {
      const confirmed = confirm("你还有没保存的修改，确定离开吗？");
      if (!confirmed) return;
    }

    router.push(`/articles/${article.slug}`);
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

            <p className="mt-4 text-sm leading-7 text-white/40">
              慢慢整理这篇故事。修改会在保存后才真正生效。
            </p>
          </div>

          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="文章标题"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 outline-none transition focus:border-white/40"
            />

            <div className="mt-2 flex items-center justify-between gap-3 text-xs">
              <p className="text-white/25">
                标题建议短一点，比较像一扇门。
              </p>

              <p
                className={`shrink-0 ${
                  titleCount > 25
                    ? "text-red-200/70"
                    : "text-white/30"
                }`}
              >
                已写 {titleCount} 字 · 最多 25 字
              </p>
            </div>
          </div>

          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug，例如 my-night-story"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 outline-none transition focus:border-white/40"
          />

          <div className="sticky top-4 z-20 flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-black/80 p-4 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => insertTextAtCursor("\n# 标题\n")}
              className={toolbarButtonClass}
            >
              H1
            </button>

            <button
              type="button"
              onClick={() => insertTextAtCursor("\n## 小标题\n")}
              className={toolbarButtonClass}
            >
              H2
            </button>

            <label className={toolbarButtonClass + " cursor-pointer"}>
              {uploading ? "上传中..." : "图片"}
              <input
                type="file"
                accept="image/*"
                onChange={uploadImage}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={() => insertTextAtCursor("**", "**")}
              className={toolbarButtonClass}
            >
              粗体
            </button>

            <button
              type="button"
              onClick={() => insertTextAtCursor("\n> 引用内容\n")}
              className={toolbarButtonClass}
            >
              引用
            </button>

            <button
              type="button"
              onClick={() =>
                insertTextAtCursor("[链接文字](https://example.com)")
              }
              className={toolbarButtonClass}
            >
              链接
            </button>

            <button
              type="button"
              onClick={() =>
                insertTextAtCursor("\n- 项目一\n- 项目二\n- 项目三\n")
              }
              className={toolbarButtonClass}
            >
              清单
            </button>

            <button
              type="button"
              onClick={() => insertTextAtCursor("\n---\n")}
              className={toolbarButtonClass}
            >
              分割线
            </button>

            <button
              type="button"
              onClick={() =>
                insertTextAtCursor("\n> 💡 提示：这里写重点内容\n")
              }
              className={toolbarButtonClass}
            >
              提示
            </button>

            <button
              type="button"
              onClick={() =>
                insertTextAtCursor("\n```js\n// 在这里写代码\n```\n")
              }
              className={toolbarButtonClass}
            >
              Code
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.ctrlKey && e.key.toLowerCase() === "b") {
                e.preventDefault();
                insertTextAtCursor("**", "**");
              }

              if (e.ctrlKey && e.key.toLowerCase() === "s") {
                e.preventDefault();
                saveArticle();
              }
            }}
            rows={24}
              className="
                w-full min-h-[560px] rounded-2xl
                border border-white/10 bg-white/[0.04]
                p-5 leading-8 outline-none transition
                break-words whitespace-pre-wrap
                focus:border-white/40
              "          
              />

          <div className="flex flex-col gap-6 pt-2 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2 text-xs">
              <p
                className={`${
                  contentCount < 500
                    ? "text-yellow-100/55"
                    : "text-emerald-100/55"
                }`}
              >
                已写 {contentCount} 字
                {contentCount < 500
                  ? ` · 距离发布建议还差 ${500 - contentCount} 字`
                  : " · 已达到发布长度"}
              </p>

              <p className="text-white/25">
                慢慢写，故事不用急着完成。
              </p>
            </div>

            <div className="flex flex-wrap gap-4 md:justify-end">
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
                  onClick={() => setVisibility(item.key)}
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
            onChange={(e) => setTags(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 outline-none transition focus:border-white/40"
          />

          <textarea
            placeholder="想法 / 大纲（只有自己看得到）"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={7}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 leading-7 text-yellow-100 outline-none transition focus:border-white/40"
          />

          <div className="h-[520px] overflow-y-auto rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
            <p className="mb-5 text-sm text-white/35">
              Markdown 预览
            </p>

            {content ? (
              <article
                className="
                  prose prose-invert max-w-none
                  overflow-hidden break-words
                  prose-p:break-words prose-p:leading-[2.2]
                  prose-pre:whitespace-pre-wrap prose-pre:break-words
                  prose-code:break-words
                "
              >
                <TranslatedMarkdown content={content} />
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