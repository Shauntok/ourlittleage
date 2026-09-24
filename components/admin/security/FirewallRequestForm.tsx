"use client";

import { ExternalLink, ShieldPlus } from "lucide-react";
import { FormEvent, useRef, useState } from "react";

import type { FirewallRequest } from "@/lib/security/firewall";
import {
  normalizeFirewallHostname,
  parsePublicNetworkTarget,
} from "@/lib/security/network";

type Props = {
  activeBlocks: FirewallRequest[];
  onCreated: () => void | Promise<void>;
};

type RequestType = FirewallRequest["requestType"];

export default function FirewallRequestForm({ activeBlocks, onCreated }: Props) {
  const [requestType, setRequestType] = useState<RequestType>("block_ip");
  const [target, setTarget] = useState("");
  const [hostnameScope, setHostnameScope] = useState("www.ourlittleage.com");
  const [relatedRequestId, setRelatedRequestId] = useState("");
  const [pathMatchMode, setPathMatchMode] = useState<"exact" | "prefix">("prefix");
  const [pathPattern, setPathPattern] = useState("/api/");
  const [httpMethod, setHttpMethod] = useState("POST");
  const [windowSeconds, setWindowSeconds] = useState(60);
  const [requestThreshold, setRequestThreshold] = useState(500);
  const [proposedFollowupAction, setProposedFollowupAction] = useState<
    "rate_limit" | "challenge" | "deny"
  >("rate_limit");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const requestIdRef = useRef<string | null>(null);

  function resetRequestIdentity() {
    requestIdRef.current = null;
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedReason = reason.trim();
    if (!normalizedReason || normalizedReason.length > 500) {
      requestIdRef.current = null;
      setError("请填写 1 至 500 字的操作原因。");
      return;
    }

    let body: Record<string, unknown>;
    try {
      if (requestType === "block_ip" || requestType === "block_cidr") {
        parsePublicNetworkTarget(target, requestType);
        normalizeFirewallHostname(hostnameScope);
        body = { requestType, target: target.trim(), hostnameScope, reason: normalizedReason };
      } else if (requestType === "unblock") {
        if (!relatedRequestId) throw new Error("missing related request");
        body = { requestType, relatedRequestId, reason: normalizedReason };
      } else {
        const normalizedPath = pathPattern.trim();
        if (
          !/^\/(?!\/)/.test(normalizedPath) ||
          normalizedPath.includes("?") ||
          normalizedPath.includes("#")
        ) {
          throw new Error("invalid path");
        }
        body = {
          requestType,
          pathMatchMode,
          pathPattern: normalizedPath,
          httpMethod,
          windowSeconds,
          requestThreshold,
          proposedFollowupAction,
          reason: normalizedReason,
        };
      }
    } catch {
      requestIdRef.current = null;
      setError(
        requestType === "block_ip" || requestType === "block_cidr"
          ? "请输入有效的公开网络目标，并确认范围没有过宽。"
          : requestType === "unblock"
            ? "请选择要解除的现有防护单。"
            : "请检查路径、方法、观察时长与请求数量。"
      );
      return;
    }

    const requestId = requestIdRef.current || crypto.randomUUID();
    requestIdRef.current = requestId;
    setPending(true);

    try {
      const response = await fetch("/api/admin/security/firewall", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, requestId }),
      });
      if (!response.ok) {
        if (response.status < 500) requestIdRef.current = null;
        throw new Error("request failed");
      }

      requestIdRef.current = null;
      setTarget("");
      setReason("");
      await onCreated();
    } catch {
      setError("防护单暂时无法建立，请重试。");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 border-t border-zinc-800 pt-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-black text-zinc-300">
          <ShieldPlus aria-hidden="true" className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-medium text-zinc-200">准备人工防护单</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-600">
            这里只记录准备与确认状态，不会自动更改 Vercel 规则。
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="防护类型">
          <select
            aria-label="防护类型"
            value={requestType}
            onChange={(event) => {
              setRequestType(event.target.value as RequestType);
              resetRequestIdentity();
            }}
            className={inputClass}
          >
            <option value="block_ip">封锁单一 IP</option>
            <option value="block_cidr">封锁 CIDR 范围</option>
            <option value="unblock">解除现有防护</option>
            <option value="rate_limit_observation">流量限制观察</option>
          </select>
        </Field>

        {(requestType === "block_ip" || requestType === "block_cidr") && (
          <>
            <Field label="网络目标">
              <input
                aria-label="网络目标"
                value={target}
                onChange={(event) => {
                  setTarget(event.target.value);
                  resetRequestIdentity();
                }}
                placeholder={requestType === "block_ip" ? "8.8.8.8" : "1.1.1.0/24"}
                className={inputClass}
              />
            </Field>
            <Field label="站点范围">
              <select
                aria-label="站点范围"
                value={hostnameScope}
                onChange={(event) => {
                  setHostnameScope(event.target.value);
                  resetRequestIdentity();
                }}
                className={inputClass}
              >
                <option value="www.ourlittleage.com">www.ourlittleage.com</option>
                <option value="ourlittleage.com">ourlittleage.com</option>
              </select>
            </Field>
          </>
        )}

        {requestType === "unblock" && (
          <Field label="现有防护单">
            <select
              aria-label="现有防护单"
              value={relatedRequestId}
              onChange={(event) => {
                setRelatedRequestId(event.target.value);
                resetRequestIdentity();
              }}
              className={inputClass}
            >
              <option value="">请选择</option>
              {activeBlocks.map((request) => (
                <option key={request.id} value={request.id}>
                  {request.targetMasked || request.targetReference}
                </option>
              ))}
            </select>
          </Field>
        )}

        {requestType === "rate_limit_observation" && (
          <>
            <Field label="路径范围">
              <input
                aria-label="路径范围"
                value={pathPattern}
                onChange={(event) => {
                  setPathPattern(event.target.value);
                  resetRequestIdentity();
                }}
                className={inputClass}
              />
            </Field>
            <Field label="匹配方式">
              <select
                aria-label="匹配方式"
                value={pathMatchMode}
                onChange={(event) => {
                  setPathMatchMode(event.target.value as "exact" | "prefix");
                  resetRequestIdentity();
                }}
                className={inputClass}
              >
                <option value="prefix">路径前缀</option>
                <option value="exact">完全一致</option>
              </select>
            </Field>
            <Field label="HTTP 方法">
              <select
                aria-label="HTTP 方法"
                value={httpMethod}
                onChange={(event) => {
                  setHttpMethod(event.target.value);
                  resetRequestIdentity();
                }}
                className={inputClass}
              >
                {["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"].map(
                  (method) => <option key={method}>{method}</option>
                )}
              </select>
            </Field>
            <Field label="观察秒数">
              <input
                aria-label="观察秒数"
                type="number"
                min={10}
                max={3600}
                value={windowSeconds}
                onChange={(event) => {
                  setWindowSeconds(Number(event.target.value));
                  resetRequestIdentity();
                }}
                className={inputClass}
              />
            </Field>
            <Field label="请求数量">
              <input
                aria-label="请求数量"
                type="number"
                min={10}
                max={100000}
                value={requestThreshold}
                onChange={(event) => {
                  setRequestThreshold(Number(event.target.value));
                  resetRequestIdentity();
                }}
                className={inputClass}
              />
            </Field>
            <Field label="后续建议">
              <select
                aria-label="后续建议"
                value={proposedFollowupAction}
                onChange={(event) => {
                  setProposedFollowupAction(
                    event.target.value as "rate_limit" | "challenge" | "deny"
                  );
                  resetRequestIdentity();
                }}
                className={inputClass}
              >
                <option value="rate_limit">限制频率</option>
                <option value="challenge">发起验证</option>
                <option value="deny">拒绝请求</option>
              </select>
            </Field>
          </>
        )}
      </div>

      <Field label="原因" full>
        <textarea
          aria-label="原因"
          value={reason}
          maxLength={500}
          onChange={(event) => {
            setReason(event.target.value);
            resetRequestIdentity();
          }}
          rows={3}
          className={inputClass}
        />
      </Field>

      <div className="mt-4 rounded-lg border border-zinc-800 bg-black/40 p-4 text-xs leading-6 text-zinc-500">
        <p className="font-medium text-zinc-300">Owner 人工确认</p>
        <p>发布位置：Vercel Firewall</p>
        <p>系统只保存受控防护单；实际规则与实时流量仍以 Vercel 为准。</p>
        <a
          href="https://vercel.com/dashboard"
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-2 text-zinc-300 hover:text-white"
        >
          打开 Vercel Dashboard
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
        </a>
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-zinc-700 bg-zinc-100 px-4 py-2 text-sm font-medium text-black transition hover:bg-white disabled:opacity-50"
        >
          {pending ? "正在建立..." : "建立防护单"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  full = false,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`${full ? "mt-4 block" : "block"} text-xs text-zinc-500`}>
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "min-h-10 w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-zinc-600";
