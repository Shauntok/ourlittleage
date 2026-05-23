"use client";

import { pinyin } from "pinyin-pro";
import { supabase } from "@/lib/supabase";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import TranslatedMarkdown from "@/components/TranslatedMarkdown";

export default function EditPage() {
  // ===== 取得文章 ID =====
  const params = useParams();
  const id = String(params.id);
  const textareaRef =
  useRef<HTMLTextAreaElement>(null);
  const [publishedAt, setPublishedAt] =
  useState<string | null>(null);

  // ===== 记录正文光标位置 =====
  const [cursorPosition, setCursorPosition] =
  useState(0);

  // ===== 文章主要内容 =====
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");

  // ===== Tags / 作者私密备注 =====
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [editCount, setEditCount] =
  useState(0);
  const [visibility, setVisibility] = useState("public");

  // ===== 页面状态 =====
  const [loading, setLoading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [savedContent, setSavedContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // ===== 标题转 slug =====
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

  

  // ===== 统一保存状态格式 =====
  function makeSnapshot() {
    return JSON.stringify({
      title,
      slug,
      content,
      tags,
      notes,
    });
  }

  // ===== 把数据库 tags 统一转成输入框文字 =====
  function normalizeTags(value: any) {
    if (Array.isArray(value)) {
      return value.join(", ");
    }

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);

        if (Array.isArray(parsed)) {
          return parsed.join(", ");
        }
      } catch {}

      return value;
    }

    return "";
  }

    // ===== 插入文字到正文光标位置，可包住选中文字 =====
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
        setCursorPosition(newPosition);
      }

  // ===== 上传图片，并自动插入 Markdown =====
  async function uploadImage(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    const cleanName = file.name.replace(/\s+/g, "-");
    const fileName = `${Date.now()}-${cleanName}`;

    const { error } = await supabase.storage
      .from("images")
      .upload(fileName, file);

    if (error) {
      alert(error.message);
      return;
    }

    const {
  data: { publicUrl },
} = supabase.storage
  .from("images")
  .getPublicUrl(fileName);

      // ===== 插入可调整宽度的图片 HTML =====
        const imageMarkdown =
         "\n\n![](" + publicUrl + ")\n\n";

      // ===== 插入到最后记录的光标位置 =====
      insertTextAtCursor(imageMarkdown);

      // ===== 上传后恢复光标位置 =====
      setTimeout(() => {
        const textarea = textareaRef.current;

        if (!textarea) return;

        const newPosition =
          cursorPosition + imageMarkdown.length;

        textarea.focus();
        textarea.setSelectionRange(
          newPosition,
          newPosition
        );

        setCursorPosition(newPosition);
      }, 0);

      alert("图片上传成功 🔥");
  }

  // ===== 手动保存修改 =====
  async function updatePost() {
    if (!title || !slug || !content) {
      alert("请填写完整");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("posts")
      .update({
        title,
        slug,
        content,
        tags,
        notes,
        visibility,
        status,
        edit_count: editCount + 1,
        edited_at: new Date().toISOString(),
      })
      .eq("id", id);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    const newSnapshot = makeSnapshot();

    setSavedContent(newSnapshot);
    setIsDirty(false);

    // ===== 清掉离开页面警告 =====
    (window as any).adminHasUnsavedChanges = false;

    // ===== 保存成功 =====
    alert("修改已保存 🔥");

    // ===== 返回上一页 =====
    window.history.back();
  }

  // ===== 自动保存：不会跳转，不会弹 alert =====
  async function autoSavePost() {
    if (!isDirty) return;

    if (!title || !slug || !content) return;

    setAutoSaving(true);

    const { error } = await supabase
      .from("posts")
      .update({
        title,
        slug,
        content,
        tags,
        notes,
        visibility,
        status,
        edited_at: new Date().toISOString(),
      })
      .eq("id", id);

    setAutoSaving(false);

    if (error) {
      console.log(error.message);
      return;
    }

    setSavedContent(makeSnapshot());
    setIsDirty(false);
  }

  // ===== 发布草稿文章 =====
  async function publishEditedPost() {
    if (!title || !slug || !content) {
      alert("请填写完整");
      return;
    }

    const confirmed = confirm("确定发布这篇文章吗？");
    if (!confirmed) return;

    setLoading(true);

    const { error } = await supabase
      .from("posts")
      .update({
        title,
        slug,
        content,
        tags,
        notes,
        status: "published",
        published_at:
        publishedAt || new Date().toISOString(),
        visibility,
        edited_at: new Date().toISOString(),
      })
      .eq("id", id);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }
    alert("文章已发布 🔥");
    window.location.href = "/admin/published";
  }

  // ===== 删除文章 =====
  async function deletePost() {
    const confirmed = confirm("确定永久删除这篇文章吗？");
    if (!confirmed) return;

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("文章已删除");
    window.history.back();
  }

  // ===== 防止刷新 / 关闭页面时丢失未保存内容 =====
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirty) return;

      e.preventDefault();
      e.returnValue = "";
    }

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );
    };
  }, [isDirty]);

  // ===== 把未保存状态交给 AdminSidebar 使用 =====
  useEffect(() => {
    (window as any).adminHasUnsavedChanges = isDirty;

    return () => {
      (window as any).adminHasUnsavedChanges = false;
    };
  }, [isDirty]);

  // ===== 读取文章资料 =====
  useEffect(() => {
    async function fetchPost() {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();

      if (!data) return;

      const normalizedTags = normalizeTags(data.tags);

      const initialSnapshot = JSON.stringify({
        title: data.title || "",
        slug: data.slug || "",
        content: data.content || "",
        tags: normalizedTags,
        notes: data.notes || "",
      });

      setTitle(data.title || "");
      setSlug(data.slug || "");
      setContent(data.content || "");
      setTags(normalizedTags);
      setNotes(data.notes || "");
      setStatus(data.status || "");
      setPublishedAt(data.published_at || null);
      setEditCount(data.edit_count || 0);
      setVisibility(data.visibility || "public");

      setSavedContent(initialSnapshot);
      setLoaded(true);
    }

    if (id) fetchPost();
  }, [id]);


  // ===== 检查是否有未保存修改 =====
  useEffect(() => {
    if (!loaded) return;

    setIsDirty(
      savedContent !== "" &&
        makeSnapshot() !== savedContent
    );
  }, [
    title,
    slug,
    content,
    tags,
    notes,
    savedContent,
    loaded,
  ]);

  // ===== 自动保存：停止输入 2 秒后触发 =====
  useEffect(() => {
    if (!loaded) return;
    if (!isDirty) return;
    if (status === "published") return;

    const timer = setTimeout(() => {
      autoSavePost();
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    title,
    slug,
    content,
    tags,
    notes,
    isDirty,
    loaded,
  ]);

  return (
  <div className="grid grid-cols-1 lg:grid-cols-[minmax(680px,1.5fr)_minmax(420px,0.9fr)] gap-8">

          {/* ===== 中间：文章主要内容 ===== */}
          <section className="space-y-6">

          <h1 className="text-4xl font-bold">
            编辑文章 ✍️
          </h1>

          {/* ===== 保存状态提示 ===== */}
          <div className="text-sm">
            {autoSaving ? (
              <p className="text-blue-400">
                ☁️ 自动保存中...
              </p>
            ) : isDirty ? (
              <p className="text-yellow-400">
                ⚠️ 你有未保存修改
              </p>
            ) : (
              <p className="text-green-400">
                ✅ 已保存
              </p>
            )}
          </div>

          {/* ===== 标题 ===== */}
          <input
            value={title}
            onChange={(e) => {
              const value = e.target.value;
              setTitle(value);
              setSlug(generateSlug(value));
            }}
            className="w-full p-4 bg-zinc-900 border border-zinc-700 rounded-xl"
          />

          <div className="flex flex-wrap gap-2 text-sm">
            <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300">
              {status === "published" ? "✅ 已发布" : "📝 草稿"}
            </span>

            <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300">
              {visibility === "public" && "🌍 Public"}
              {visibility === "hidden" && "🙈 Hidden"}
              {visibility === "unlisted" && "🔗 Unlisted"}
              {visibility === "private" && "🔒 Private"}
            </span>
          </div>

          {/* ===== Slug ===== */}
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full p-4 bg-zinc-900 border border-zinc-700 rounded-xl"
          />

          {/* ===== 上传图片 ===== */}
          <label className="inline-flex items-center gap-3 px-5 py-3 bg-zinc-900 border border-zinc-700 rounded-2xl cursor-pointer hover:border-white transition">
            <span>📸 上传图片</span>

            <input
              type="file"
              accept="image/*"
              onChange={uploadImage}
              className="hidden"
            />
          </label>

          {/* ===== Markdown 工具栏 ===== */}
            <div className="sticky top-4 z-20 flex flex-wrap gap-3 p-4 rounded-2xl border border-zinc-800 bg-black/80 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => insertTextAtCursor("\n# 标题\n")}
              className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-white transition"
            >
              H1
            </button>

            <button
              type="button"
              onClick={() => insertTextAtCursor("\n## 小标题\n")}
              className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-white transition"
            >
              H2
            </button>

            <button
              type="button"
              onClick={() => insertTextAtCursor("**粗体文字**")}
              className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-white transition"
            >
              粗体
            </button>

            <button
              type="button"
              onClick={() => insertTextAtCursor("\n> 引用内容\n")}
              className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-white transition"
            >
              引用
            </button>

            <button
              type="button"
              onClick={() => insertTextAtCursor("\n---\n")}
              className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-white transition"
            >
              分割线
            </button>

            <button
              type="button"
              onClick={() =>
                insertTextAtCursor("\n```js\n// 在这里写代码\n```\n")
              }
              className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-white transition"
            >
              Code
            </button>

            <button
              type="button"
              onClick={() =>
                insertTextAtCursor("[链接文字](https://example.com)")
              }
              className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-white transition"
            >
              链接
            </button>

            <button
              type="button"
              onClick={() =>
                insertTextAtCursor("\n- 项目一\n- 项目二\n- 项目三\n")
              }
              className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-white transition"
            >
              清单
            </button>

            <button
              type="button"
              onClick={() =>
                insertTextAtCursor("\n> 💡 提示：这里写重点内容\n")
              }
              className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-white transition"
            >
              提示
            </button>
          </div>

          {/* ===== 正文 ===== */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onClick={(e) =>
                setCursorPosition(e.currentTarget.selectionStart)
              }
              onKeyUp={(e) =>
                setCursorPosition(e.currentTarget.selectionStart)
              }
              onKeyDown={(e) => {
                if (e.ctrlKey && e.key.toLowerCase() === "b") {
                  e.preventDefault();
                  insertTextAtCursor("**", "**");
                }

                if (e.ctrlKey && e.key.toLowerCase() === "s") {
                  e.preventDefault();
                  updatePost();
                }
              }}
              rows={22}
              className="preview-scrollbar w-full min-h-[500px] p-4 bg-zinc-900 border border-zinc-700 rounded-xl outline-none focus:border-white overflow-y-auto"
            />

          {/* ===== 操作按钮 ===== */}
          <div className="flex flex-wrap gap-4 pt-4">
            <button
              onClick={updatePost}
              disabled={loading}
              className="admin-btn admin-btn-primary"
            >
              {loading ? "保存中..." : "保存修改"}
            </button>

            <button
              onClick={publishEditedPost}
              disabled={loading}
              className="admin-btn admin-btn-success"
            >
              发布文章
            </button>

            <button
              onClick={deletePost}
              className="admin-btn admin-btn-danger"
            >
              删除文章
            </button>
          </div>
        </section>

        {/* ===== 右边：辅助资料 + Markdown 预览 ===== */}
        <aside className="space-y-6 lg:pt-20 sticky top-8 self-start">
          {/* ===== 文章设置 ===== */}
          <div className="space-y-4 border border-zinc-800 rounded-2xl p-5 bg-zinc-950">
            <div>
              <p className="text-sm text-zinc-500 mb-2">
                可见性{" "}
                <span
                  title="Public：公开显示。Hidden：隐藏但可用链接访问。Unlisted：未来可做专属分享链接。Private：只有后台/Admin 可见。"
                  className="cursor-help text-zinc-400"
                >
                  ⓘ
                </span>
              </p>

              <select
                value={visibility}
                onChange={(e) =>
                  setVisibility(e.target.value)
                }
                className="w-full p-4 bg-zinc-900 border border-zinc-700 rounded-xl outline-none focus:border-white"
              >
                <option value="public">
                  🌍 Public（公开）
                </option>

                <option value="hidden">
                  👁 Hidden（隐藏）
                </option>

                <option value="private">
                  🔒 Private（私人）
                </option>
              </select>
            </div>

            <div>
              <p className="text-sm text-zinc-500 mb-2">
                发布状态{" "}
                <span
                  title="草稿不会出现在前台。已发布会根据可见性规则决定谁能看到。"
                  className="cursor-help text-zinc-400"
                >
                  ⓘ
                </span>
              </p>

              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value)
                }
                className="w-full p-4 bg-zinc-900 border border-zinc-700 rounded-xl outline-none focus:border-white"
              >
                <option value="draft">
                  📝 草稿
                </option>

                <option value="published">
                  ✅ 已发布
                </option>
              </select>
            </div>
          </div>
          {/* ===== Tags ===== */}
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="w-full p-4 bg-zinc-900 border border-zinc-700 rounded-xl outline-none focus:border-white"
          >
            <option value="public">🌍 Public（公开）</option>
            <option value="hidden">🙈 Hidden（隐藏）</option>
            <option value="unlisted">🔗 Unlisted（仅链接可见）</option>
            <option value="private">🔒 Private（私密）</option>
          </select>
          <input
            type="text"
            placeholder="标签（用逗号隔开）"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full p-4 bg-zinc-900 border border-zinc-700 rounded-xl outline-none focus:border-white"
          />

          {/* ===== 作者私密想法 / 大纲 ===== */}
          <textarea
            placeholder="想法 / 大纲（只有自己看得到）"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={8}
            className="w-full p-4 bg-zinc-900 border border-zinc-700 rounded-xl outline-none focus:border-white text-yellow-200"
          />

          {/* ===== Markdown 实时预览 ===== */}
          <div className="preview-scrollbar border border-zinc-800 rounded-2xl p-5 pr-3 bg-zinc-950 h-[900px] overflow-y-auto">
            <p className="text-sm text-zinc-500 mb-4">
              Markdown 预览
            </p>

            {content ? (
              <article className="prose prose-invert max-w-none">
                <TranslatedMarkdown content={content} />
              </article>
            ) : (
              <p className="text-zinc-500">
                这里会显示文章预览。
              </p>
            )}
          </div>
        </aside>
        </div>
);
}