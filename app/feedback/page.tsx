"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function FeedbackPage() {
  const [type, setType] = useState("suggestion");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submitFeedback() {
    if (sending) return;

    if (!title.trim()) {
      alert("请输入反馈标题。");
      return;
    }

    if (!content.trim()) {
      alert("请输入反馈内容。");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("请先登录。");
      return;
    }

    setSending(true);
    setSubmitted(false);

    const { error } = await supabase.from("feedbacks").insert([
      {
        user_id: user.id,
        type,
        title: title.trim(),
        content: content.trim(),
        status: "pending",
      },
    ]);

    setSending(false);

    if (error) {
      alert(error.message);
      return;
    }

    setTitle("");
    setContent("");
    setType("suggestion");
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-5 pb-24 pt-24 text-white md:px-6 md:pt-28">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-black via-zinc-950 to-black" />
      <div className="pointer-events-none fixed left-1/2 top-1/3 -z-10 hidden h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl md:block" />

      <div className="mx-auto max-w-3xl space-y-8">
        <section>
          <p className="text-xs tracking-[0.35em] text-white/25 md:tracking-[0.4em]">
            FEEDBACK
          </p>

          <h1 className="mt-3 text-4xl font-light tracking-tight md:mt-5 md:text-6xl">
            意见反馈
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-7 text-white/40 md:mt-6 md:leading-8">
            如果你遇到 Bug、觉得哪里不好用，或者有想要的功能，都可以写在这里。
          </p>
        </section>

        {submitted && (
          <section className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/[0.08] p-5 text-sm leading-7 text-emerald-100/75 backdrop-blur-2xl md:rounded-[2.4rem] md:p-6">
            <p className="font-medium text-emerald-100">
              💌 反馈已送出
            </p>

            <p className="mt-2 text-emerald-100/65">
              谢谢你帮我们把小时代变得更好。
            </p>
          </section>
        )}

        <section className="space-y-5 rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-2xl md:rounded-[2.4rem] md:p-7">
          <div>
            <label className="mb-2 block text-sm text-white/45">
              反馈类型
            </label>

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-4 text-sm text-white outline-none transition focus:border-white/30"
            >
              <option value="bug">🐛 Bug 反馈</option>
              <option value="suggestion">💡 功能建议</option>
              <option value="experience">🌙 使用体验</option>
              <option value="report">🚨 投诉举报</option>
              <option value="other">📦 其他</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/45">
              反馈标题
            </label>

            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setSubmitted(false);
              }}
              placeholder="例如：手机版信箱按钮有点挤"
              className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/30"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/45">
              详细内容
            </label>

            <textarea
              rows={8}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setSubmitted(false);
              }}
              placeholder="把你看到的问题、建议或想法写下来……"
              className="safe-pre w-full resize-none rounded-2xl border border-white/10 bg-black/50 px-4 py-4 text-sm leading-8 text-white outline-none transition placeholder:text-white/25 focus:border-white/30"
            />
          </div>

          <button
            type="button"
            onClick={submitFeedback}
            disabled={sending}
            className="w-full rounded-full bg-white px-6 py-4 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sending ? "提交中..." : "提交反馈"}
          </button>
        </section>
      </div>
    </main>
  );
}