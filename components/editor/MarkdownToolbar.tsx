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
    "shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white/70 transition hover:border-white/30 hover:text-white md:px-4 md:text-sm";

  const tools = [
    { label: uploading ? "上传中..." : "图片", type: "image" },
    { label: "粗体", before: "**", after: "**" },
    {
      label: "引用",
      before: variant === "diary" ? "\n> 后来我想说的是：\n" : "\n> 引用内容\n",
    },
    {
      label: "链接",
      before:
        variant === "diary"
          ? "[想留下的链接](https://example.com)"
          : "[链接文字](https://example.com)",
    },
    { label: "H1", before: "\n# 标题\n", more: true },
    {
      label: "H2",
      before: variant === "diary" ? "\n## 今天的小标题\n" : "\n## 小标题\n",
      more: true,
    },
    {
      label: "清单",
      before:
        variant === "diary"
          ? "\n- 今天发生的事\n- 我想到的事\n- 想记住的事\n"
          : "\n- 项目一\n- 项目二\n- 项目三\n",
      more: true,
    },
    { label: "分割线", before: "\n---\n", more: true },
    {
      label: "提示",
      before:
        variant === "diary"
          ? "\n> 💡 我想提醒未来的自己：\n"
          : "\n> 💡 提示：这里写重点内容\n",
      more: true,
    },
    ...(variant === "article"
      ? [{ label: "Code", before: "\n```js\n// 在这里写代码\n```\n", more: true }]
      : []),
  ];

  function renderTool(tool: any) {
    if (tool.type === "image") {
      return (
        <label key={tool.label} className={`${buttonClass} cursor-pointer`}>
          {tool.label}
          <input
            type="file"
            accept="image/*"
            onChange={uploadImage}
            className="hidden"
          />
        </label>
      );
    }

    return (
      <button
        key={tool.label}
        type="button"
        onClick={() => insertTextAtCursor(tool.before, tool.after)}
        className={buttonClass}
      >
        {tool.label}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/80 p-4 backdrop-blur-xl">
      <div className="flex gap-2 overflow-x-auto whitespace-nowrap md:hidden">
        {tools.filter((tool) => !tool.more).map(renderTool)}

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="shrink-0 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-[13px] font-medium text-cyan-200 transition hover:bg-cyan-500/20"
        >
          {open ? "收起" : "更多"}
        </button>
      </div>

      {open && (
        <div className="mt-3 flex flex-wrap gap-2 md:hidden">
          {tools.filter((tool) => tool.more).map(renderTool)}
        </div>
      )}

      <div className="hidden gap-2 overflow-x-auto whitespace-nowrap md:flex">
        {tools.map(renderTool)}
      </div>
    </div>
  );
}