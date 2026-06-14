type MessageType = "system" | "announcement" | "event" | "reward" | "private";

type Props = {
  messageType: MessageType;
  title: string;
  content: string;
};

function getTypeLabel(type: MessageType) {
  switch (type) {
    case "announcement":
      return "📢 世界公告";
    case "event":
      return "🏮 活动通知";
    case "reward":
      return "🎖️ 奖励通知";
    case "private":
      return "💌 私人信件";
    default:
      return "🌙 系统来信";
  }
}

export default function BroadcastPreview({
  messageType,
  title,
  content,
}: Props) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-black/50 p-5">
      <p className="text-sm text-zinc-500">
        预览 · {getTypeLabel(messageType)}
      </p>

      <h2 className="safe-text mt-4 break-words text-2xl font-bold">
        {title || "信件标题会显示在这里"}
      </h2>

      <p className="safe-pre mt-4 break-words leading-8 text-zinc-300">
        {content || "信件内容会显示在这里。"}
      </p>
    </section>
  );
}