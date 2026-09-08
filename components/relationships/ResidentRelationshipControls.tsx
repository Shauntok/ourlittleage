"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCw, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  cancelFollowRequest,
  followUser,
  getPublicRelationshipSummary,
  getResidentRelationshipState,
  unfollowUser,
} from "@/app/actions/relationships";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { supabase } from "@/lib/supabase";
import type { RelationshipStatus } from "@/lib/relationships/service";

type ResidentRelationshipControlsProps = {
  residentId: string;
  username: string;
};

type RelationshipState = {
  outboundStatus: RelationshipStatus | null;
  inboundStatus: RelationshipStatus | null;
  isFollowing: boolean;
  isMutual: boolean;
};

type Summary = {
  followersCount: number;
  followingCount: number;
};

type PendingChange = "cancel" | "unfollow" | null;

async function readRelationshipData(residentId: string) {
  const [summarySettled, authSettled] = await Promise.allSettled([
    getPublicRelationshipSummary(residentId),
    supabase.auth.getUser(),
  ]);
  const summaryResult =
    summarySettled.status === "fulfilled"
      ? summarySettled.value
      : {
          ok: false as const,
          error: "关系资料暂时无法读取。",
        };
  const authResult =
    authSettled.status === "fulfilled" ? authSettled.value : null;
  const userId =
    authResult && !authResult.error ? authResult.data.user?.id || null : null;
  let stateResult = null;

  if (userId && userId !== residentId) {
    try {
      stateResult = await getResidentRelationshipState(residentId);
    } catch {
      stateResult = {
        ok: false as const,
        error: "关系资料暂时无法读取。",
      };
    }
  }

  return { summaryResult, stateResult, userId };
}

export default function ResidentRelationshipControls({
  residentId,
  username,
}: ResidentRelationshipControlsProps) {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [relationship, setRelationship] = useState<RelationshipState | null>(
    null
  );
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [readError, setReadError] = useState("");
  const [mutationError, setMutationError] = useState("");
  const [pendingChange, setPendingChange] = useState<PendingChange>(null);

  const applyData = useCallback(({
    summaryResult,
    stateResult,
    userId,
  }: Awaited<ReturnType<typeof readRelationshipData>>) => {
    let nextReadError = "";
    if (summaryResult.ok) {
      setSummary(summaryResult.summary);
    } else {
      nextReadError = summaryResult.error;
    }

    setViewerId(userId);
    if (stateResult) {
      if (stateResult.ok) {
        setRelationship(stateResult.state);
      } else {
        nextReadError = stateResult.error;
      }
    } else {
      setRelationship(null);
    }

    setReadError(nextReadError);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    void readRelationshipData(residentId).then((data) => {
      if (active) applyData(data);
    });
    return () => {
      active = false;
    };
  }, [applyData, residentId]);

  function refresh() {
    setLoading(true);
    setReadError("");
    void readRelationshipData(residentId).then(applyData);
  }

  async function runMutation(
    operation: (targetId: string) => Promise<{ ok: boolean; error?: string }>
  ) {
    if (mutationLoading) return;

    setMutationLoading(true);
    setMutationError("");
    try {
      const result = await operation(residentId);

      if (!result.ok) {
        setPendingChange(null);
        setMutationError(result.error || "关系操作暂时无法完成。");
        return;
      }

      setPendingChange(null);
      setLoading(true);
      setReadError("");
      applyData(await readRelationshipData(residentId));
    } catch {
      setPendingChange(null);
      setMutationError("关系操作暂时无法完成。");
    } finally {
      setMutationLoading(false);
    }
  }

  function handleRelationshipClick() {
    if (mutationLoading) return;

    if (!viewerId) {
      const roomPath = `/u/${username}`;
      router.push(`/?returnTo=${encodeURIComponent(roomPath)}`);
      return;
    }

    if (relationship?.outboundStatus === "pending") {
      setPendingChange("cancel");
      return;
    }

    if (relationship?.outboundStatus === "accepted") {
      setPendingChange("unfollow");
      return;
    }

    void runMutation(followUser);
  }

  const isOwner = viewerId === residentId;
  const buttonState = relationship?.outboundStatus;
  const buttonText =
    buttonState === "pending"
      ? "等待回应"
      : buttonState === "accepted"
        ? relationship?.isMutual
          ? "互相关注"
          : "已关注"
        : "关注";
  const buttonLabel =
    buttonState === "pending"
      ? `取消对${username}的关注申请`
      : buttonState === "accepted"
        ? `取消关注${username}`
        : `关注${username}`;

  return (
    <div
      data-testid="relationship-controls"
      className="min-h-11 max-w-xl"
    >
      {loading ? (
        <div
          aria-label="正在读取关系资料"
          className="flex h-11 items-center gap-3 text-sm text-white/30"
        >
          <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
          <span>正在听见房间里的回声...</span>
        </div>
      ) : (
        <div className="flex min-h-11 flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex h-11 items-center gap-5 text-sm text-white/45">
            <span className="min-w-[76px] whitespace-nowrap">
              关注中 {summary?.followingCount ?? "--"}
            </span>
            <span className="min-w-[76px] whitespace-nowrap">
              关注者 {summary?.followersCount ?? "--"}
            </span>
          </div>

          {readError ? (
            <button
              type="button"
              aria-label="重新读取关系资料"
              onClick={refresh}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 text-xs text-white/45 transition hover:border-white/20 hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
              {readError}
            </button>
          ) : !isOwner ? (
            <button
              type="button"
              aria-label={buttonLabel}
              onClick={handleRelationshipClick}
              disabled={mutationLoading}
              className="inline-flex h-11 min-w-[104px] items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.055] px-4 text-sm text-white/70 transition hover:border-white/25 hover:bg-white/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:cursor-wait disabled:opacity-50"
            >
              {mutationLoading ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin"
                />
              ) : (
                <UserPlus aria-hidden="true" className="h-4 w-4" />
              )}
              <span>{mutationLoading ? "处理中..." : buttonText}</span>
            </button>
          ) : null}
        </div>
      )}

      {mutationError && (
        <p role="status" className="mt-2 text-xs text-rose-200/65">
          {mutationError}
        </p>
      )}

      <ConfirmDialog
        open={pendingChange === "cancel"}
        title="取消关注申请？"
        description="这份等待会被收回。之后仍然可以重新提出关注。"
        confirmText="取消申请"
        loading={mutationLoading}
        onConfirm={() => void runMutation(cancelFollowRequest)}
        onCancel={() => setPendingChange(null)}
      />

      <ConfirmDialog
        open={pendingChange === "unfollow"}
        title="取消关注？"
        description={`你将不再关注${username}，对方是否关注你不会受到影响。`}
        confirmText="取消关注"
        loading={mutationLoading}
        onConfirm={() => void runMutation(unfollowUser)}
        onCancel={() => setPendingChange(null)}
      />
    </div>
  );
}
