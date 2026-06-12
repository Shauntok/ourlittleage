"use client";

import { ChangeEvent, useState } from "react";

type Props = {
  uploading: boolean;
  uploadImage: (e: ChangeEvent<HTMLInputElement>) => void;
  insertTextAtCursor: (beforeText: string, afterText?: string) => void;
  variant?: "article" | "diary";
};

export default function MarkdownToolbar({
  uploading,
  uploadImage,
  insertTextAtCursor,
  variant = "article",
}: Props) {
  const [open, setOpen] = useState(false);

  const buttonClass =
    "rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] transition hover:border-white/30 md:px-4 md:text-sm";

  const moreButtonClass =
    "rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-[13px] font-medium text-cyan-200 transition hover:bg-cyan-500/20 md:hidden";
  
  return (
    <div className="rounded-2xl border border-white/10 bg-black/80 p-4 backdrop-blur-xl">
      {/* 第一排 */}
      <div className="flex flex-wrap gap-2">
        <label className={`${buttonClass} cursor-pointer`}>
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
          className={buttonClass}
        >
          粗体
        </button>

        <button
          type="button"
          onClick={() =>
            insertTextAtCursor(
              variant === "diary"
                ? "\n> 后来我想说的是：\n"
                : "\n> 引用内容\n"
            )
          }
          className={buttonClass}
        >
          引用
        </button>

        <button
          type="button"
          onClick={() =>
            insertTextAtCursor(
              variant === "diary"
                ? "[想留下的链接](https://example.com)"
                : "[链接文字](https://example.com)"
            )
          }
          className={buttonClass}
        >
          链接
        </button>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={moreButtonClass}
        >
          {open ? "收起" : "＋更多"}
        </button>
      </div>

      {/* 第二排（手机版展开） */}
      {(open || typeof window === "undefined") && (
        <div className="mt-3 flex flex-wrap gap-2 md:hidden">
          <button
            type="button"
            onClick={() => insertTextAtCursor("\n# 标题\n")}
            className={buttonClass}
          >
            H1
          </button>

          <button
            type="button"
            onClick={() =>
              insertTextAtCursor(
                variant === "diary"
                  ? "\n## 今天的小标题\n"
                  : "\n## 小标题\n"
              )
            }
            className={buttonClass}
          >
            H2
          </button>

          <button
            type="button"
            onClick={() =>
              insertTextAtCursor(
                variant === "diary"
                  ? "\n- 今天发生的事\n- 我想到的事\n- 想记住的事\n"
                  : "\n- 项目一\n- 项目二\n- 项目三\n"
              )
            }
            className={buttonClass}
          >
            清单
          </button>

          <button
            type="button"
            onClick={() => insertTextAtCursor("\n---\n")}
            className={buttonClass}
          >
            分割线
          </button>

          <button
            type="button"
            onClick={() =>
              insertTextAtCursor(
                variant === "diary"
                  ? "\n> 💡 我想提醒未来的自己：\n"
                  : "\n> 💡 提示：这里写重点内容\n"
              )
            }
            className={buttonClass}
          >
            提示
          </button>

          {variant === "article" && (
            <button
              type="button"
              onClick={() =>
                insertTextAtCursor(
                  "\n```js\n// 在这里写代码\n```\n"
                )
              }
              className={buttonClass}
            >
              Code
            </button>
          )}
        </div>
      )}

      {/* Desktop 全显示 */}
      <div className="mt-3 hidden flex-wrap gap-2 md:flex">
        <button
          type="button"
          onClick={() => insertTextAtCursor("\n# 标题\n")}
          className={buttonClass}
        >
          H1
        </button>

        <button
          type="button"
          onClick={() =>
            insertTextAtCursor(
              variant === "diary"
                ? "\n## 今天的小标题\n"
                : "\n## 小标题\n"
            )
          }
          className={buttonClass}
        >
          H2
        </button>

        <button
          type="button"
          onClick={() =>
            insertTextAtCursor(
              variant === "diary"
                ? "\n- 今天发生的事\n- 我想到的事\n- 想记住的事\n"
                : "\n- 项目一\n- 项目二\n- 项目三\n"
            )
          }
          className={buttonClass}
        >
          清单
        </button>

        <button
          type="button"
          onClick={() => insertTextAtCursor("\n---\n")}
          className={buttonClass}
        >
          分割线
        </button>

        <button
          type="button"
          onClick={() =>
            insertTextAtCursor(
              variant === "diary"
                ? "\n> 💡 我想提醒未来的自己：\n"
                : "\n> 💡 提示：这里写重点内容\n"
            )
          }
          className={buttonClass}
        >
          提示
        </button>

        {variant === "article" && (
          <button
            type="button"
            onClick={() =>
              insertTextAtCursor(
                "\n```js\n// 在这里写代码\n```\n"
              )
            }
            className={buttonClass}
          >
            Code
          </button>
        )}
      </div>
    </div>
  );
}