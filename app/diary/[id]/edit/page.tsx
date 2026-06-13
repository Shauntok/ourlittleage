"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import TranslatedMarkdown from "@/components/TranslatedMarkdown";
import MarkdownToolbar from "@/components/editor/MarkdownToolbar";
import EditorTextarea from "@/components/editor/EditorTextarea";

type DiaryVisibility = "private" | "public" | "hidden" | "unlisted";

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

function getVisibilityLabel(visibility: DiaryVisibility) {
  switch (visibility) {
    case "public":
      return "🌍 已公开";
    case "hidden":
      return "🙈 隐藏";
    case "unlisted":
      return "🔗 链接可见";
    case "private":
    default:
      return "🔒 私密";
  }
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
  const [visibility, setVisibility] = useState<DiaryVisibility>("private");

  const [originalSnapshot, setOriginalSnapshot] = useState("");

  const cleanContent = content.trim();
  const isDraft = diary?.status === "draft";

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
      const loadedVisibility = (data.visibility || "private") as DiaryVisibility;

      setDiary(data);
      setContent(loadedContent);
      setVisibility(loadedVisibility);

      setOriginalSnapshot(
        JSON.stringify({
          content: loadedContent,
          visibility: loadedVisibility,
          status: data.status || "draft",
        })
      );

      setLoading(false);
    }

    fetchDiary();
  }, [id]);

  function makeSnapshot(nextStatus = diary?.status || "draft") {
    return JSON.stringify({
      content,
      visibility,
      status: nextStatus,
    });
  }

  const hasChanged = makeSnapshot() !== originalSnapshot;
  const contentChanged = content !== (diary?.content || "");

  function goToDiaryDetail() {
    window.location.href = `/diary/${id}`;
  }

  function goToDrafts() {
    window.location.href = "/drafts";
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

  async function saveDraft() {
    if (!cleanContent) {
      alert("先写一点点，再暂时收起来吧。");
      return;
    }

    setSaving(true);

    const diaryDate = diary?.published_at || diary?.created_at;
    const fallbackTitle = `日记 · ${formatDate(diaryDate)}`;
    const fallbackSlug = diary?.slug || `diary-${diary?.id || Date.now()}`;

    const { error } = await supabase
      .from("posts")
      .update({
        title: diary?.title || fallbackTitle,
        slug: fallbackSlug,
        content: cleanContent,
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

    goToDrafts();
  }

  async function publishDraft() {
    if (cleanContent.length < 11) {
      alert("至少留下 11 个字吧。");
      return;
    }

    const confirmed = confirm("确定留下今天吗？发布后会成为正式日记。");
    if (!confirmed) return;

    setSaving(true);

    const now = new Date();
    const fallbackTitle = diary?.title || `日记 · ${formatDate(now.toISOString())}`;
    const fallbackSlug = diary?.slug || `diary-${diary?.id || Date.now()}`;

    const { error } = await supabase
      .from("posts")
      .update({
        title: fallbackTitle,
        slug: fallbackSlug,
        content: cleanContent,
        visibility,
        status: "published",
        published_at: now.toISOString(),
        edited_at: new Date().toISOString(),
      })
      .eq("id", id);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    goToDiaryDetail();
  }

  async function saveDiary() {
    if (!cleanContent) {
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
    const fallbackSlug = diary?.slug || `diary-${diary?.id || Date.now()}`;

    const { error } = await supabase
      .from("posts")
      .update({
        title: diary?.title || fallbackTitle,
        slug: fallbackSlug,
        content: cleanContent,
        visibility,
        edited_at: contentChanged ? new Date().toISOString() : diary?.edited_at,
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
      isDraft
        ? "确定删除这篇日记草稿吗？"
        : "确定要放下这一天吗？删除后，这篇日记会被永久移除。"
    );

    if (!confirmed) return;

    const { error } = await supabase.from("posts").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = isDraft ? "/drafts" : "/diary";
  }

  function leaveWithoutSaving() {
    if (hasChanged) {
      const confirmed = confirm("这一页还有没存好的痕迹，确定先离开吗？");
      if (!confirmed) return;
    }

    if (isDraft) {
      goToDrafts();
      return;
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

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-5 pb-24 pt-16 text-white md:px-6 md:py-24">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />
      <div className="pointer-events-none fixed left-1/2 top-1/3 -z-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl md:h-[560px] md:w-[560px]" />

      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <section className="space-y-6">
          <button
            type="button"
            onClick={leaveWithoutSaving}
            className="text-sm text-white/35 transition hover:text-white/70"
          >
            ← {isDraft ? "回到草稿箱" : "回到这一天的日记阅读"}
          </button>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-2xl md:p-8">
            <p className="text-xs tracking-[0.35em] text-white/30">
              {isDraft ? "继续写日记草稿" : "重新翻开这一天"}
            </p>

            <h1 className="mt-3 text-4xl font-light md:mt-4">
              {diaryDate ? formatDate(diaryDate) : "那一天"}
            </h1>

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/40 md:mt-5 md:gap-3">
              {diaryDate && (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 md:px-4 md:py-2">
                  {formatWeekday(diaryDate)}
                </span>
              )}

              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 md:px-4 md:py-2">
                {isDraft ? "草稿" : "已发布"}
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 md:px-4 md:py-2">
                {getVisibilityLabel(visibility)}
              </span>

              {(diary?.edit_count || 0) > 0 && (
                <span className="rounded-full border border-yellow-500/15 bg-yellow-500/[0.06] px-3 py-1.5 text-yellow-100/60 md:px-4 md:py-2">
                  后来补写过 {diary.edit_count} 次
                </span>
              )}
            </div>

            <div className="mt-5 text-sm md:mt-6">
              {hasChanged ? (
                <p className="text-yellow-200/70">
                  这一页还有没保存的改动。
                </p>
              ) : (
                <p className="text-green-200/60">
                  {isDraft ? "这篇草稿已暂时收好。" : "这一页回忆已保存。"}
                </p>
              )}
            </div>
          </div>

          <MarkdownToolbar
            uploading={uploading}
            uploadImage={uploadImage}
            insertTextAtCursor={insertTextAtCursor}
            variant="diary"
          />

          <EditorTextarea
            textareaRef={textareaRef}
            content={content}
            setContent={setContent}
            placeholder="你后来还有什么想说的吗？"
            onSaveShortcut={isDraft ? saveDraft : saveDiary}
            insertTextAtCursor={insertTextAtCursor}
            variant="diary"
          />

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-white/35">
              {cleanContent.length} 字 ·{" "}
              {isDraft ? "Ctrl + S 保存草稿" : "Ctrl + S 保存"}
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:flex md:flex-wrap">
              <button
                type="button"
                onClick={leaveWithoutSaving}
                className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm text-white/60 transition hover:border-white/25 hover:text-white"
              >
                先这样
              </button>

              {isDraft ? (
                <>
                  <button
                    type="button"
                    onClick={saveDraft}
                    disabled={saving}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm text-white/60 transition hover:border-white/25 hover:text-white disabled:opacity-40"
                  >
                    {saving ? "保存中..." : "保存草稿"}
                  </button>

                  <button
                    type="button"
                    onClick={publishDraft}
                    disabled={saving}
                    className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-40"
                  >
                    留下今天
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={saveDiary}
                  disabled={saving}
                  className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-40"
                >
                  {saving
                    ? "正在收好..."
                    : hasChanged
                    ? "保存新的痕迹"
                    : "回到日记"}
                </button>
              )}

              <button
                type="button"
                onClick={deleteDiary}
                className="rounded-full border border-red-500/20 bg-red-500/[0.06] px-6 py-3 text-sm text-red-200/70 transition hover:bg-red-500/[0.12] hover:text-red-100"
              >
                {isDraft ? "删除草稿" : "删除回忆"}
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-2xl">
            <p className="text-xs tracking-[0.3em] text-white/30">可见性</p>

            <div className="mt-5 grid gap-3">
              {[
                {
                  key: "private",
                  icon: "🔒",
                  title: "只给自己看",
                  desc: "这一天只放在自己的房间里。",
                },
                {
                  key: "public",
                  icon: "🌍",
                  title: "发布到日记广场",
                  desc: "让其他居民也能读见这一刻。",
                },
                {
                  key: "hidden",
                  icon: "🙈",
                  title: "隐藏日记",
                  desc: "不会出现在公开列表。",
                },
                {
                  key: "unlisted",
                  icon: "🔗",
                  title: "仅链接可见",
                  desc: "知道链接的人才能进入。",
                },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setVisibility(item.key as DiaryVisibility)}
                  className={`rounded-2xl border px-5 py-4 text-left transition ${
                    visibility === item.key
                      ? "border-white/25 bg-white/[0.09] text-white"
                      : "border-white/10 bg-white/[0.035] text-white/45 hover:border-white/20 hover:text-white/70"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span>{item.icon}</span>
                    <span className="text-sm font-medium">{item.title}</span>
                  </div>

                  <p className="mt-1.5 text-[11px] leading-5 text-white/30">
                    {item.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 text-sm leading-7 text-white/40 backdrop-blur-2xl">
            <p className="text-xs tracking-[0.3em] text-white/30">时间痕迹</p>

            <div className="mt-5 space-y-3">
              {diaryDate && (
                <p>
                  {isDraft ? "暂存于：" : "写下于："}
                  {new Date(diaryDate).toLocaleString()}
                </p>
              )}

              {diary?.edited_at ? (
                <p>最后整理于：{new Date(diary.edited_at).toLocaleString()}</p>
              ) : (
                <p>{isDraft ? "还没有重新保存过。" : "还没有后来补写过。"}</p>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 text-sm leading-8 text-white/40 backdrop-blur-2xl">
            <p className="text-xs tracking-[0.3em] text-white/30">补写提示</p>

            <div className="mt-5 space-y-2">
              <p>· 有些情绪会迟到</p>
              <p>· 后来的理解，也算答案</p>
              <p>· 你不是在修改过去</p>
              <p>· 只是终于愿意认真看它一眼</p>
            </div>
          </div>

          <div className="preview-scrollbar hidden max-h-[620px] overflow-y-auto rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-2xl lg:block">
            <p className="mb-5 text-xs tracking-[0.3em] text-white/30">
              预览
            </p>

            {content ? (
              <article className="prose prose-invert max-w-none prose-p:leading-[2.2] [&_*]:break-words [&_*]:[overflow-wrap:anywhere]">
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