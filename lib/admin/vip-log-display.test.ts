import { describe, expect, it } from "vitest";

import { getVipLogPresentation } from "./vip-log-display";

describe("getVipLogPresentation", () => {
  it.each([
    ["vip_grant", "授予 VIP"],
    ["vip_extend", "延长 VIP"],
    ["vip_cancel_period_end", "设为到期取消"],
    ["vip_revoke", "立即撤销 VIP"],
  ])("presents %s as a readable admin action", (action, label) => {
    expect(
      getVipLogPresentation(
        action,
        JSON.stringify({ reason: "Manual review", request_id: "secret-internal-id" })
      )
    ).toMatchObject({ label, details: "原因：Manual review" });
  });

  it("does not expose malformed raw JSON or intercept unrelated actions", () => {
    expect(getVipLogPresentation("vip_grant", "{broken"))
      .toMatchObject({ details: "VIP 会员状态已更新。" });
    expect(getVipLogPresentation("update_role", "role changed")).toBeNull();
  });
});
