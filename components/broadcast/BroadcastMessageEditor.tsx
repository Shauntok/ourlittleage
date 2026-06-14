"use client";

import { useEffect, useMemo, useState } from "react";

type MessageType = "system" | "announcement" | "event" | "reward" | "private";
type SendMode = "now" | "scheduled";
type ScheduleMode = "quick" | "custom";
type QuickDelay = "15" | "30" | "60";
type DatePreset = "today" | "tomorrow" | "afterTomorrow" | "custom";
type Meridiem = "AM" | "PM";

type Props = {
  messageType: MessageType;
  setMessageType: (value: MessageType) => void;
  title: string;
  setTitle: (value: string) => void;
  content: string;
  setContent: (value: string) => void;
  isImportant: boolean;
  setIsImportant: (value: boolean) => void;

  sendMode: SendMode;
  setSendMode: (value: SendMode) => void;
  scheduledFor: string;
  setScheduledFor: (value: string) => void;
};

export default function BroadcastMessageEditor({
  messageType,
  setMessageType,
  title,
  setTitle,
  content,
  setContent,
  isImportant,
  setIsImportant,
  sendMode,
  setSendMode,
  setScheduledFor,
}: Props) {
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("quick");
  const [quickDelay, setQuickDelay] = useState<QuickDelay>("30");

  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [customDate, setCustomDate] = useState("");
  const [meridiem, setMeridiem] = useState<Meridiem>("PM");
  const [hour, setHour] = useState("8");
  const [minute, setMinute] = useState("00");

  const scheduledDate = useMemo(() => {
    if (sendMode !== "scheduled") return null;

    if (scheduleMode === "quick") {
      return new Date(Date.now() + Number(quickDelay) * 60 * 1000);
    }

    let base = new Date();

    if (datePreset === "tomorrow") {
      base.setDate(base.getDate() + 1);
    }

    if (datePreset === "afterTomorrow") {
      base.setDate(base.getDate() + 2);
    }

    if (datePreset === "custom") {
      if (!customDate) return null;
      base = new Date(`${customDate}T00:00:00`);
    }

    const rawHour = Number(hour);
    const rawMinute = Number(minute);

    if (
      Number.isNaN(rawHour) ||
      Number.isNaN(rawMinute) ||
      rawHour < 1 ||
      rawHour > 12 ||
      rawMinute < 0 ||
      rawMinute > 59
    ) {
      return null;
    }

    let finalHour = rawHour;

    if (meridiem === "AM" && rawHour === 12) finalHour = 0;
    if (meridiem === "PM" && rawHour !== 12) finalHour = rawHour + 12;

    base.setHours(finalHour, rawMinute, 0, 0);

    return base;
  }, [
    sendMode,
    scheduleMode,
    quickDelay,
    datePreset,
    customDate,
    meridiem,
    hour,
    minute,
  ]);

  useEffect(() => {
    if (sendMode !== "scheduled") {
      setScheduledFor("");
      return;
    }

    if (!scheduledDate) {
      setScheduledFor("");
      return;
    }

    setScheduledFor(scheduledDate.toISOString());
  }, [sendMode, scheduledDate, setScheduledFor]);

  function formatDate(value: Date | null) {
    if (!value) return "—";

    return value.toLocaleString("zh-MY", {
      timeZone: "Asia/Kuala_Lumpur",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function buttonClass(active: boolean) {
    return `rounded-2xl border px-5 py-4 text-left text-sm transition ${
      active
        ? "border-violet-500 bg-violet-500/10 text-violet-100"
        : "border-zinc-800 bg-black text-zinc-400 hover:border-zinc-500 hover:text-white"
    }`;
  }

  return (
    <>
      <section className="space-y-3">
        <p className="text-sm text-zinc-400">信件类型</p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { key: "system", label: "🌙 系统" },
            { key: "announcement", label: "📢 公告" },
            { key: "event", label: "🏮 活动" },
            { key: "reward", label: "🎖️ 奖励" },
            { key: "private", label: "💌 私信" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setMessageType(item.key as MessageType)}
              className={
                messageType === item.key
                  ? "rounded-2xl border border-white bg-white px-4 py-3 text-sm font-semibold text-black transition"
                  : "rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-white"
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-sm text-zinc-400">发送方式</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setSendMode("now")}
            className={buttonClass(sendMode === "now")}
          >
            <div className="font-semibold">立即发送</div>
            <div className="mt-1 text-xs text-zinc-500">
              现在写入居民信箱。
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSendMode("scheduled")}
            className={buttonClass(sendMode === "scheduled")}
          >
            <div className="font-semibold">预约发送</div>
            <div className="mt-1 text-xs text-zinc-500">
              先保存为待发信件。
            </div>
          </button>
        </div>

        {sendMode === "scheduled" && (
          <div className="rounded-3xl border border-zinc-800 bg-black/40 p-5">
            <p className="text-sm text-zinc-400">预约时间</p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  setScheduleMode("quick");
                  setQuickDelay("15");
                }}
                className={buttonClass(
                  scheduleMode === "quick" && quickDelay === "15"
                )}
              >
                15 分钟后
              </button>

              <button
                type="button"
                onClick={() => {
                  setScheduleMode("quick");
                  setQuickDelay("30");
                }}
                className={buttonClass(
                  scheduleMode === "quick" && quickDelay === "30"
                )}
              >
                30 分钟后
              </button>

              <button
                type="button"
                onClick={() => {
                  setScheduleMode("quick");
                  setQuickDelay("60");
                }}
                className={buttonClass(
                  scheduleMode === "quick" && quickDelay === "60"
                )}
              >
                1 小时后
              </button>
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={() => setScheduleMode("custom")}
                className={`${buttonClass(scheduleMode === "custom")} w-full`}
              >
                <div className="font-semibold">自定义日期时间</div>
                <div className="mt-1 text-xs text-zinc-500">
                  适合明天、后天、活动通知、维护信件。
                </div>
              </button>
            </div>

            {scheduleMode === "custom" && (
              <div className="mt-4 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <div>
                  <p className="mb-2 text-xs text-zinc-500">日期</p>

                  <div className="grid gap-3 md:grid-cols-4">
                    <button
                      type="button"
                      onClick={() => setDatePreset("today")}
                      className={buttonClass(datePreset === "today")}
                    >
                      今天
                    </button>

                    <button
                      type="button"
                      onClick={() => setDatePreset("tomorrow")}
                      className={buttonClass(datePreset === "tomorrow")}
                    >
                      明天
                    </button>

                    <button
                      type="button"
                      onClick={() => setDatePreset("afterTomorrow")}
                      className={buttonClass(datePreset === "afterTomorrow")}
                    >
                      后天
                    </button>

                    <button
                      type="button"
                      onClick={() => setDatePreset("custom")}
                      className={buttonClass(datePreset === "custom")}
                    >
                      自选日期
                    </button>
                  </div>
                </div>

                {datePreset === "custom" && (
                  <div>
                    <label className="mb-2 block text-xs text-zinc-500">
                      自选日期
                    </label>

                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="w-full rounded-2xl border border-zinc-800 bg-black px-5 py-4 text-sm outline-none transition focus:border-violet-500"
                    />
                  </div>
                )}

                <div>
                  <p className="mb-2 text-xs text-zinc-500">时间</p>

                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setMeridiem("AM")}
                      className={buttonClass(meridiem === "AM")}
                    >
                      上午 AM
                    </button>

                    <button
                      type="button"
                      onClick={() => setMeridiem("PM")}
                      className={buttonClass(meridiem === "PM")}
                    >
                      下午 PM
                    </button>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs text-zinc-500">
                        小时（1-12）
                      </label>

                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={hour}
                        onChange={(e) => setHour(e.target.value)}
                        className="w-full rounded-2xl border border-zinc-800 bg-black px-5 py-4 text-sm outline-none transition focus:border-violet-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs text-zinc-500">
                        分钟（0-59）
                      </label>

                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={minute}
                        onChange={(e) => setMinute(e.target.value)}
                        className="w-full rounded-2xl border border-zinc-800 bg-black px-5 py-4 text-sm outline-none transition focus:border-violet-500"
                      />
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-zinc-500">
                    例子：下午 PM + 8 小时 + 30 分钟 = 晚上 8:30。
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4">
              <p className="text-xs text-violet-300">预计发送时间</p>

              <p className="mt-1 text-sm font-medium text-violet-100">
                {scheduledDate
                  ? `${formatDate(scheduledDate)} 自动发送`
                  : "请选择有效的预约时间"}
              </p>

              <p className="mt-2 text-xs text-zinc-500">
                时间显示以马来西亚时间为准。
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <p className="text-sm text-zinc-400">信件标题</p>

        <input
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例如：🌙 今晚的月色很好"
          className="w-full rounded-2xl border border-zinc-800 bg-black px-5 py-4 outline-none transition focus:border-white"
        />

        <p className="text-xs text-zinc-600">{title.length} / 80</p>
      </section>

      <section className="space-y-2">
        <p className="text-sm text-zinc-400">信件内容</p>

        <textarea
          rows={8}
          value={content}
          maxLength={2000}
          onChange={(e) => setContent(e.target.value)}
          placeholder="写给居民的话..."
          className="safe-pre w-full resize-none rounded-2xl border border-zinc-800 bg-black px-5 py-4 leading-8 outline-none transition focus:border-white"
        />

        <p className="text-xs text-zinc-600">{content.length} / 2000</p>
      </section>

      <button
        type="button"
        onClick={() => setIsImportant(!isImportant)}
        className={
          isImportant
            ? "rounded-full border border-red-400/40 bg-red-500/10 px-5 py-3 text-sm text-red-200"
            : "rounded-full border border-zinc-700 bg-black px-5 py-3 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-white"
        }
      >
        {isImportant ? "🚨 已标记重要" : "标记为重要信件"}
      </button>
    </>
  );
}