"use client";

import { ChangeEvent, KeyboardEvent, RefObject, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import EditorTextarea from "@/components/editor/EditorTextarea";
import PixelCornerMarks from "@/components/site-skins/modern-pixel/PixelCornerMarks";
import TranslatedMarkdown from "@/components/TranslatedMarkdown";
import { canSelectLinkVisibility } from "@/lib/visibility/link-visibility";
import styles from "./ModernWritingPage.module.css";

type Visibility = "private" | "public" | "hidden" | "unlisted" | "neighbors";
type Kind = "diary" | "article";

type Props = {
  kind: Kind;
  content: string;
  setContent: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  insertTextAtCursor: (before: string, after?: string) => void;
  uploadImage: (event: ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
  visibility: Visibility;
  setVisibility: (value: Visibility) => void;
  allowLegacyUnlisted?: boolean;
  remainingCount: number | null;
  message: string;
  saving: boolean;
  publishing: boolean;
  saveDraft: () => void;
  publish: () => void;
  confirmPublish?: () => void;
  visibilityDialogOpen?: boolean;
  closeVisibilityDialog?: () => void;
  discard?: () => void;
  diaryDate?: string;
  diaryWeekday?: string;
  timeWarning?: string;
  article?: {
    title: string;
    setTitle: (value: string) => void;
    slug: string;
    setSlug: (value: string) => void;
    tags: string;
    setTags: (value: string) => void;
    notes: string;
    setNotes: (value: string) => void;
    generateSlug: (value: string) => string;
  };
};

function Frame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`${styles.frame} ${className}`}><PixelCornerMarks />{children}</div>;
}

