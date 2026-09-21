/**
 * Pure IPv4 subnet calculator — powers the free /tools/subnet-calculator page.
 * Reuses the IP-math primitives from the subnetting drill engine so the two
 * tools can never disagree. No side effects; fully unit-tested.
 */
import {
  ipToInt,
  intToIp,
  maskFromPrefix,
  networkOf,
  broadcastOf,
} from "@/lib/tools/subnetting";

export interface SubnetResult {
  /** Normalised input IP (leading zeros stripped). */
  ip: string;
  prefix: number;
  mask: string;
  wildcard: string;
  maskBinary: string;
  network: string;
  /** "—" for /31 and /32, where there is no broadcast address. */
  broadcast: string;
  firstHost: string;
  lastHost: string;
  hostRange: string;
  usableHosts: number;
  totalAddresses: number;
  ipClass: string;
  addressType: string;
  /** Network address in CIDR form, e.g. "192.168.1.0/24". */
  cidr: string;
}

const OCTET = /^(25[0-5]|2[0-4]\d|1?\d?\d)$/;

/** Parse & validate a dotted IPv4 string. Returns the four octets, or null. */
export function parseIpv4(raw: string): number[] | null {
  const parts = raw.trim().split(".");
  if (parts.length !== 4) return null;
  if (!parts.every((p) => OCTET.test(p))) return null;
  return parts.map(Number);
}

function classify(octets: number[]): { ipClass: string; addressType: string } {
  const [a, b] = octets;
  const first = a;

  let ipClass: string;
  if (first >= 240) ipClass = "E";
  else if (first >= 224) ipClass = "D";
  else if (first >= 192) ipClass = "C";
  else if (first >= 128) ipClass = "B";
  else ipClass = "A";

  let addressType = "Public";
  if (a === 10) addressType = "Private";
  else if (a === 172 && b >= 16 && b <= 31) addressType = "Private";
  else if (a === 192 && b === 168) addressType = "Private";
  else if (a === 127) addressType = "Loopback";
  else if (a === 169 && b === 254) addressType = "Link-local (APIPA)";
  else if (first >= 224 && first <= 239) addressType = "Multicast";
  else if (first >= 240) addressType = "Reserved";
  else if (a === 0) addressType = "Reserved";

  return { ipClass, addressType };
}

function maskBinary(mask: string): string {
  return mask
    .split(".")
    .map((o) => Number(o).toString(2).padStart(8, "0"))
    .join(".");
}

/** Compute every subnet fact for an IP + prefix. Returns null on bad input. */
export function calculateSubnet(ipRaw: string, prefix: number): SubnetResult | null {
  const octets = parseIpv4(ipRaw);
  if (!octets) return null;
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;

  const ip = intToIp(ipToInt(octets.join("."))); // normalised
  const ipInt = ipToInt(ip);
  const netInt = networkOf(ipInt, prefix);
  const bcInt = broadcastOf(ipInt, prefix);
  const mask = maskFromPrefix(prefix);
  const wildcard = intToIp(~ipToInt(mask) >>> 0);
  const total = Math.pow(2, 32 - prefix);

  let firstHost: string;
  let lastHost: string;
  let usableHosts: number;

  if (prefix === 32) {
    firstHost = lastHost = intToIp(netInt);
    usableHosts = 1;
  } else if (prefix === 31) {
    // RFC 3021: both addresses are usable on a point-to-point link.
    firstHost = intToIp(netInt);
    lastHost = intToIp(bcInt);
    usableHosts = 2;
  } else {
    firstHost = intToIp(netInt + 1);
    lastHost = intToIp(bcInt - 1);
    usableHosts = total - 2;
  }

  const hostRange =
    firstHost === lastHost ? firstHost : `${firstHost} – ${lastHost}`;
  const { ipClass, addressType } = classify(octets);

  return {
    ip,
    prefix,
    mask,
    wildcard,
    maskBinary: maskBinary(mask),
    network: intToIp(netInt),
    broadcast: prefix >= 31 ? "—" : intToIp(bcInt),
    firstHost,
    lastHost,
    hostRange,
    usableHosts,
    totalAddresses: total,
    ipClass,
    addressType,
    cidr: `${intToIp(netInt)}/${prefix}`,
  };
}
