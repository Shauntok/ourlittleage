import { createRef, useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ModernWritingPage from "./ModernWritingPage";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/TranslatedMarkdown", () => ({ default: ({ content }: { content: string }) => <p>{content}</p> }));

function commonProps() {
  return {
    content: "今天的故事已经写好了。",
    setContent: vi.fn(),
    textareaRef: createRef<HTMLTextAreaElement>(),
    insertTextAtCursor: vi.fn(),
    uploadImage: vi.fn(),
    uploading: false,
    remainingCount: 1,
    message: "",
    saving: false,
    publishing: false,
    saveDraft: vi.fn(),
    publish: vi.fn(),
  };
}

describe("ModernWritingPage", () => {
  it("keeps diary writing, visibility, preview and actions available", () => {
    const props = commonProps();
    const setVisibility = vi.fn();
    render(<ModernWritingPage {...props} kind="diary" visibility="private" setVisibility={setVisibility} diaryDate="2026年11月1日" diaryWeekday="星期日" />);

    expect(screen.getByRole("heading", { name: "写下今天" })).toBeTruthy();
    expect(screen.getAllByText("今天的故事已经写好了。")).toHaveLength(2);
    fireEvent.click(screen.getByRole("radio", { name: /日记广场/ }));
    expect(setVisibility).toHaveBeenCalledWith("public");
    fireEvent.click(screen.getByRole("radio", { name: /仅邻居可见/ }));
    expect(setVisibility).toHaveBeenCalledWith("neighbors");
    expect(screen.queryByRole("radio", { name: /仅链接可见/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "粗体" }));
    expect(props.insertTextAtCursor).toHaveBeenCalledWith("**", "**");
    fireEvent.click(screen.getByRole("button", { name: "保存草稿" }));
    fireEvent.click(screen.getByRole("button", { name: /留下今天.*发布今天/ }));
    expect(props.saveDraft).toHaveBeenCalledOnce();
    expect(props.publish).toHaveBeenCalledOnce();
  });

  it("disables public image uploads when writing for neighbors", () => {
    render(<ModernWritingPage {...commonProps()} kind="diary" visibility="neighbors" setVisibility={vi.fn()} />);
    expect(screen.getByText(/目前只支持纯文字/)).toBeInTheDocument();
    expect(screen.getByLabelText("图片暂不可用")).toBeDisabled();
  });

  it("keeps the original link visibility available only for a legacy post", () => {
    render(<ModernWritingPage {...commonProps()} kind="diary" visibility="unlisted" setVisibility={vi.fn()} allowLegacyUnlisted />);
    expect(screen.getByRole("radio", { name: /仅链接可见（旧作品）/ })).toBeChecked();
  });

  it("keeps article title, slug, tags, notes and publishing controls", () => {
    const props = commonProps();
    const article = {
      title: "",
      setTitle: vi.fn(),
      slug: "",
      setSlug: vi.fn(),
      tags: "",
      setTags: vi.fn(),
      notes: "",
      setNotes: vi.fn(),
      generateSlug: vi.fn(() => "a-story"),
    };
    const discard = vi.fn();
    render(<ModernWritingPage {...props} kind="article" visibility="public" setVisibility={vi.fn()} article={article} discard={discard} />);

    fireEvent.change(screen.getByLabelText(/标题 已写 0 字 · 建议最多 25 字/), { target: { value: "一篇故事" } });
    expect(article.setTitle).toHaveBeenCalledWith("一篇故事");
    expect(article.setSlug).toHaveBeenCalledWith("a-story");
    fireEvent.change(screen.getByLabelText("标签"), { target: { value: "生活" } });
    fireEvent.change(screen.getByLabelText("私人提纲"), { target: { value: "第一段" } });
    expect(article.setTags).toHaveBeenCalledWith("生活");
    expect(article.setNotes).toHaveBeenCalledWith("第一段");
    fireEvent.click(screen.getByRole("button", { name: "发布文章" }));
    expect(props.publish).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "放弃" }));
    expect(discard).toHaveBeenCalledOnce();
  });

  it("opens the mobile diary audience window and publishes only after confirmation", () => {
    const confirmPublish = vi.fn();
    function MobileDiary() {
      const [open, setOpen] = useState(false);
      const [visibility, setVisibility] = useState<"private" | "public" | "hidden" | "unlisted" | "neighbors">("public");
      return <ModernWritingPage {...commonProps()} kind="diary" visibility={visibility} setVisibility={setVisibility} publish={() => setOpen(true)} confirmPublish={confirmPublish} visibilityDialogOpen={open} closeVisibilityDialog={() => setOpen(false)} diaryDate="2026年11月9日" diaryWeekday="星期一" />;
    }
    render(<MobileDiary />);

    const hints = screen.getByRole("button", { name: /写作提示/ });
    fireEvent.click(hints);
    expect(hints).toHaveAttribute("aria-expanded", "true");
    expect(within(document.getElementById("modern-writing-hints")!).getByText("不必完美，真实就好。")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /留下今天.*发布今天/ }));
    const dialog = screen.getByRole("dialog", { name: "放到哪里？" });
    expect(confirmPublish).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("radio", { name: /仅邻居可见/ }));
    expect(within(dialog).getByRole("radio", { name: /仅邻居可见/ })).toBeChecked();
    fireEvent.click(within(dialog).getByRole("button", { name: "再写一写" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(confirmPublish).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /留下今天.*发布今天/ }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "确认发布" }));
    expect(confirmPublish).toHaveBeenCalledOnce();
  });

  it("uses the same audience confirmation for articles", () => {
    const confirmPublish = vi.fn();
    render(<ModernWritingPage {...commonProps()} kind="article" visibility="private" setVisibility={vi.fn()} visibilityDialogOpen closeVisibilityDialog={vi.fn()} confirmPublish={confirmPublish} />);
    const dialog = screen.getByRole("dialog", { name: "放到哪里？" });
    expect(within(dialog).getByRole("radio", { name: /文章广场/ })).toBeInTheDocument();
    expect(within(dialog).getByRole("radio", { name: /只给自己看/ })).toBeChecked();
    fireEvent.click(within(dialog).getByRole("button", { name: "确认发布" }));
    expect(confirmPublish).toHaveBeenCalledOnce();
  });
});
