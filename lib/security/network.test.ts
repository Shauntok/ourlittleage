import { describe, expect, it } from "vitest";

import {
  NetworkTargetError,
  normalizeFirewallHostname,
  parsePublicNetworkTarget,
} from "./network";

describe("Security Firewall network targets", () => {
  it("normalizes and masks an exact public IPv4 target", () => {
    expect(parsePublicNetworkTarget(" 8.8.8.8 ", "block_ip")).toEqual({
      normalized: "8.8.8.8/32",
      masked: "8.8.x.x/32",
      family: 4,
      prefixLength: 32,
    });
  });

  it("canonicalizes and masks a public IPv4 CIDR", () => {
    expect(parsePublicNetworkTarget("1.1.1.55/24", "block_cidr")).toEqual({
      normalized: "1.1.1.0/24",
      masked: "1.1.x.x/24",
      family: 4,
      prefixLength: 24,
    });
  });

  it("normalizes and masks public IPv6 targets", () => {
    expect(
      parsePublicNetworkTarget("2606:4700:4700::1111", "block_ip")
    ).toEqual({
      normalized: "2606:4700:4700::1111/128",
      masked: "2606:4700:x:x::/128",
      family: 6,
      prefixLength: 128,
    });

    expect(
      parsePublicNetworkTarget("2606:4700:4700:1234::1/48", "block_cidr")
    ).toEqual({
      normalized: "2606:4700:4700::/48",
      masked: "2606:4700:x:x::/48",
      family: 6,
      prefixLength: 48,
    });
  });

  it.each([
    "10.0.0.1",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.1.1",
    "192.0.2.1",
    "192.168.1.1",
    "198.18.0.1",
    "198.51.100.1",
    "203.0.113.1",
    "224.0.0.1",
    "0.0.0.0",
    "::",
    "::1",
    "fc00::1",
    "fe80::1",
    "ff00::1",
    "2001:db8::1",
  ])("rejects non-public or special-use target %s", (target) => {
    expect(() => parsePublicNetworkTarget(target, "block_ip")).toThrow(
      NetworkTargetError
    );
  });

  it("rejects CIDR ranges broader than the approved limits", () => {
    expect(() =>
      parsePublicNetworkTarget("1.1.0.0/16", "block_cidr")
    ).toThrow(NetworkTargetError);
    expect(() =>
      parsePublicNetworkTarget("2606:4700::/32", "block_cidr")
    ).toThrow(NetworkTargetError);
  });

  it("rejects mismatched request kinds and malformed input", () => {
    expect(() =>
      parsePublicNetworkTarget("8.8.8.8/24", "block_ip")
    ).toThrow(NetworkTargetError);
    expect(() =>
      parsePublicNetworkTarget("8.8.8.8", "block_cidr")
    ).toThrow(NetworkTargetError);
    expect(() => parsePublicNetworkTarget("not-an-ip", "block_ip")).toThrow(
      NetworkTargetError
    );
    expect(() => parsePublicNetworkTarget("", "block_ip")).toThrow(
      NetworkTargetError
    );
  });

  it("allows only approved Production hostnames", () => {
    expect(normalizeFirewallHostname(" ourlittleage.com ")).toBe(
      "ourlittleage.com"
    );
    expect(normalizeFirewallHostname("www.ourlittleage.com")).toBe(
      "www.ourlittleage.com"
    );
    expect(() => normalizeFirewallHostname("preview.vercel.app")).toThrow(
      NetworkTargetError
    );
  });
});
