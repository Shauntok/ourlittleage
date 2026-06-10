"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PrivacySettingsPage() {
  const [loading, setLoading] = useState(true);

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

    if (!user) return;

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

    if (error) {
      alert("保存失败：" + error.message);
      return;
    }

    alert("隐私设置已保存 🌙");
  }

  if (loading) {
    return <div className="text-white/40">正在读取隐私设置...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-xs tracking-[0.35em] text-white/25">PRIVACY</p>

      <h1 className="mt-4 text-5xl font-light">隐私设置</h1>

      <p className="mt-6 max-w-2xl text-sm leading-7 text-white/40">
        控制别人访问你的房间时，可以看到哪些成长资料。
      </p>

      <div className="mt-12 space-y-5">
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
        />
      </div>

      <button
        onClick={saveSettings}
        className="
          mt-10 rounded-full
          bg-white px-8 py-4
          text-sm font-medium text-black
          transition hover:bg-white/90
        "
      >
        保存设置
      </button>
    </div>
  );
}

function PrivacyItem({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div
      className="
        flex items-center justify-between gap-6
        rounded-[2rem]
        border border-white/10
        bg-white/[0.03]
        p-6
      "
    >
      <div>
        <h3 className="text-lg font-light">{title}</h3>

        <p className="mt-2 text-sm text-white/40">{description}</p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`
          relative h-8 w-16 shrink-0 rounded-full transition
          ${checked ? "bg-violet-500" : "bg-zinc-700"}
        `}
      >
        <span
          className={`
            absolute top-1 h-6 w-6 rounded-full bg-white transition
            ${checked ? "left-9" : "left-1"}
          `}
        />
      </button>
    </div>
  );
}