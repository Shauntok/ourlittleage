"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import TranslatedMarkdown from "@/components/TranslatedMarkdown";
import VisibilitySelector from "@/components/editor/VisibilitySelector";
import MarkdownToolbar from "@/components/editor/MarkdownToolbar";
import EditorTextarea from "@/components/editor/EditorTextarea";
import MobileVisibilityDialog from "@/components/editor/MobileVisibilityDialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { uploadEditorImage } from "@/components/editor/editorImageUpload";
import { insertEditorText } from "@/components/editor/editorTextUtils";

type DiaryVisibility = "private" | "public" | "hidden" | "unlisted";

const MIN_DIARY_LENGTH = 11;

const visibilityOptions = [
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
];

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
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const id = String(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [diary, setDiary] = useState<any>(null);
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<DiaryVisibility>("private");

  const [originalSnapshot, setOriginalSnapshot] = useState("");
  const [editorMessage, setEditorMessage] = useState("");
  const [showVisibilityDialog, setShowVisibilityDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "saveDiary" | "publishDraft" | null
  >(null);

  const cleanContent = content.trim();
  const isDraft = diary?.status === "draft";
  const diaryDate = diary?.published_at || diary?.created_at;

  useEffect(() => {
    async function fetchDiary() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/home");
        return;
      }

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .eq("author_id", user.id)
        .eq("type", "diary")
        .is("deleted_at", null)
        .single();

      if (error || !data) {
        router.push("/diary");
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
  }, [id, router]);

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
    router.push(`/diary/${id}`);
  }

  function goToDrafts() {
    router.push("/drafts");
  }

  function insertTextAtCursor(beforeText: string, afterText = "") {
    insertEditorText({
      textareaRef,
      beforeText,
      afterText,
      setContent,
    });
  }

  function validateDraft() {
    setEditorMessage("");

    if (!cleanContent) {
      setEditorMessage("写一点点就好，我帮你先收进草稿箱。");
      return false;
    }

    return true;
  }

  function validatePublish() {
    setEditorMessage("");

    if (cleanContent.length < MIN_DIARY_LENGTH) {
      setEditorMessage(
        `再写几句话吧，至少留下 ${MIN_DIARY_LENGTH} 个字，让今天更完整一些。`
      );
      return false;
    }

    return true;
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

  async function saveDraft() {
    if (!validateDraft()) return;

    setSaving(true);

    const fallbackDate = diaryDate || new Date().toISOString();
    const fallbackTitle = diary?.title || `日记 · ${formatDate(fallbackDate)}`;
    const fallbackSlug = diary?.slug || `diary-${diary?.id || Date.now()}`;

    const { error } = await supabase
      .from("posts")
      .update({
        title: fallbackTitle,
        slug: fallbackSlug,
        content: cleanContent,
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

    goToDrafts();
  }

  async function publishDraft() {
    if (!validatePublish()) return;

    setSaving(true);

    const now = new Date();
    const fallbackTitle =
      diary?.title || `日记 · ${formatDate(now.toISOString())}`;
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
      setEditorMessage(error.message);
      return;
    }

    goToDiaryDetail();
  }

  async function saveDiary() {
    if (!validateDraft()) return;

    if (!hasChanged) {
      goToDiaryDetail();
      return;
    }

    setSaving(true);

    const fallbackDate = diaryDate || new Date().toISOString();
    const fallbackTitle = diary?.title || `日记 · ${formatDate(fallbackDate)}`;
    const fallbackSlug = diary?.slug || `diary-${diary?.id || Date.now()}`;

    const { error } = await supabase
      .from("posts")
      .update({
        title: fallbackTitle,
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
      setEditorMessage(error.message);
      return;
    }

    goToDiaryDetail();
  }

  async function deleteDiary() {
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
    router.push(isDraft ? "/drafts" : "/diary");
  }

  function leaveWithoutSaving() {
    if (hasChanged) {
      setEditorMessage("这一页还有没保存的痕迹。先保存一下，再离开也不迟。");
      return;
    }

    if (isDraft) {
      goToDrafts();
      return;
    }

    goToDiaryDetail();
  }

  function handleSaveDiaryClick() {
    if (window.innerWidth < 1024) {
      setPendingAction("saveDiary");
      setShowVisibilityDialog(true);
      return;
    }

    saveDiary();
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

    if (pendingAction === "saveDiary") {
      saveDiary();
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
          正在重新翻开那一天...
        </p>
      </main>
    );
  }

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

          <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-2xl md:p-8">
            <button
              type="button"
              onClick={() => setShowPromptDialog(true)}
              className="absolute right-5 top-5 inline-flex animate-pulse items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100 shadow-[0_0_26px_rgba(34,211,238,0.18)] transition hover:bg-cyan-400/15 lg:hidden"
            >
              ✨ 提示
            </button>

            <p className="pr-24 text-xs tracking-[0.35em] text-white/30 lg:pr-0">
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

          {editorMessage && (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {editorMessage}
            </div>
          )}

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
                    onClick={handlePublishDraftClick}
                    disabled={saving}
                    className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-40"
                  >
                    留下今天
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveDiaryClick}
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
                onClick={() => setShowDeleteDialog(true)}
                className="rounded-full border border-red-500/20 bg-red-500/[0.06] px-6 py-3 text-sm text-red-200/70 transition hover:bg-red-500/[0.12] hover:text-red-100"
              >
                {isDraft ? "移入回收站" : "放进回收站"}
              </button>
            </div>
          </div>
        </section>

        <aside className="hidden space-y-6 lg:sticky lg:top-24 lg:block lg:self-start">
          <div>
            <VisibilitySelector
              visibility={visibility}
              setVisibility={(value) => setVisibility(value as DiaryVisibility)}
              options={visibilityOptions}
            />
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

          <div className="preview-scrollbar max-h-[620px] overflow-y-auto rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-2xl">
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
              REWRITE HINTS
            </p>

            <h2 className="mt-4 text-2xl font-light">补写提示</h2>

            <ul className="mt-5 space-y-4 text-sm leading-7 text-white/55">
              <li>• 有些情绪会迟到</li>
              <li>• 后来的理解，也算答案</li>
              <li>• 你不是在修改过去</li>
              <li>• 只是终于愿意认真看它一眼</li>
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
        setVisibility={(value) => setVisibility(value as DiaryVisibility)}
        options={visibilityOptions}
        title={isDraft ? "这篇草稿要放在哪里？" : "这篇日记要保存成什么可见性？"}
        subtitle="选择可见性后，我就帮你把这一页收好。"
        confirmText={isDraft ? "确定，留下今天" : "确定，保存修改"}
        cancelText="再看看"
        onClose={() => {
          setShowVisibilityDialog(false);
          setPendingAction(null);
        }}
        onConfirm={confirmVisibilityAction}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        title="放进回收站？"
        description={
          isDraft
            ? "这篇日记草稿不会立刻永久删除，会先进入回收站。之后仍然可以恢复。"
            : "这一天不会立刻永久消失，会先进入回收站。之后仍然可以恢复。"
        }
        confirmText={isDraft ? "移入回收站" : "放进回收站"}
        cancelText="再想想"
        danger
        loading={deleting}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={deleteDiary}
      />
    </main>
  );
}