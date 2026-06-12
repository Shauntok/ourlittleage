import TranslatedMarkdown from "@/components/TranslatedMarkdown";

type Props = {
  content: string;
  emptyTitle?: string;
  emptyText?: string;
};

export default function MarkdownPreview({
  content,
  emptyTitle = "这里会显示预览。",
  emptyText = "写下一个会被未来某个人读见的故事。",
}: Props) {
  return (
    <div className="preview-scrollbar max-h-[620px] overflow-y-auto rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-2xl">
      <p className="mb-5 text-xs tracking-[0.3em] text-white/30">
        预览
      </p>

      {content ? (
        <article className="prose prose-invert max-w-none overflow-hidden break-words prose-p:break-words prose-p:leading-[2.2] prose-pre:whitespace-pre-wrap prose-pre:break-words prose-code:break-words">
          <TranslatedMarkdown content={content} />
        </article>
      ) : (
        <div className="space-y-6">
          <p className="text-sm leading-7 text-white/35">
            {emptyTitle}
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
            {emptyText}
          </p>
        </div>
      )}
    </div>
  );
}