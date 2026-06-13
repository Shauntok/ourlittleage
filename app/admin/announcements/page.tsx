"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Announcement = {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  publish_mode: "now" | "scheduled";
  scheduled_for: string | null;
  published_at: string | null;
  sent_at: string | null;
  created_at: string;
};

type ScheduleMode = "quick" | "custom";
type QuickDelay = "15" | "30" | "60";
type DatePreset = "today" | "tomorrow" | "afterTomorrow" | "custom";
type Meridiem = "AM" | "PM";

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [publishMode, setPublishMode] = useState<"now" | "scheduled">("now");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("quick");
  const [quickDelay, setQuickDelay] = useState<QuickDelay>("30");

  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [customDate, setCustomDate] = useState("");
  const [meridiem, setMeridiem] = useState<Meridiem>("PM");
  const [hour, setHour] = useState("8");
  const [minute, setMinute] = useState("00");

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const scheduledDate = useMemo(() => {
    if (publishMode !== "scheduled") return null;

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
    publishMode,
    scheduleMode,
    quickDelay,
    datePreset,
    customDate,
    meridiem,
    hour,
    minute,
  ]);

  function formatDate(value: string | Date | null) {
    if (!value) return "—";

    const date = typeof value === "string" ? new Date(value) : value;

    return date.toLocaleString("zh-MY", {
      timeZone: "Asia/Kuala_Lumpur",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function buttonClass(active: boolean) {
    return `rounded-xl border px-4 py-3 text-left text-sm transition ${
      active
        ? "border-violet-500 bg-violet-500/10 text-violet-200"
        : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
    }`;
  }

  async function writeLog(action: string, targetId?: string, detail?: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("admin_logs").insert({
      admin_id: user.id,
      action,
      target_type: "announcement",
      target_id: targetId ?? null,
      detail: detail ?? null,
    });
  }

  async function fetchAnnouncements() {
    setLoading(true);

    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("读取公告失败。");
      setLoading(false);
      return;
    }

    setAnnouncements((data || []) as Announcement[]);
    setLoading(false);
  }

  async function sendNotificationsToAllProfiles(
    announcementId: string,
    announcementTitle: string,
    announcementContent: string
  ) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id");

    if (profilesError) throw profilesError;

    const notifications = (profiles || []).map((profile: { id: string }) => ({
      user_id: profile.id,
      type: "announcement",
      title: announcementTitle,
      content: announcementContent,
      is_read: false,
      is_starred: false,
      is_important: true,
    }));

    if (notifications.length > 0) {
      const { error } = await supabase
        .from("notifications")
        .insert(notifications);

      if (error) throw error;
    }
  }

  async function createAnnouncement() {
    if (!title.trim() || !content.trim()) {
      alert("请填写公告标题和内容。");
      return;
    }

    if (publishMode === "scheduled") {
      if (!scheduledDate) {
        alert("请选择有效的预约发布时间。");
        return;
      }

      if (scheduledDate <= new Date()) {
        alert("预约发布时间必须晚于现在。");
        return;
      }
    }

    setSubmitting(true);

    try {
      const now = new Date().toISOString();

      const payload: any =
        publishMode === "now"
          ? {
              title: title.trim(),
              content: content.trim(),
              is_active: true,
              publish_mode: "now",
              scheduled_for: null,
              published_at: now,
              sent_at: now,
            }
          : {
              title: title.trim(),
              content: content.trim(),
              is_active: false,
              publish_mode: "scheduled",
              scheduled_for: scheduledDate!.toISOString(),
              published_at: null,
              sent_at: null,
            };

      const { data, error } = await supabase
        .from("announcements")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      if (publishMode === "now") {
        await sendNotificationsToAllProfiles(
          data.id,
          title.trim(),
          content.trim()
        );

        await writeLog(
          "create_announcement_now",
          data.id,
          `立即发布公告：${title.trim()}`
        );
      } else {
        await writeLog(
          "create_announcement_scheduled",
          data.id,
          `预约公告：${title.trim()}，时间：${formatDate(scheduledDate)}`
        );
      }

      setTitle("");
      setContent("");
      setPublishMode("now");
      setScheduleMode("quick");
      setQuickDelay("30");
      setDatePreset("today");
      setCustomDate("");
      setMeridiem("PM");
      setHour("8");
      setMinute("00");

      await fetchAnnouncements();
    } catch (error) {
      console.error(error);
      alert("发布公告失败，请检查 Supabase 字段 / RLS / notifications 表结构。");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleAnnouncement(item: Announcement) {
    const nextActive = !item.is_active;

    const { error } = await supabase
      .from("announcements")
      .update({ is_active: nextActive })
      .eq("id", item.id);

    if (error) {
      console.error(error);
      alert("更新公告状态失败。");
      return;
    }

    await writeLog(
      nextActive ? "open_announcement" : "close_announcement",
      item.id,
      `${nextActive ? "开启" : "关闭"}公告：${item.title}`
    );

    await fetchAnnouncements();
  }

  async function deleteAnnouncement(item: Announcement) {
    const ok = confirm(`确定要删除公告「${item.title}」吗？`);
    if (!ok) return;

    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", item.id);

    if (error) {
      console.error(error);
      alert("删除公告失败。");
      return;
    }

    await writeLog("delete_announcement", item.id, `删除公告：${item.title}`);
    await fetchAnnouncements();
  }

  function getStatusLabel(item: Announcement) {
    if (item.publish_mode === "scheduled" && !item.sent_at) return "已预约";
    if (item.is_active) return "显示中";
    return "已关闭";
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section>
          <p className="text-sm text-zinc-500">Admin / 世界公告</p>
          <h1 className="mt-1 text-2xl font-semibold">世界公告</h1>
          <p className="mt-2 text-sm text-zinc-400">
            立即发布会马上通知所有居民；预约发布会先保存，等待 Cron 自动发布。
          </p>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 shadow-xl">
          <h2 className="text-lg font-medium">发布公告</h2>

          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-zinc-400">标题</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：今晚的世界公告"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-violet-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-400">内容</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="写一点想告诉居民们的话……"
                rows={6}
                className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-violet-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                发布方式
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPublishMode("now")}
                  className={buttonClass(publishMode === "now")}
                >
                  <div className="font-medium">立即发布</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    立即显示，并马上通知所有居民。
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPublishMode("scheduled")}
                  className={buttonClass(publishMode === "scheduled")}
                >
                  <div className="font-medium">预约发布</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    先保存，不马上通知。
                  </div>
                </button>
              </div>
            </div>

            {publishMode === "scheduled" && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <label className="mb-3 block text-sm text-zinc-400">
                  预约发布时间
                </label>

                <div className="grid gap-3 md:grid-cols-3">
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
                    自定义日期时间
                    <div className="mt-1 text-xs text-zinc-500">
                      适合明天、后天、活动公告、维护公告。
                    </div>
                  </button>
                </div>

                {scheduleMode === "custom" && (
                  <div className="mt-4 space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
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
                          className={buttonClass(
                            datePreset === "afterTomorrow"
                          )}
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
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-violet-500"
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
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-violet-500"
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
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-violet-500"
                          />
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-zinc-500">
                        例子：下午 PM + 8 小时 + 30 分钟 = 晚上 8:30。
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
                  <p className="text-xs text-violet-300">预计发布时间</p>
                  <p className="mt-1 text-sm font-medium text-violet-100">
                    {scheduledDate
                      ? `${formatDate(scheduledDate)} 自动发布`
                      : "请选择有效的预约时间"}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">
                    时间显示以马来西亚时间为准。
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={createAnnouncement}
              disabled={submitting}
              className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "处理中..."
                : publishMode === "now"
                  ? "立即发布"
                  : "保存预约公告"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <h2 className="text-lg font-medium">公告列表</h2>

          {loading ? (
            <p className="mt-4 text-sm text-zinc-500">加载中...</p>
          ) : announcements.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">还没有公告。</p>
          ) : (
            <div className="mt-4 space-y-3">
              {announcements.map((item) => {
                const status = getStatusLabel(item);

                return (
                  <article
                    key={item.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 overflow-hidden">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words font-medium text-zinc-100">
                            {item.title}
                          </h3>

                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              status === "显示中"
                                ? "bg-emerald-500/10 text-emerald-300"
                                : status === "已预约"
                                  ? "bg-amber-500/10 text-amber-300"
                                  : "bg-zinc-700/60 text-zinc-300"
                            }`}
                          >
                            {status}
                          </span>
                        </div>

                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-400">
                          {item.content}
                        </p>

                        <div className="mt-3 grid gap-1 text-xs text-zinc-500 md:grid-cols-2">
                          <p>创建时间：{formatDate(item.created_at)}</p>
                          <p>预约时间：{formatDate(item.scheduled_for)}</p>
                          <p>发布时间：{formatDate(item.published_at)}</p>
                          <p>通知时间：{formatDate(item.sent_at)}</p>
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => toggleAnnouncement(item)}
                          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 transition hover:border-violet-500 hover:text-violet-200"
                        >
                          {item.is_active ? "关闭" : "开启"}
                        </button>

                        <button
                          onClick={() => deleteAnnouncement(item)}
                          className="rounded-lg border border-red-900/70 px-3 py-2 text-xs text-red-300 transition hover:border-red-500 hover:text-red-200"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}