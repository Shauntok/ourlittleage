"use client";

import {
  useState,
  ChangeEvent,
  useRef,
  useEffect,
} from "react";
import { supabase } from "@/lib/supabase";
import { pinyin } from "pinyin-pro";
import TranslatedMarkdown from "@/components/TranslatedMarkdown";

export default function DashboardPage() {
  // ===== 文章主要内容 =====
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");

  // ===== 辅助资料 =====
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");

  // ===== 状态 =====
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [visibility, setVisibility] =
  useState("public");
  const [currentUser, setCurrentUser] =
      useState<any>(null);
    // ===== 获取当前登录用户 =====
    useEffect(() => {
      async function getUser() {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        setCurrentUser(user);
      }

      getUser();
    }, []);

  // ===== 编辑器 =====
  const textareaRef =
    useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] =
    useState(0);

  // ===== 中文标题自动生成 slug =====
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

  // ===== 清空表单 =====
  function resetForm() {
    setVisibility("public");
    setTitle("");
    setSlug("");
    setContent("");
    setTags("");
    setNotes("");
    setCursorPosition(0);
  }

  // ===== 插入文字到正文光标位置 =====
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

    setCursorPosition(newPosition);
  }

  // ===== 上传图片并插入到正文光标位置 =====
  async function uploadImage(
    e: ChangeEvent<HTMLInputElement>
  ) {
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
    } = supabase.storage
      .from("images")
      .getPublicUrl(fileName);

    // ===== Markdown 图片格式，Preview 会自动显示 =====
      const imageMarkdown =
    "\n\n![](" + publicUrl + ")\n\n";

     insertTextAtCursor(imageMarkdown);

    alert("图片上传成功 🔥");
  }

  // ===== 检查 slug 是否重复 =====
  async function checkSlugExists() {
    const { data } = await supabase
      .from("posts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    return !!data;
  }

  // ===== 发布文章 =====
  async function publishPost() {
    if (!title || !slug || !content) {
      alert("请填写完整");
      return;
    }

    const confirmed = confirm("确定发布文章吗？");
    if (!confirmed) return;

    setLoading(true);

    const exists = await checkSlugExists();

    if (exists) {
      alert("这个 slug 已经存在，请修改");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("posts").insert([
      {
        title,
        slug,
        content,
        status: "published",
        author_id: currentUser?.id,
        visibility,
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
    alert("发布成功 🔥");
  }

  // ===== 保存草稿 =====
  async function saveDraft() {
    if (!title || !content) {
      alert("请至少填写标题和内容");
      return;
    }

    setLoading(true);

    const exists = await checkSlugExists();

    if (exists) {
      alert("这个 slug 已经存在，请修改");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("posts").insert([
      {
        title,
        slug,
        content,
        status: "draft",
        author_id: currentUser?.id,
        visibility,
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

  // ===== 放弃当前内容 =====
  function discardPost() {
    const hasContent =
      title || slug || content || tags || notes;

    if (hasContent) {
      const confirmed = confirm(
        "确定放弃这篇文章吗？内容不会保存。"
      );

      if (!confirmed) return;
    }

    resetForm();
    window.location.href = "/admin/dashboard";
  }

  return (
  <div className="grid grid-cols-1 lg:grid-cols-[minmax(680px,1.5fr)_minmax(420px,0.9fr)] gap-8">
    {/* ===== 左边：文章主要内容 ===== */}
    <section className="space-y-6">
      <h1 className="text-4xl font-bold">
        新建文章 ✍️
      </h1>

      {/* ===== 标题 ===== */}
      <input
        type="text"
        placeholder="文章标题"
        value={title}
        onChange={(e) => {
          const value = e.target.value;
          setTitle(value);
          setSlug(generateSlug(value));
        }}
        className="w-full p-4 bg-zinc-900 border border-zinc-700 rounded-xl outline-none focus:border-white"
      />

      {/* ===== Slug ===== */}
      <input
        type="text"
        placeholder="slug"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        className="w-full p-4 bg-zinc-900 border border-zinc-700 rounded-xl outline-none focus:border-white"
      />

      {/* ===== 上传图片 ===== */}
      <div>
        <label className="inline-flex items-center gap-3 px-5 py-3 bg-zinc-900 border border-zinc-700 rounded-xl cursor-pointer hover:border-white transition">
          <span>📸 上传图片</span>

          <input
            type="file"
            accept="image/*"
            onChange={uploadImage}
            className="hidden"
          />
        </label>

        {uploading && (
          <p className="text-zinc-400 mt-2">
            上传中...
          </p>
        )}
      </div>

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
          onClick={() => insertTextAtCursor("**", "**")}
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
        placeholder="文章内容"
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
            saveDraft();
          }
        }}
        rows={23}
        className="preview-scrollbar w-full min-h-[500px] p-4 bg-zinc-900 border border-zinc-700 rounded-xl outline-none focus:border-white overflow-y-auto"
      />

      {/* ===== 操作按钮 ===== */}
      <div className="flex flex-wrap gap-4 pt-4">
        <button
          onClick={publishPost}
          disabled={loading}
          className="bg-white text-black px-6 py-3 font-bold rounded-xl hover:opacity-80 transition"
        >
          {loading ? "发布中..." : "发布文章"}
        </button>

        <button
          onClick={saveDraft}
          disabled={loading}
          className="admin-btn admin-btn-secondary"
        >
          保存草稿
        </button>

        <button
          onClick={discardPost}
          className="admin-btn admin-btn-secondary"
        >
          放弃
        </button>
      </div>
    </section>

    {/* ===== 右边：辅助资料 + Markdown 预览 ===== */}
    <aside className="space-y-6 lg:pt-20 sticky top-8 self-start">

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
          🙈 Hidden（隐藏）
        </option>

        <option value="unlisted">
          🔗 Unlisted（仅链接可见）
        </option>

        <option value="private">
          🔒 Private（私密）
        </option>
      </select>
      {/* ===== Tags ===== */}
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