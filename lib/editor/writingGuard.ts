export type WritingAction = "publish" | "draft";

export function isBlockedFromWriting(status: string | undefined) {
  return status === "banned" || status === "muted";
}

export function getWritingBlockMessage(
  status: string | undefined,
  action: WritingAction
) {
  if (status === "banned") {
    return action === "draft"
      ? "你的账号已被封禁，无法保存草稿。"
      : "你的账号已被封禁，无法发布内容。";
  }

  if (status === "muted") {
    return action === "draft"
      ? "你目前已被禁言，暂时无法保存草稿。"
      : "你目前已被禁言，暂时无法发布内容。";
  }

  return null;
}