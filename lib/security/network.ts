import ipaddr from "ipaddr.js";

export type FirewallHostname =
  | "ourlittleage.com"
  | "www.ourlittleage.com";

export type ParsedNetworkTarget = {
  normalized: string;
  masked: string;
  family: 4 | 6;
  prefixLength: number;
};

export class NetworkTargetError extends Error {
  constructor() {
    super("Invalid network target");
    this.name = "NetworkTargetError";
  }
}

const allowedHosts = new Set<FirewallHostname>([
  "ourlittleage.com",
  "www.ourlittleage.com",
]);

const minimumPrefix = { 4: 24, 6: 48 } as const;

export function parsePublicNetworkTarget(
  input: string,
  kind: "block_ip" | "block_cidr"
): ParsedNetworkTarget {
  try {
    const trimmed = input.trim();
    const hasPrefix = trimmed.includes("/");

    if (
      !trimmed ||
      trimmed.includes("%") ||
      (kind === "block_ip" && hasPrefix) ||
      (kind === "block_cidr" && !hasPrefix)
    ) {
      throw new NetworkTargetError();
    }

    const [parsedAddress, parsedPrefix] = hasPrefix
      ? ipaddr.parseCIDR(trimmed)
      : [ipaddr.parse(trimmed), undefined];
    const family = parsedAddress.kind() === "ipv4" ? 4 : 6;
    const prefixLength = parsedPrefix ?? (family === 4 ? 32 : 128);

    if (parsedAddress.range() !== "unicast") {
      throw new NetworkTargetError();
    }
    if (kind === "block_cidr" && prefixLength < minimumPrefix[family]) {
      throw new NetworkTargetError();
    }

    const address = hasPrefix
      ? family === 4
        ? ipaddr.IPv4.networkAddressFromCIDR(trimmed)
        : ipaddr.IPv6.networkAddressFromCIDR(trimmed)
      : parsedAddress;

    return {
      normalized: `${address.toString()}/${prefixLength}`,
      masked: maskAddress(address, prefixLength),
      family,
      prefixLength,
    };
  } catch (error) {
    if (error instanceof NetworkTargetError) throw error;
    throw new NetworkTargetError();
  }
}

export function normalizeFirewallHostname(input: string): FirewallHostname {
  const hostname = input.trim().toLowerCase() as FirewallHostname;

  if (!allowedHosts.has(hostname)) {
    throw new NetworkTargetError();
  }

  return hostname;
}

function maskAddress(
  address: ipaddr.IPv4 | ipaddr.IPv6,
  prefixLength: number
) {
  const bytes = address.toByteArray();

  if (address.kind() === "ipv4") {
    return `${bytes[0]}.${bytes[1]}.x.x/${prefixLength}`;
  }

  const first = ((bytes[0] << 8) | bytes[1]).toString(16);
  const second = ((bytes[2] << 8) | bytes[3]).toString(16);
  return `${first}:${second}:x:x::/${prefixLength}`;
}
