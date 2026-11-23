/**
 * The arithmetic behind the free page /tools/subnet-calculator. It reuses the
 * address functions of the subnetting drill, so the two tools can never
 * disagree. It has no side effects, and every result is unit-tested.
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
  /** "None" for /31 and /32, where there is no broadcast address. */
  broadcast: string;
  firstHost: string;
  lastHost: string;
  /** The first and last usable host as words, "10.0.0.1 to 10.0.0.254", or the one host of a /32. */
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

/**
 * What the calculator's address field says about the prefix length, as the
 * visitor types: no slash ("none"), a slash with nothing after it yet
 * ("unfinished"), a prefix length from 0 to 32, or anything else after the
 * slash ("invalid", for example "/33" or "/2a").
 */
export type TypedPrefix = number | "none" | "unfinished" | "invalid";

/**
 * The address field read whole, at every keystroke: the address before any
 * slash, and the prefix length after it. Typed key by key, "10.1.1.1/16"
 * passes through "10.1.1.1/" and "10.1.1.1/1", and the digits after the slash
 * are never read as part of the address.
 */
export function readAddressField(text: string): { address: string; prefix: TypedPrefix } {
  const slash = text.indexOf("/");
  if (slash < 0) return { address: text.trim(), prefix: "none" };
  const address = text.slice(0, slash).trim();
  const after = text.slice(slash + 1).trim();
  if (after === "") return { address, prefix: "unfinished" };
  if (!/^\d+$/.test(after)) return { address, prefix: "invalid" };
  const n = Number(after);
  return { address, prefix: n <= 32 ? n : "invalid" };
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

  // A range is written in words. (A colon between two addresses reads as a
  // label and its value, not as a range.)
  const hostRange = firstHost === lastHost ? firstHost : `${firstHost} to ${lastHost}`;
  const { ipClass, addressType } = classify(octets);

  return {
    ip,
    prefix,
    mask,
    wildcard,
    maskBinary: maskBinary(mask),
    network: intToIp(netInt),
    broadcast: prefix >= 31 ? "None" : intToIp(bcInt),
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
