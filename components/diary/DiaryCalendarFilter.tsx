"use client";

import { useState } from "react";

type Diary = {
  published_at: string | null;
  created_at: string;
};

type Props = {
  diaries: Diary[];
  selectedDate: string;
  setSelectedDate: (value: string) => void;
};

function toDateKey(date: string) {
  return new Date(date).toISOString().slice(0, 10);
}

export default function DiaryCalendarFilter({
  diaries,
  selectedDate,
  setSelectedDate,
}: Props) {
  const [open, setOpen] = useState(false);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const daysInMonth = lastDay.getDate();

  const diaryDates = new Set(
    diaries.map((diary) => toDateKey(diary.published_at || diary.created_at))
  );

  const cells = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-2xl">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <p className="text-sm text-white/45">选择日期</p>

          <p className="mt-1 text-xs text-white/25">
            {selectedDate ? selectedDate : "查看某一天留下的记录"}
          </p>
        </div>

        <span className="text-sm text-white/35">
          {open ? "收起" : "展开"}
        </span>
      </button>

      {open && (
        <div className="mt-6">
          <div className="mb-5 flex items-center justify-between">
            <p className="text-lg font-light text-white/75">
              {year}年{month + 1}月
            </p>

            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate("")}
                className="text-xs text-white/35 hover:text-white/70"
              >
                清除
              </button>
            )}
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs text-white/25">
            {["一", "二", "三", "四", "五", "六", "日"].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-7 gap-2">
            {cells.map((day, index) => {
              if (!day) return <div key={index} />;

              const dateKey = new Date(year, month, day)
                .toISOString()
                .slice(0, 10);

              const hasDiary = diaryDates.has(dateKey);
              const active = selectedDate === dateKey;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => hasDiary && setSelectedDate(dateKey)}
                  disabled={!hasDiary}
                  className={`relative flex h-9 items-center justify-center rounded-xl text-sm transition ${
                    active
                      ? "bg-white text-black"
                      : hasDiary
                      ? "border border-cyan-300/40 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
                      : "text-white/15"
                  }`}
                >
                  {day}

                  {hasDiary && !active && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-cyan-300" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}