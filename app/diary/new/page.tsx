"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import TranslatedMarkdown from "@/components/TranslatedMarkdown";

const MIN_DIARY_LENGTH = 11;
const DAILY_DIARY_LIMIT = 3;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatWeekday(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    weekday: "long",
  }).format(date);
}

function getMoodLabel(date: Date) {
  const hour = date.getHours();

  if (hour >= 0 && hour < 5) return "🌙 深夜";
  if (hour >= 5 && hour < 11) return "🌤 清晨";
  if (hour >= 11 && hour < 18) return "☀️ 午后";

  return "🌆 夜晚";
}

function getTimeWarning() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const minutesLeft = 24 * 60 - (hour * 60 + minute);

  if (minutesLeft <= 30) {
    return "今天快要翻篇了。12 点后发布，会归到新的一天。";
  }

  if (minutesLeft <= 120) {
    const hours = Math.ceil(minutesLeft / 60);
    return `距离今天翻篇还有不到 ${hours} 小时。想留在今天的话，记得慢慢写完。`;
  }

  return "";
}

export default function NewDiaryPage() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const today = new Date();
  const timeWarning = getTimeWarning();

  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">(
    "private"
  );
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [remainingCount, setRemainingCount] = useState<number | null>(null);

  const contentLength = content.trim().length;

  useEffect(() => {
    async function fetchUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/home");
        return;
      }

      setCurrentUser(user);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from("posts")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("author_id", user.id)
        .eq("type", "diary")
        .gte("published_at", todayStart.toISOString());

      setRemainingCount(Math.max(DAILY_DIARY_LIMIT - (count || 0), 0));
    }

    fetchUser();
  }, [router]);

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

  async function publishDiary() {
    if (contentLength < MIN_DIARY_LENGTH) {
      alert(`至少留下 ${MIN_DIARY_LENGTH} 个字吧。`);
      return;
    }

    if (!currentUser) return;

    setPublishing(true);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count, error: countError } = await supabase
      .from("posts")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("author_id", currentUser.id)
      .eq("type", "diary")
      .gte("published_at", todayStart.toISOString());

    if (countError) {
      alert(countError.message);
      setPublishing(false);
      return;
    }

    if ((count || 0) >= DAILY_DIARY_LIMIT) {
      alert("今天已经写了 3 篇日记。慢慢来，明天也会等你。");
      setPublishing(false);
      return;
    }

    const now = new Date();

    const { error } = await supabase.from("posts").insert([
      {
        type: "diary",
        title: `日记 · ${formatDate(now)}`,
        slug: `diary-${Date.now()}`,
        content,
        visibility,
        status: "published",
        author_id: currentUser.id,
        published_at: now.toISOString(),
      },
    ]);

    setPublishing(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/diary");
  }

  const toolbarButtonClass =
    "rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/60 transition hover:text-white";

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-6 py-20 text-white">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />
      <div className="fixed left-1/2 top-1/3 -z-10 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="mx-auto max-w-7xl">
        <button
          onClick={() => router.push("/diary")}
          className="mb-8 text-sm text-white/35 transition hover:text-white/70"
        >
          ← 回到日记列表
        </button>

        <header className="mb-10 rounded-[2.4rem] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl">
          <p className="text-xs tracking-[0.4em] text-white/25">
            WRITE TODAY
          </p>

          <h1 className="mt-6 text-5xl font-light tracking-tight md:text-6xl">
            {formatDate(today)}
          </h1>

          <p className="mt-5 text-sm text-white/35">
            {formatWeekday(today)} · {getMoodLabel(today)}
          </p>

          <p className="mt-8 max-w-md text-sm leading-8 text-white/35">
            有些话，不需要急着说完。
          </p>

          {timeWarning && (
            <div className="mt-6 max-w-xl rounded-[1.5rem] border border-yellow-500/15 bg-yellow-500/[0.06] p-5 text-sm leading-7 text-yellow-100/70">
              {timeWarning}
            </div>
          )}
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_360px]">
          <section className="space-y-6">
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
                onClick={() => insertTextAtCursor("\n> 后来我想说的是：\n")}
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
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.ctrlKey && e.key.toLowerCase() === "b") {
                  e.preventDefault();
                  insertTextAtCursor("**", "**");
                }

                if (e.ctrlKey && e.key.toLowerCase() === "s") {
                  e.preventDefault();
                  publishDiary();
                }
              }}
              placeholder="我今天过得很好，别担心。"
              rows={24}
              className="
                preview-scrollbar min-h-[760px]
                w-full resize-none rounded-[2.4rem]
                border border-white/10 bg-white/[0.045]
                p-10 text-[18px] leading-[2.5]
                text-white outline-none backdrop-blur-2xl
                placeholder:text-white/20
                shadow-[0_0_80px_rgba(255,255,255,0.035)]
                transition-all duration-500
                focus:border-white/25 focus:bg-white/[0.065]
              "
            />

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-white/35">
                  {contentLength} 字 · 建议不少于 {MIN_DIARY_LENGTH} 字
                </p>

                <p className="mt-2 text-xs text-white/25">
                  慢慢写，生活不是内容工厂。
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => router.push("/diary")}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm text-white/60 transition hover:text-white"
                >
                  暂时先这样
                </button>

                <button
                  onClick={publishDiary}
                  disabled={publishing}
                  className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {publishing ? "留下中..." : "留下今天"}
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
                今日份额
              </p>

              <div className="mt-5 space-y-4">
                <p>
                  今天还能留下{" "}
                  <span className="text-white/70">
                    {remainingCount ?? "..."}
                  </span>{" "}
                  篇日记。
                </p>

                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-white/55 transition-all duration-500"
                    style={{
                      width: `${
                        remainingCount === null
                          ? 0
                          : ((DAILY_DIARY_LIMIT - remainingCount) /
                              DAILY_DIARY_LIMIT) *
                            100
                      }%`,
                    }}
                  />
                </div>

                <p className="text-white/25">
                  每天慢慢留下，不需要一次说完。
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 text-sm leading-8 text-white/40 backdrop-blur-2xl">
              <p className="text-xs tracking-[0.3em] text-white/30">
                写作提示
              </p>

              <div className="mt-5 space-y-2">
                <p>· 不必完美</p>
                <p>· 真实就好</p>
                <p>· 你只需要面对自己</p>
                <p>· 今天的自己，也值得被记住</p>
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
                    这里会预览今天留下的东西。
                  </p>

                  <div className="flex justify-center py-6">
                    <div className="relative h-24 w-20 rounded-sm border border-violet-400/50 bg-white/[0.025] shadow-[0_0_35px_rgba(139,92,246,0.18)]">
                      <div className="absolute left-4 top-6 h-[2px] w-8 rounded-full bg-violet-300/60" />
                      <div className="absolute left-4 top-10 h-[2px] w-10 rounded-full bg-white/25" />
                      <div className="absolute left-4 top-14 h-[2px] w-7 rounded-full bg-white/20" />
                      <div className="absolute -right-3 top-5 h-14 w-3 rounded-r-full border-y border-r border-violet-400/45" />
                      <div className="absolute -bottom-3 left-1/2 h-[1px] w-16 -translate-x-1/2 bg-violet-400/30 blur-sm" />
                    </div>
                  </div>

                  <p className="text-sm leading-7 text-white/30">
                    写下这一刻，让未来的你感谢现在的自己。
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}