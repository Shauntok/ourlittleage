"use client";

import { useCallback, useEffect, useState } from "react";
import { setFollowMode } from "@/app/actions/relationships";
import { supabase } from "@/lib/supabase";
import type { FollowMode } from "@/lib/relationships/service";

type PrivacySettings = {
  showLevel: boolean;
  showExp: boolean;
  showTrust: boolean;
  showJoinedDays: boolean;
  showBadges: boolean;
  followMode: FollowMode;
};

function normalizeFollowMode(value: unknown): FollowMode {
  return value === "approval_required" ? "approval_required" : "open";
}

async function readSettings(): Promise<PrivacySettings | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select(
      `
        show_level,
        show_exp,
        show_trust_score,
        show_joined_days,
        show_badges,
        follow_mode
      `
    )
    .eq("id", user.id)
    .single();

  if (!data) return null;
  return {
    showLevel: data.show_level ?? true,
    showExp: data.show_exp ?? true,
    showTrust: data.show_trust_score ?? true,
    showJoinedDays: data.show_joined_days ?? true,
    showBadges: data.show_badges ?? true,
    followMode: normalizeFollowMode(data.follow_mode),
  };
}

export default function PrivacySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showLevel, setShowLevel] = useState(true);
  const [showExp, setShowExp] = useState(true);
  const [showTrust, setShowTrust] = useState(true);
  const [showJoinedDays, setShowJoinedDays] = useState(true);
  const [showBadges, setShowBadges] = useState(true);
  const [followMode, setCurrentFollowMode] = useState<FollowMode>("open");
  const [initialFollowMode, setInitialFollowMode] = useState<FollowMode>("open");

  const [message, setMessage] = useState("");

  const applySettings = useCallback((data: PrivacySettings | null) => {
    if (data) {
      setShowLevel(data.showLevel);
      setShowExp(data.showExp);
      setShowTrust(data.showTrust);
      setShowJoinedDays(data.showJoinedDays);
      setShowBadges(data.showBadges);
      setCurrentFollowMode(data.followMode);
      setInitialFollowMode(data.followMode);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    void readSettings().then((data) => {
      if (active) applySettings(data);
    });
    return () => {
      active = false;
    };
  }, [applySettings]);

  function showToast(text: string) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 4200);
  }

  async function saveSettings() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setSaving(true);

    const [profileResult, followResult] = await Promise.allSettled([
      supabase
        .from("profiles")
        .update({
          show_level: showLevel,
          show_exp: showExp,
          show_trust_score: showTrust,
          show_joined_days: showJoinedDays,
          show_badges: showBadges,
        })
        .eq("id", user.id),
      followMode === initialFollowMode
        ? Promise.resolve({ ok: true as const })
        : setFollowMode(followMode),
    ]);

    const profileFailed =
      profileResult.status === "rejected" || Boolean(profileResult.value.error);
    const followFailed =
      followResult.status === "rejected" || !followResult.value.ok;

    if (profileFailed || followFailed) {
      applySettings(await readSettings());
      setSaving(false);
      showToast("部分设置未能保存，已重新读取当前状态。");
      return;
    }

    setInitialFollowMode(followMode);
    setSaving(false);
    showToast("隐私设置已保存。");
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
      {message && (
        <div
          role="status"
          className="mb-6 rounded-[1.5rem] border border-violet-500/20 bg-violet-500/[0.08] px-5 py-4 text-sm text-violet-100 backdrop-blur-2xl"
        >
          {message}
        </div>
      )}

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

      <fieldset className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl md:mt-8 md:rounded-[2.4rem] md:p-7">
        <legend className="px-1 text-lg font-light text-white/90">
          关注方式
        </legend>
        <div role="radiogroup" aria-label="关注方式" className="mt-4 grid gap-3 sm:grid-cols-2">
          <FollowModeOption
            title="任何居民可关注"
            description="新的关注会立即生效。"
            selected={followMode === "open"}
            onSelect={() => setCurrentFollowMode("open")}
          />
          <FollowModeOption
            title="关注需要批准"
            description="新的关注会先等待你的同意。"
            selected={followMode === "approval_required"}
            onSelect={() => setCurrentFollowMode("approval_required")}
          />
        </div>
      </fieldset>

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
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={`
          relative h-11 w-16 shrink-0 rounded-full transition
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50
          ${checked ? "bg-violet-500" : "bg-zinc-700"}
        `}
        aria-pressed={checked}
      >
        <span
          className={`
            absolute top-2 h-7 w-7 rounded-full bg-white transition
            ${checked ? "left-7" : "left-2"}
          `}
        />
      </button>
    </div>
  );
}

function FollowModeOption({
  title,
  description,
  selected,
  onSelect,
}: {
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={title}
      onClick={onSelect}
      className={`min-h-[88px] rounded-lg border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
        selected
          ? "border-white/25 bg-white/[0.08]"
          : "border-white/[0.08] bg-black/10 hover:border-white/15 hover:bg-white/[0.04]"
      }`}
    >
      <span className="block text-sm font-medium text-white/85">{title}</span>
      <span className="mt-1.5 block text-xs leading-5 text-white/35">
        {description}
      </span>
    </button>
  );
}
