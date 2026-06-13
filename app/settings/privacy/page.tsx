"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PrivacySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showLevel, setShowLevel] = useState(true);
  const [showExp, setShowExp] = useState(true);
  const [showTrust, setShowTrust] = useState(true);
  const [showJoinedDays, setShowJoinedDays] = useState(true);
  const [showBadges, setShowBadges] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select(
        `
          show_level,
          show_exp,
          show_trust_score,
          show_joined_days,
          show_badges
        `
      )
      .eq("id", user.id)
      .single();

    if (data) {
      setShowLevel(data.show_level ?? true);
      setShowExp(data.show_exp ?? true);
      setShowTrust(data.show_trust_score ?? true);
      setShowJoinedDays(data.show_joined_days ?? true);
      setShowBadges(data.show_badges ?? true);
    }

    setLoading(false);
  }

  async function saveSettings() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        show_level: showLevel,
        show_exp: showExp,
        show_trust_score: showTrust,
        show_joined_days: showJoinedDays,
        show_badges: showBadges,
      })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      alert("保存失败：" + error.message);
      return;
    }

    alert("隐私设置已保存 🌙");
  }

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 text-sm text-white/40">
        正在读取隐私设置...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-xs tracking-[0.35em] text-white/25">PRIVACY</p>

      <h1 className="mt-4 text-4xl font-light tracking-tight md:text-5xl">
        隐私设置
      </h1>

      <p className="mt-5 max-w-2xl text-sm leading-7 text-white/40 md:mt-6">
        控制别人访问你的房间时，可以看到哪些成长资料。
      </p>

      <section className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-2xl md:mt-12 md:rounded-[2.4rem]">
        <PrivacyItem
          title="显示等级"
          description="允许其他居民查看你的等级。"
          checked={showLevel}
          onChange={setShowLevel}
        />

        <PrivacyItem
          title="显示留下的光"
          description="允许其他居民查看你的成长值。"
          checked={showExp}
          onChange={setShowExp}
        />

        <PrivacyItem
          title="显示社区信任"
          description="允许其他居民查看你的社区信任。"
          checked={showTrust}
          onChange={setShowTrust}
        />

        <PrivacyItem
          title="显示徽章"
          description="允许其他居民查看你获得过的徽章。"
          checked={showBadges}
          onChange={setShowBadges}
        />

        <PrivacyItem
          title="显示居住天数"
          description="允许其他居民查看你来到小时代多久了。"
          checked={showJoinedDays}
          onChange={setShowJoinedDays}
          isLast
        />
      </section>

      <button
        type="button"
        onClick={saveSettings}
        disabled={saving}
        className="
          mt-8 w-full rounded-full bg-white px-8 py-4
          text-sm font-medium text-black transition hover:bg-white/90
          disabled:cursor-not-allowed disabled:opacity-40
          md:w-auto
        "
      >
        {saving ? "保存中..." : "保存设置"}
      </button>
    </div>
  );
}

function PrivacyItem({
  title,
  description,
  checked,
  onChange,
  isLast = false,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <div
      className={`
        flex items-center justify-between gap-4
        px-5 py-5 transition hover:bg-white/[0.025]
        md:gap-6 md:px-7 md:py-6
        ${isLast ? "" : "border-b border-white/10"}
      `}
    >
      <div className="min-w-0">
        <h3 className="text-base font-light text-white/90 md:text-lg">
          {title}
        </h3>

        <p className="mt-2 text-sm leading-6 text-white/35">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`
          relative h-8 w-14 shrink-0 rounded-full transition
          md:w-16
          ${checked ? "bg-violet-500" : "bg-zinc-700"}
        `}
        aria-pressed={checked}
      >
        <span
          className={`
            absolute top-1 h-6 w-6 rounded-full bg-white transition
            ${checked ? "left-7 md:left-9" : "left-1"}
          `}
        />
      </button>
    </div>
  );
}