"use client";

import {
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import TranslatedMarkdown from "@/components/TranslatedMarkdown";

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

export default function EditDiaryPage() {
  const params = useParams();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const id = String(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [diary, setDiary] = useState<any>(null);
  const [content, setContent] = useState("");
  const [visibility, setVisibility] =
    useState<"private" | "public">("private");

  const [originalContent, setOriginalContent] = useState("");
  const [originalVisibility, setOriginalVisibility] =
    useState<"private" | "public">("private");

  useEffect(() => {
    async function fetchDiary() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/home";
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
        window.location.href = "/diary";
        return;
      }

      const loadedContent = data.content || "";
      const loadedVisibility = data.visibility || "private";

      setDiary(data);
      setContent(loadedContent);
      setVisibility(loadedVisibility);

      setOriginalContent(loadedContent);
      setOriginalVisibility(loadedVisibility);

      setLoading(false);
    }

    fetchDiary();
  }, [id]);

  const contentChanged = content !== originalContent;
  const visibilityChanged = visibility !== originalVisibility;
  const hasChanged = contentChanged || visibilityChanged;

  function goToDiaryDetail() {
    window.location.href = `/diary/${id}`;
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

  async function saveDiary() {
    if (!content.trim()) {
      alert("日记内容不能为空。");
      return;
    }

    if (!hasChanged) {
      goToDiaryDetail();
      return;
    }

    setSaving(true);

    const diaryDate = diary?.published_at || diary?.created_at;

    const fallbackTitle = `日记 · ${formatDate(diaryDate)}`;

    const fallbackSlug =
      diary?.slug || `diary-${diary?.id || Date.now()}`;

    const { error } = await supabase
      .from("posts")
      .update({
        title: diary?.title || fallbackTitle,
        slug: fallbackSlug,
        content,
        visibility,

        edited_at: contentChanged
          ? new Date().toISOString()
          : diary?.edited_at,

        edit_count: contentChanged
          ? (diary?.edit_count || 0) + 1
          : diary?.edit_count || 0,
      })
      .eq("id", id);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    goToDiaryDetail();
  }

  async function deleteDiary() {
    const confirmed = confirm(
      "确定要放下这一天吗？删除后，这篇日记会被永久移除。"
    );

    if (!confirmed) return;

    const { error } = await supabase.from("posts").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/diary";
  }

  function leaveWithoutSaving() {
    if (hasChanged) {
      const confirmed = confirm(
        "这一页还有没存好的痕迹，确定先离开吗？"
      );

      if (!confirmed) return;
    }

    goToDiaryDetail();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm tracking-[0.3em] text-white/35">
          正在重新翻开那一天...
        </p>
      </main>
    );
  }

  const diaryDate = diary?.published_at || diary?.created_at;

  const toolbarButtonClass =
    "rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/60 transition hover:text-white";

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-6 py-24 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />
      <div className="pointer-events-none fixed left-1/2 top-1/3 -z-10 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <section className="space-y-6">
          <button
            type="button"
            onClick={leaveWithoutSaving}
            className="text-sm text-white/35 transition hover:text-white/70"
          >
            ← 回到这一天的日记阅读
          </button>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 backdrop-blur-2xl">
            <p className="text-xs tracking-[0.35em] text-white/30">
              重新翻开这一天
            </p>

            <h1 className="mt-4 text-4xl font-light">
              {diaryDate ? formatDate(diaryDate) : "那一天"}
            </h1>

            <div className="mt-5 flex flex-wrap gap-3 text-xs text-white/40">
              {diaryDate && (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
                  {formatWeekday(diaryDate)}
                </span>
              )}

              <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
                {visibility === "public" ? "🌍 已公开" : "🔒 私密"}
              </span>

              {(diary?.edit_count || 0) > 0 && (
                <span className="rounded-full border border-yellow-500/15 bg-yellow-500/[0.06] px-4 py-2 text-yellow-100/60">
                  后来补写过 {diary.edit_count} 次
                </span>
              )}
            </div>

            <div className="mt-6 text-sm">
              {contentChanged ? (
                <p className="text-yellow-200/70">
                  这一页还有新的补写没保存。
                </p>
              ) : visibilityChanged ? (
                <p className="text-blue-200/60">
                  可见性还没保存。
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
              onClick={() => insertTextAtCursor("\n# 标题\n")}
              className={toolbarButtonClass}
            >
              H1
            </button>

            <button
              type="button"
              onClick={() => insertTextAtCursor("\n## 今天的小标题\n")}
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
              onClick={() =>
                insertTextAtCursor("\n> 后来想补充的是：\n")
              }
              className={toolbarButtonClass}
            >
              引用
            </button>

            <button
              type="button"
              onClick={() =>
                insertTextAtCursor("[想留下的链接](https://example.com)")
              }
              className={toolbarButtonClass}
            >
              链接
            </button>

            <button
              type="button"
              onClick={() =>
                insertTextAtCursor(
                  "\n- 今天发生的事\n- 我想到的事\n- 想记住的事\n"
                )
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
                insertTextAtCursor("\n> 💡 我想提醒未来的自己：\n")
              }
              className={toolbarButtonClass}
            >
              提示
            </button>

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
                saveDiary();
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
              {content.trim().length} 字 · Ctrl + S 保存
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={leaveWithoutSaving}
                className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm text-white/60 transition hover:text-white"
              >
                先这样
              </button>

              <button
                type="button"
                onClick={saveDiary}
                disabled={saving}
                className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving
                  ? "正在收好..."
                  : hasChanged
                  ? "保存新的痕迹"
                  : "回到日记"}
              </button>

              <button
                type="button"
                onClick={deleteDiary}
                className="rounded-full border border-red-500/20 bg-red-500/[0.06] px-6 py-3 text-sm text-red-200/70 transition hover:bg-red-500/[0.12] hover:text-red-100"
              >
                删除回忆
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
                type="button"
                onClick={() => setVisibility("private")}
                className={`rounded-2xl border px-5 py-4 text-left transition ${
                  visibility === "private"
                    ? "border-white/25 bg-white/[0.09] text-white"
                    : "border-white/10 bg-white/[0.035] text-white/45 hover:border-white/20 hover:text-white/70"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span>🔒</span>
                  <span className="text-sm font-medium">只给自己看</span>
                </div>

                <p className="mt-1.5 text-[11px] leading-5 text-white/30">
                  这一天只放在自己的房间里。
                </p>
              </button>

              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={`rounded-2xl border px-5 py-4 text-left transition ${
                  visibility === "public"
                    ? "border-white/25 bg-white/[0.09] text-white"
                    : "border-white/10 bg-white/[0.035] text-white/45 hover:border-white/20 hover:text-white/70"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span>🌍</span>
                  <span className="text-sm font-medium">发布到日记广场</span>
                </div>

                <p className="mt-1.5 text-[11px] leading-5 text-white/30">
                  让其他居民也能读见这一刻。
                </p>
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 text-sm leading-7 text-white/40 backdrop-blur-2xl">
            <p className="text-xs tracking-[0.3em] text-white/30">
              时间痕迹
            </p>

            <div className="mt-5 space-y-3">
              {diaryDate && (
                <p>
                  写下于：
                  {new Date(diaryDate).toLocaleString()}
                </p>
              )}

              {diary?.edited_at ? (
                <p>
                  后来补写于：
                  {new Date(diary.edited_at).toLocaleString()}
                </p>
              ) : (
                <p>还没有后来补写过。</p>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 text-sm leading-8 text-white/40 backdrop-blur-2xl">
            <p className="text-xs tracking-[0.3em] text-white/30">
              补写提示
            </p>

            <div className="mt-5 space-y-2">
              <p>· 有些情绪会迟到</p>
              <p>· 后来的理解，也算答案</p>
              <p>· 你不是在修改过去</p>
              <p>· 只是终于愿意认真看它一眼</p>
            </div>
          </div>

          <div className="preview-scrollbar max-h-[620px] overflow-y-auto rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-2xl">
            <p className="mb-5 text-xs tracking-[0.3em] text-white/30">
              预览
            </p>

            {content ? (
              <article className="prose prose-invert max-w-none prose-p:leading-[2.2]">
                <TranslatedMarkdown content={content} />
              </article>
            ) : (
              <div className="space-y-6">
                <p className="text-sm leading-7 text-white/35">
                  这里会预览你补写后的回忆。
                </p>

                <div className="flex justify-center py-5">
                  <div className="relative h-20 w-16 rounded-sm border border-violet-400/50 bg-white/[0.025] shadow-[0_0_35px_rgba(139,92,246,0.18)]">
                    <div className="absolute left-3 top-5 h-[2px] w-6 rounded-full bg-violet-300/60" />
                    <div className="absolute left-3 top-8 h-[2px] w-7 rounded-full bg-white/25" />
                    <div className="absolute left-3 top-11 h-[2px] w-5 rounded-full bg-white/20" />
                    <div className="absolute -right-2 top-4 h-12 w-2 rounded-r-full border-y border-r border-violet-400/45" />
                    <div className="absolute -bottom-3 left-1/2 h-[1px] w-20 -translate-x-1/2 bg-violet-400/30 blur-sm" />
                  </div>
                </div>

                <p className="text-sm leading-7 text-white/30">
                  有些话，当时写不出来，不代表它不重要。
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}