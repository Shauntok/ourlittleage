type MessageType = "system" | "announcement" | "event" | "reward" | "private";

type Props = {
  setMessageType: (value: MessageType) => void;
  setTitle: (value: string) => void;
  setContent: (value: string) => void;
  setIsImportant: (value: boolean) => void;
};

export default function BroadcastTemplates({
  setMessageType,
  setTitle,
  setContent,
  setIsImportant,
}: Props) {
  function applyTemplate(template: string) {
    if (template === "alpha") {
      setMessageType("announcement");
      setTitle("📢 小时代 Alpha 测试提醒");
      setContent(
        "感谢你参与小时代 Alpha 测试。\n\n如果你遇到 Bug、显示异常、功能卡住，欢迎把问题反馈给管理层。\n\n这个世界还在慢慢建设，谢谢你愿意先住进来。"
      );
      setIsImportant(true);
    }

    if (template === "maintenance") {
      setMessageType("announcement");
      setTitle("🛠 系统维护通知");
      setContent(
        "小时代将进行短暂维护。\n\n维护期间部分页面可能无法正常使用。\n\n维护完成后，我们会继续把世界点亮。"
      );
      setIsImportant(true);
    }

    if (template === "reward") {
      setMessageType("reward");
      setTitle("🎖️ 你收到了一份奖励");
      setContent(
        "因为你在小时代留下了温柔而重要的痕迹，管理层向你送出一份小小的奖励。\n\n谢谢你让这个世界更像一个家。"
      );
      setIsImportant(false);
    }

    if (template === "private") {
      setMessageType("private");
      setTitle("💌 来自管理层的一封信");
      setContent(
        "你好，这是一封来自小时代管理层的私人信件。\n\n我们想和你说一些只属于你的事情。"
      );
      setIsImportant(false);
    }
  }

  return (
    <section className="space-y-3">
      <p className="text-sm text-zinc-400">快速模板</p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => applyTemplate("alpha")}
          className="rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-200 transition hover:bg-violet-500/20"
        >
          Alpha 测试提醒
        </button>

        <button
          type="button"
          onClick={() => applyTemplate("maintenance")}
          className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-200 transition hover:bg-yellow-500/20"
        >
          系统维护
        </button>

        <button
          type="button"
          onClick={() => applyTemplate("reward")}
          className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-500/20"
        >
          奖励通知
        </button>

        <button
          type="button"
          onClick={() => applyTemplate("private")}
          className="rounded-full border border-pink-500/30 bg-pink-500/10 px-4 py-2 text-sm text-pink-200 transition hover:bg-pink-500/20"
        >
          私人信件
        </button>
      </div>
    </section>
  );
}