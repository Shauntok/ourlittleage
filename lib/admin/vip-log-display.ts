type VipLogPresentation = {
  label: string;
  color: string;
  icon: string;
  details: string;
};

const actions: Record<string, string> = {
  vip_grant: "授予 VIP",
  vip_extend: "延长 VIP",
  vip_cancel_period_end: "设为到期取消",
  vip_revoke: "立即撤销 VIP",
};

export function getVipLogPresentation(
  action: string,
  rawDetails: string | null | undefined
): VipLogPresentation | null {
  const label = actions[action];
  if (!label) return null;

  return {
    label,
    color: "bg-amber-500/10 text-amber-200 border-amber-500/25",
    icon: "VIP",
    details: readReason(rawDetails),
  };
}

function readReason(rawDetails: string | null | undefined) {
  if (!rawDetails) return "VIP 会员状态已更新。";

  try {
    const value = JSON.parse(rawDetails) as unknown;
    if (
      value &&
      typeof value === "object" &&
      typeof (value as Record<string, unknown>).reason === "string"
    ) {
      const reason = (value as Record<string, string>).reason.trim();
      if (reason) return `原因：${reason}`;
    }
  } catch {
    // Older or malformed internal rows use the safe summary below.
  }

  return "VIP 会员状态已更新。";
}