export default function ModernWritingPage(props: Props) {
  const router = useRouter();
  const [moreTools, setMoreTools] = useState(false);
  const [mobileHintsOpen, setMobileHintsOpen] = useState(false);
  const publishButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!props.visibilityDialogOpen) return;
    const previousOverflow = document.body.style.overflow;
    const publishButton = publishButtonRef.current;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      publishButton?.focus();
    };
  }, [props.visibilityDialogOpen]);

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !props.publishing) {
      props.closeVisibilityDialog?.();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)");
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  const isDiary = props.kind === "diary";
  const destination = isDiary ? "/diary" : "/articles";
  const count = props.content.trim().length;
  const minimum = isDiary ? 11 : 500;
  const linkOption = {
    key: "unlisted" as const,
    label: props.allowLegacyUnlisted ? "仅链接可见（旧作品）" : "仅链接可见",
    description: props.allowLegacyUnlisted ? "保留原有链接访问" : "知道链接的人可以读见",
  };
  const options: { key: Visibility; label: string; description: string }[] = isDiary
    ? [
        { key: "public", label: "日记广场", description: "其他居民可以读见" },
        { key: "private", label: "只给自己看", description: "留在自己的房间里" },
        { key: "neighbors", label: "仅邻居可见", description: "只有互相关注的居民可以读见" },
        ...(canSelectLinkVisibility(props.allowLegacyUnlisted ? "unlisted" : null) ? [linkOption] : []),
        { key: "hidden", label: "隐藏日记", description: "不会出现在公开列表" },
      ]
    : [
        { key: "public", label: "文章广场", description: "其他居民可以读见" },
        { key: "private", label: "只给自己看", description: "留在自己的房间里" },
        { key: "neighbors", label: "仅邻居可见", description: "只有互相关注的居民可以读见" },
        ...(canSelectLinkVisibility(props.allowLegacyUnlisted ? "unlisted" : null) ? [linkOption] : []),
        { key: "hidden", label: "隐藏文章", description: "不会出现在公开列表" },
      ];

  const tools = [
    { label: "粗体", before: "**", after: "**" },
    { label: "引用", before: isDiary ? "\n> 后来我想说的是：\n" : "\n> 引用内容\n" },
    { label: "链接", before: isDiary ? "[想留下的链接](https://example.com)" : "[链接文字](https://example.com)" },
    { label: "H1", before: "\n# 标题\n" },
    { label: "H2", before: isDiary ? "\n## 今天的小标题\n" : "\n## 小标题\n" },
    { label: "清单", before: isDiary ? "\n- 今天发生的事\n- 我想到的事\n- 想记住的事\n" : "\n- 项目一\n- 项目二\n- 项目三\n" },
    { label: "分割线", before: "\n---\n" },
    { label: "提示", before: isDiary ? "\n> 💡 我想提醒未来的自己：\n" : "\n> 💡 提示：这里写重点内容\n" },
    ...(!isDiary ? [{ label: "Code", before: "\n```js\n// 在这里写代码\n```\n" }] : []),
  ];

  return (
    <main data-nav-scene={isDiary ? "diary" : "articles"} data-writing-skin="modern_pixel" className={styles.page}>
      <div className={styles.shell}>
        <Frame className={styles.hero}>
          <p className={styles.eyebrow}>{isDiary ? "WRITE TODAY / 写日记" : "WRITE A STORY / 写文章"}</p>
          <h1>{isDiary ? "写下今天" : "写一篇故事"}</h1>
          <p>{isDiary ? `${props.diaryDate ?? "今天"} · 把今天留在自己的纸页上` : "让长一点的想法，在这里慢慢成形。"}</p>
        </Frame>

        <button type="button" onClick={() => router.push(destination)} className={styles.back}>← 回到{isDiary ? "日记" : "文章"}</button>

        <div className={styles.workspace}>
          <Frame className={styles.editor}>
            <header className={styles.sectionHead}>
              <h2>{isDiary ? `${props.diaryDate ?? "今天"} · ${props.diaryWeekday ?? ""}` : "文章标题与正文"}</h2>
              <button type="button" className={styles.headerHintsToggle} aria-expanded={mobileHintsOpen} aria-controls="modern-writing-hints" onClick={() => setMobileHintsOpen((open) => !open)}>写作提示 <span aria-hidden="true">!</span></button>
              <ul id="modern-writing-hints" className={`${styles.headerHints} ${mobileHintsOpen ? styles.headerHintsOpen : ""}`}>
                {isDiary ? <><li>不必完美，真实就好。</li><li>你只需要面对自己。</li><li>今天的自己，也值得被记住。</li></> : <><li>先写下来，不急着漂亮。</li><li>让故事慢慢长出来。</li><li>晚一点整理段落也没关系。</li></>}
              </ul>
            </header>

            {!isDiary && props.article && (
              <div className={styles.titleFields}>
                <label htmlFor="modern-article-title">标题 <span>已写 {props.article.title.trim().length} 字 · 建议最多 25 字</span></label>
                <input id="modern-article-title" value={props.article.title} placeholder="给故事取一个名字" onChange={(event) => {
                  props.article?.setTitle(event.target.value);
                  props.article?.setSlug(props.article.generateSlug(event.target.value));
                }} />
                <label htmlFor="modern-article-slug">链接名称</label>
                <input id="modern-article-slug" value={props.article.slug} placeholder="例如 my-story" onChange={(event) => props.article?.setSlug(event.target.value)} />
              </div>
            )}

            <div className={styles.toolbar} aria-label="写作工具">
              <label className={styles.imageTool}>
                {props.visibility === "neighbors" ? "图片暂不可用" : props.uploading ? "上传中…" : "图片"}
                <input type="file" accept="image/*" onChange={props.uploadImage} disabled={props.uploading || props.visibility === "neighbors"} className={styles.fileInput} />
              </label>
              {tools.slice(0, 3).map((tool) => <button key={tool.label} type="button" onClick={() => props.insertTextAtCursor(tool.before, tool.after)}>{tool.label}</button>)}
              <button type="button" aria-expanded={moreTools} onClick={() => setMoreTools((value) => !value)}>{moreTools ? "收起" : "更多 ▾"}</button>
              {moreTools && <div className={styles.moreTools}>{tools.slice(3).map((tool) => <button key={tool.label} type="button" onClick={() => props.insertTextAtCursor(tool.before, tool.after)}>{tool.label}</button>)}</div>}
            </div>

            <div className={styles.paper}>
              <h3>正文 / {isDiary ? "TODAY NOTES" : "STORY PAGES"}</h3>
              <div className={styles.textareaWrap}>
                <EditorTextarea
                  textareaRef={props.textareaRef}
                  content={props.content}
                  setContent={props.setContent}
                  placeholder={isDiary ? "今天，我想先记下这一件事……" : "从这里开始写下故事的第一段……"}
                  onSaveShortcut={props.saveDraft}
                  insertTextAtCursor={props.insertTextAtCursor}
                  variant={props.kind}
                />
              </div>
              <p className={styles.paperCount}>已写 {count} 字</p>
            </div>
            {props.message && <p className={styles.message} role="status">{props.message}</p>}
          </Frame>

          <aside className={styles.sidebar}>
            <Frame className={styles.sidePanel}>
              <h2 className={styles.desktopVisibilityHeading}>放到哪里？</h2>
              <fieldset className={styles.visibilityChoices}>
                <legend className={styles.srOnly}>可见范围</legend>
                {options.map((option) => <label key={option.key} className={`${styles.choice} ${props.visibility === option.key ? styles.selectedChoice : ""}`}>
                  <input type="radio" name="modern-writing-visibility" value={option.key} checked={props.visibility === option.key} onChange={() => props.setVisibility(option.key)} />
                  <span><strong>{option.label}</strong><small>{option.description}</small></span>
                </label>)}
              </fieldset>
              {props.visibility === "neighbors" && <p className={styles.sideHint}>目前只支持纯文字，双方互相关注才能阅读。</p>}
            </Frame>

            {props.article && !isDiary && (
              <>
                <Frame className={styles.sidePanel}>
                  <label htmlFor="modern-article-tags">标签</label>
                  <input id="modern-article-tags" value={props.article.tags} placeholder="例：生活, 故事" onChange={(event) => props.article?.setTags(event.target.value)} />
                  <p className={styles.sideHint}>用逗号分开，最多 5 个，每个不超过 20 字。公开文章的标签可供大家查找。</p>
                </Frame>
                <Frame className={styles.sidePanel}>
                  <label htmlFor="modern-article-notes">私人提纲</label>
                  <p className={styles.sideHint}>只有自己看得到</p>
                  <textarea id="modern-article-notes" rows={4} value={props.article.notes} placeholder="写下还没整理好的想法……" onChange={(event) => props.article?.setNotes(event.target.value)} />
                </Frame>
              </>
            )}

            <Frame className={styles.sidePanel}>
              <h2>{isDiary ? "今日份额" : "今日创作"}</h2>
              <p>{props.remainingCount === null ? "正在计算……" : `还可发布 ${props.remainingCount} 篇`}</p>
              <div className={styles.quotaTrack}><span style={{ width: `${props.remainingCount === null ? 0 : (props.remainingCount / (isDiary ? 3 : 2)) * 100}%` }} /></div>
              <p className={styles.sideHint}>{isDiary ? "每天慢慢留下，不需要一次说完。" : "认真写完一篇，已经很了不起了。"}</p>
            </Frame>

            <Frame className={`${styles.sidePanel} ${styles.hintsPanel}`}>
              <h2>写作提示</h2>
              <ul className={styles.hints}>
                {isDiary ? <><li>不必完美，真实就好。</li><li>你只需要面对自己。</li><li>今天的自己，也值得被记住。</li></> : <><li>先写下来，不急着漂亮。</li><li>让故事慢慢长出来。</li><li>晚一点整理段落也没关系。</li></>}
              </ul>
            </Frame>

            <Frame className={`${styles.sidePanel} ${styles.previewPanel}`}>
              <h2>实时预览</h2>
              <div className={styles.preview}>
                {props.content.trim() ? <TranslatedMarkdown content={props.content} /> : <p>你的文字会在这里变成纸页。</p>}
              </div>
            </Frame>
          </aside>

          <Frame className={styles.actions}>
            <div>
              <p>已写 {count} 字 · {count < minimum ? `至少 ${minimum} 字才可发布` : "已达到发布长度"}</p>
              <small>草稿只有自己能看见。{props.timeWarning ? ` ${props.timeWarning}` : ""}</small>
            </div>
            <div className={styles.actionButtons}>
              {props.discard && <button type="button" onClick={props.discard} className={styles.discard}>放弃</button>}
              <button type="button" onClick={props.saveDraft} disabled={props.saving || props.publishing} className={styles.secondary}>{props.saving ? "正在收好…" : "保存草稿"}</button>
              <button ref={publishButtonRef} type="button" onClick={props.publish} disabled={props.saving || props.publishing} className={styles.primary}>{props.publishing ? "处理中…" : isDiary ? <><span className={styles.desktopPublishLabel}>留下今天</span><span className={styles.mobilePublishLabel}>发布今天</span></> : "发布文章"}</button>
            </div>
          </Frame>
        </div>
      </div>
      {props.visibilityDialogOpen && (
        <div className={styles.dialogOverlay} onMouseDown={(event) => { if (event.target === event.currentTarget && !props.publishing) props.closeVisibilityDialog?.(); }}>
          <Frame className={styles.publishDialog}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="modern-publish-title" tabIndex={-1} onKeyDown={handleDialogKeyDown}>
              <p className={styles.dialogEyebrow}>BEFORE YOU PUBLISH / 发布前</p>
              <h2 id="modern-publish-title">放到哪里？</h2>
              <p className={styles.dialogIntro}>选好谁能读见这篇{isDiary ? "日记" : "文章"}，再确认发布。</p>
              <fieldset className={styles.dialogChoices}>
                <legend className={styles.srOnly}>选择可见范围</legend>
                {options.map((option) => <label key={option.key} className={`${styles.choice} ${props.visibility === option.key ? styles.selectedChoice : ""}`}>
                  <input type="radio" name="modern-publish-visibility" value={option.key} checked={props.visibility === option.key} onChange={() => props.setVisibility(option.key)} />
                  <span><strong>{option.label}</strong><small>{option.description}</small></span>
                </label>)}
              </fieldset>
              {props.visibility === "neighbors" && <p className={styles.dialogHint}>仅邻居可见目前只支持纯文字；双方互相关注才能阅读。</p>}
              {props.message && <p className={styles.dialogError} role="alert">{props.message}</p>}
              <div className={styles.dialogActions}>
                <button type="button" onClick={props.closeVisibilityDialog} disabled={props.publishing} className={styles.secondary}>再写一写</button>
                <button type="button" onClick={props.confirmPublish} disabled={props.saving || props.publishing} className={styles.primary}>{props.publishing ? "发布中…" : "确认发布"}</button>
              </div>
            </div>
          </Frame>
        </div>
      )}
    </main>
  );
}
