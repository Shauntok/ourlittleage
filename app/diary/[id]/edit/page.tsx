"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import TranslatedMarkdown from "@/components/TranslatedMarkdown";

export default function EditDiaryPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");

  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [editedAt, setEditedAt] = useState<string | null>(null);
  const [editCount, setEditCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [savedContent, setSavedContent] = useState("");
  const [savedTextContent, setSavedTextContent] = useState("");
  const [savedVisibility, setSavedVisibility] =
    useState<"private" | "public">("private");

  const [isDirty, setIsDirty] = useState(false);

  function formatDate(date: string) {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  }

  function formatWeekday(date: string) {
    return new Intl.DateTimeFormat("zh-CN", {
      weekday: "long",
    }).format(new Date(date));
  }

  function makeSnapshot() {
    return JSON.stringify({
      content,
      visibility,
    });
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

    insertTextAtCursor("\n\n![](" + publicUrl + ")\n\n");
  }

  async function saveDiary(showAlert = true) {
    if (!content.trim()) {
      alert("日记内容不能是空的。");
      return;
    }

    setSaving(true);

    const contentChanged = content !== savedTextContent;
    const visibilityChanged = visibility !== savedVisibility;

    if (!contentChanged && !visibilityChanged) {
      setSaving(false);

      if (showAlert) {
        router.push(`/diary/${id}`);
      }

      return;
    }

    const updatePayload: {
      content?: string;
      visibility?: "private" | "public";
      edited_at?: string;
      edit_count?: number;
    } = {
      visibility,
    };

    if (contentChanged) {
      const now = new Date().toISOString();

      updatePayload.content = content;
      updatePayload.edited_at = now;
      updatePayload.edit_count = editCount + 1;
    }

    const { error } = await supabase
      .from("posts")
      .update(updatePayload)
      .eq("id", id);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    if (contentChanged) {
      setEditedAt(updatePayload.edited_at || null);
      setEditCount((count) => count + 1);
      setSavedTextContent(content);
    }

    if (visibilityChanged) {
      setSavedVisibility(visibility);
    }

    setSavedContent(makeSnapshot());
    setIsDirty(false);

    if (showAlert) {
      alert(contentChanged ? "这一页回忆已经更新。" : "可见性已经更新。");
      router.push(`/diary/${id}`);
    }
  }

  async function deleteDiary() {
    const confirmed = confirm(
      "确定删除这篇日记吗？这一天留下的文字会被永久移除。"
    );

    if (!confirmed) return;

    const { error } = await supabase.from("posts").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("这篇日记已经放下了。");
    router.push("/diary");
  }

  useEffect(() => {
    async function fetchDiary() {
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
        .eq("type", "diary")
        .single();

      if (error || !data) {
        router.push("/diary");
        return;
      }

      const initialContent = data.content || "";
      const initialVisibility = data.visibility || "private";

      setContent(initialContent);
      setVisibility(initialVisibility);
      setPublishedAt(data.published_at || data.created_at || null);
      setEditedAt(data.edited_at || null);
      setEditCount(data.edit_count || 0);

      const snapshot = JSON.stringify({
        content: initialContent,
        visibility: initialVisibility,
      });

      setSavedContent(snapshot);
      setSavedTextContent(initialContent);
      setSavedVisibility(initialVisibility);
      setLoading(false);
    }

    fetchDiary();
  }, [id, router]);

  useEffect(() => {
    if (loading) return;

    setIsDirty(savedContent !== "" && makeSnapshot() !== savedContent);
  }, [content, visibility, savedContent, loading]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirty) return;

      e.preventDefault();
      e.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm tracking-[0.3em] text-white/35">
          正在重新翻开那一天...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-6 py-24 text-white">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />
      <div className="fixed left-1/2 top-1/3 -z-10 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <section className="space-y-6">
          <Link
            href={`/diary/${id}`}
            className="text-sm text-white/35 transition hover:text-white/70"
          >
            ← 回到这篇日记
          </Link>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 backdrop-blur-2xl">
            <p className="text-xs tracking-[0.35em] text-white/30">
              重新翻开这一天
            </p>

            <h1 className="mt-4 text-4xl font-light">
              {publishedAt ? formatDate(publishedAt) : "那一天"}
            </h1>

            <div className="mt-5 flex flex-wrap gap-3 text-xs text-white/40">
              {publishedAt && (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
                  {formatWeekday(publishedAt)}
                </span>
              )}

              <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
                {visibility === "public" ? "🌍 已公开" : "🔒 私密"}
              </span>

              {editCount > 0 && (
                <span className="rounded-full border border-yellow-500/15 bg-yellow-500/[0.06] px-4 py-2 text-yellow-100/60">
                  编辑过 {editCount} 次
                </span>
              )}
            </div>

            <div className="mt-6 text-sm">
              {isDirty ? (
                <p className="text-yellow-200/70">
                  这一页还有新的痕迹没保存。
                </p>
              ) : (
                <p className="text-green-200/60">
                  这一页回忆已保存。
                </p>
              )}
            </div>
          </div>

          <div className="sticky top-6 z-20 flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-black/70 p-4 backdrop-blur-2xl">
            <button
              type="button"
              onClick={() => insertTextAtCursor("**", "**")}
              className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/60 transition hover:text-white"
            >
              粗体
            </button>

            <button
              type="button"
              onClick={() => insertTextAtCursor("\n> 后来想补充的是：\n")}
              className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/60 transition hover:text-white"
            >
              引用
            </button>

            <button
              type="button"
              onClick={() => insertTextAtCursor("\n---\n")}
              className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/60 transition hover:text-white"
            >
              分割线
            </button>

            <label className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/60 transition hover:text-white">
              📸 图片
              <input
                type="file"
                accept="image/*"
                onChange={uploadImage}
                className="hidden"
              />
            </label>

            {uploading && (
              <span className="px-3 py-2 text-sm text-white/35">
                上传中...
              </span>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={content}
            placeholder="你后来还有什么想说的吗？"
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.ctrlKey && e.key.toLowerCase() === "b") {
                e.preventDefault();
                insertTextAtCursor("**", "**");
              }

              if (e.ctrlKey && e.key.toLowerCase() === "s") {
                e.preventDefault();
                saveDiary(false);
              }
            }}
            rows={22}
            className="
              preview-scrollbar min-h-[560px] w-full resize-none rounded-[2rem]
              border border-white/10 bg-white/[0.035] p-8
              text-base leading-9 text-white outline-none backdrop-blur-2xl
              placeholder:text-white/20
              transition-all duration-500
              focus:border-white/25 focus:bg-white/[0.055]
            "
          />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-white/35">
              {content.trim().length} 字
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push(`/diary/${id}`)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm text-white/60 transition hover:text-white"
              >
                先这样
              </button>

              <button
                onClick={() => saveDiary(true)}
                disabled={saving}
                className="
                  rounded-full bg-white px-7 py-3 text-sm font-semibold text-black
                  transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40
                "
              >
                {saving ? "保存中..." : "保存新的痕迹"}
              </button>

              <button
                onClick={deleteDiary}
                className="rounded-full border border-red-500/20 bg-red-500/[0.06] px-6 py-3 text-sm text-red-200/70 transition hover:bg-red-500/[0.12] hover:text-red-100"
              >
                删除
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-2xl">
            <p className="text-xs tracking-[0.3em] text-white/30">
              可见性
            </p>

            <div className="mt-5 grid gap-3">
              <button
                onClick={() => setVisibility("private")}
                className={`rounded-2xl border px-5 py-4 text-left transition ${
                  visibility === "private"
                    ? "border-white/25 bg-white/[0.09] text-white"
                    : "border-white/10 bg-white/[0.035] text-white/45"
                }`}
              >
                🔒 只给自己看
              </button>

              <button
                onClick={() => setVisibility("public")}
                className={`rounded-2xl border px-5 py-4 text-left transition ${
                  visibility === "public"
                    ? "border-white/25 bg-white/[0.09] text-white"
                    : "border-white/10 bg-white/[0.035] text-white/45"
                }`}
              >
                🌍 发布到日记广场
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 text-sm leading-7 text-white/40 backdrop-blur-2xl">
            <p className="text-xs tracking-[0.3em] text-white/30">
              时间痕迹
            </p>

            <div className="mt-5 space-y-3">
              {publishedAt && (
                <p>写下于：{new Date(publishedAt).toLocaleString()}</p>
              )}

              {editedAt ? (
                <p>后来补写于：{new Date(editedAt).toLocaleString()}</p>
              ) : (
                <p>还没有后来补写过。</p>
              )}
            </div>
          </div>

          <div className="preview-scrollbar max-h-[620px] overflow-y-auto rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-2xl">
            <p className="mb-5 text-xs tracking-[0.3em] text-white/30">
              预览
            </p>

            {content ? (
              <article className="prose prose-invert max-w-none">
                <TranslatedMarkdown content={content} />
              </article>
            ) : (
              <p className="text-sm leading-7 text-white/35">
                这里会预览你补写后的回忆。
              </p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}