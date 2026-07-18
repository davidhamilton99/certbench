/**
 * Subnetting drill engine: pure question generators + graders for the free
 * /tools/subnetting-practice page. Each mode drills one conversion until
 * it's reflex; every question carries a worked solution that teaches the
 * block-size ("magic number") method, not just the answer.
 *
 * Everything takes an injectable RNG so tests can sweep the generator space
 * deterministically.
 */

export type Rng = () => number;

export type DrillMode =
  | "binary"
  | "cidr-mask"
  | "network-id"
  | "broadcast-range"
  | "host-math"
  | "same-subnet";

export type Difficulty = "standard" | "any-prefix";

export type AnswerKind = "binary" | "dotted" | "cidr" | "count" | "yes-no";

export interface DrillQuestion {
  mode: DrillMode;
  /** Short task line, e.g. "Convert to 8-bit binary". */
  prompt: string;
  /** The value being asked about, displayed prominently in mono. */
  promptValue: string;
  answerKind: AnswerKind;
  /** Canonical answer, already normalized. */
  answer: string;
  placeholder: string;
  /** Worked solution lines (shown on a miss). */
  solution: string[];
}

export const MODES: { id: DrillMode; label: string; blurb: string }[] = [
  { id: "binary", label: "Binary", blurb: "Octets ↔ 8-bit binary" },
  { id: "cidr-mask", label: "CIDR ↔ mask", blurb: "/26 ↔ 255.255.255.192" },
  { id: "network-id", label: "Network ID", blurb: "IP + prefix → network" },
  { id: "broadcast-range", label: "Broadcast & range", blurb: "Broadcast, first, last" },
  { id: "host-math", label: "Host math", blurb: "Prefix ↔ usable hosts" },
  { id: "same-subnet", label: "Same subnet?", blurb: "Two IPs, yes or no" },
];

// ---------------------------------------------------------------------------
// IP math primitives (32-bit unsigned via >>> 0)

export function ipToInt(ip: string): number {
  const [a, b, c, d] = ip.split(".").map(Number);
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}

export function intToIp(n: number): string {
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
}

export function maskFromPrefix(prefix: number): string {
  const m = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return intToIp(m);
}

export function prefixFromMask(mask: string): number {
  const n = ipToInt(mask);
  let count = 0;
  for (let i = 31; i >= 0; i--) {
    if ((n >>> i) & 1) count++;
    else break;
  }
  return count;
}

export function networkOf(ipInt: number, prefix: number): number {
  const m = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipInt & m) >>> 0;
}

export function broadcastOf(ipInt: number, prefix: number): number {
  return (networkOf(ipInt, prefix) | (0xffffffff >>> prefix)) >>> 0;
}

/** Usable hosts in a subnet; valid for prefixes 0–30. */
export function usableHosts(prefix: number): number {
  return Math.pow(2, 32 - prefix) - 2;
}

/** Smallest prefix whose usable-host count fits n hosts (n ≥ 1). */
export function prefixForHosts(n: number): number {
  for (let p = 30; p >= 0; p--) {
    if (usableHosts(p) >= n) return p;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Answer normalization / grading

function normDotted(raw: string): string | null {
  const t = raw.trim();
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(t)) return null;
  const parts = t.split(".").map(Number);
  if (parts.some((p) => p > 255)) return null;
  return parts.join(".");
}

/** True when `raw` is a correct entry of `q.answer` for the question's kind. */
export function grade(q: DrillQuestion, raw: string): boolean {
  const t = raw.trim().toLowerCase();
  switch (q.answerKind) {
    case "binary": {
      const cleaned = t.replace(/[\s.]/g, "");
      if (!/^[01]{1,8}$/.test(cleaned)) return false;
      return parseInt(cleaned, 2) === parseInt(q.answer, 2);
    }
    case "dotted":
      return normDotted(t) === q.answer;
    case "cidr": {
      const cleaned = t.replace(/^\//, "");
      return /^\d{1,2}$/.test(cleaned) && Number(cleaned) === Number(q.answer);
    }
    case "count": {
      const cleaned = t.replace(/[,\s]/g, "");
      return /^\d+$/.test(cleaned) && Number(cleaned) === Number(q.answer);
    }
    case "yes-no": {
      if (["y", "yes"].includes(t)) return q.answer === "yes";
      if (["n", "no"].includes(t)) return q.answer === "no";
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Generation helpers

function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Octets that appear in subnet masks — the ones worth having cold. */
const MASK_OCTETS = [0, 128, 192, 224, 240, 248, 252, 254, 255] as const;

/** Common non-mask octets students meet constantly. */
const FAMILIAR_OCTETS = [1, 10, 64, 100, 127, 168, 172, 192, 200, 254] as const;

function drillPrefix(rng: Rng, difficulty: Difficulty): number {
  // /24–/30 keeps the interesting math in the last octet; any-prefix opens
  // every prefix /8–/30 the way Network+ and CCNA actually ask.
  return difficulty === "standard" ? randInt(rng, 24, 30) : randInt(rng, 8, 30);
}

function randomIp(rng: Rng): number {
  // Private-looking, familiar address space: 10.x, 172.16–31.x, 192.168.x.
  const family = rng();
  if (family < 0.34) {
    return ipToInt(`10.${randInt(rng, 0, 255)}.${randInt(rng, 0, 255)}.${randInt(rng, 1, 254)}`);
  }
  if (family < 0.67) {
    return ipToInt(`172.${randInt(rng, 16, 31)}.${randInt(rng, 0, 255)}.${randInt(rng, 1, 254)}`);
  }
  return ipToInt(`192.168.${randInt(rng, 0, 255)}.${randInt(rng, 1, 254)}`);
}

/** 8-bit binary string with leading zeros. */
function toBinary(n: number): string {
  return n.toString(2).padStart(8, "0");
}

function binaryBreakdown(n: number): string {
  if (n === 0) return "0 — no bits set";
  const parts: number[] = [];
  for (let bit = 7; bit >= 0; bit--) {
    if (n & (1 << bit)) parts.push(1 << bit);
  }
  return `${parts.join(" + ")} = ${n}`;
}

/**
 * The octet where the prefix ends, 0-based, plus the mask value in it.
 * For /26: index 3, mask octet 192. For /19: index 2, mask octet 224.
 */
function interestingOctet(prefix: number): { index: number; maskOctet: number } {
  const index = Math.min(3, Math.floor(prefix / 8));
  const bitsInto = prefix - index * 8;
  const maskOctet = bitsInto === 0 ? 0 : (0xff << (8 - bitsInto)) & 0xff;
  return { index, maskOctet };
}

function blockSizeSolution(ipInt: number, prefix: number): string[] {
  const { index, maskOctet } = interestingOctet(prefix);
  if (prefix % 8 === 0) {
    return [
      `/${prefix} ends on an octet boundary — mask ${maskFromPrefix(prefix)}.`,
      `Keep the first ${prefix / 8} octet(s), zero the rest → ${intToIp(networkOf(ipInt, prefix))}.`,
    ];
  }
  const block = 256 - maskOctet;
  const ipOctet = (ipInt >>> ((3 - index) * 8)) & 255;
  const networkOctet = Math.floor(ipOctet / block) * block;
  return [
    `Mask ${maskFromPrefix(prefix)} — interesting octet is #${index + 1} (${maskOctet}).`,
    `Block size 256 − ${maskOctet} = ${block}; subnets step 0, ${block}, ${block * 2}…`,
    `${ipOctet} falls in the ${networkOctet} block → network ${intToIp(networkOf(ipInt, prefix))}.`,
  ];
}

// ---------------------------------------------------------------------------
// Per-mode generators

function genBinary(rng: Rng, difficulty: Difficulty): DrillQuestion {
  const toBin = rng() < 0.5;
  const value =
    difficulty === "standard"
      ? pick(rng, rng() < 0.5 ? MASK_OCTETS : FAMILIAR_OCTETS)
      : randInt(rng, 0, 255);
  if (toBin) {
    return {
      mode: "binary",
      prompt: "Convert to 8-bit binary",
      promptValue: String(value),
      answerKind: "binary",
      answer: toBinary(value),
      placeholder: "e.g. 10101100",
      solution: [binaryBreakdown(value), `→ ${toBinary(value)}`],
    };
  }
  return {
    mode: "binary",
    prompt: "Convert to decimal",
    promptValue: toBinary(value),
    answerKind: "count",
    answer: String(value),
    placeholder: "e.g. 172",
    solution: [binaryBreakdown(value)],
  };
}

function genCidrMask(rng: Rng, difficulty: Difficulty): DrillQuestion {
  const prefix = difficulty === "standard" ? randInt(rng, 24, 30) : randInt(rng, 8, 30);
  const mask = maskFromPrefix(prefix);
  const { index, maskOctet } = interestingOctet(prefix);
  const bitsInto = prefix - index * 8;
  const explain =
    prefix % 8 === 0
      ? [`/${prefix} = ${prefix / 8} full octets of 255 → ${mask}.`]
      : [
          `/${prefix} = ${index} full octet(s) + ${bitsInto} bits.`,
          `${bitsInto} bits → ${maskOctet} (${toBinary(maskOctet)}) → ${mask}.`,
        ];
  if (rng() < 0.5) {
    return {
      mode: "cidr-mask",
      prompt: "Write the dotted subnet mask for",
      promptValue: `/${prefix}`,
      answerKind: "dotted",
      answer: mask,
      placeholder: "e.g. 255.255.255.192",
      solution: explain,
    };
  }
  return {
    mode: "cidr-mask",
    prompt: "Write the CIDR prefix for",
    promptValue: mask,
    answerKind: "cidr",
    answer: String(prefix),
    placeholder: "e.g. /26",
    solution: explain,
  };
}

function genNetworkId(rng: Rng, difficulty: Difficulty): DrillQuestion {
  const prefix = drillPrefix(rng, difficulty);
  const ip = randomIp(rng);
  const network = networkOf(ip, prefix);
  return {
    mode: "network-id",
    prompt: "What is the network address of",
    promptValue: `${intToIp(ip)} /${prefix}`,
    answerKind: "dotted",
    answer: intToIp(network),
    placeholder: "e.g. 192.168.1.128",
    solution: blockSizeSolution(ip, prefix),
  };
}

function genBroadcastRange(rng: Rng, difficulty: Difficulty): DrillQuestion {
  const prefix = drillPrefix(rng, difficulty);
  const ip = randomIp(rng);
  const network = networkOf(ip, prefix);
  const broadcast = broadcastOf(ip, prefix);
  const ask = pick(rng, ["broadcast", "first", "last"] as const);
  const answers = {
    broadcast: intToIp(broadcast),
    first: intToIp(network + 1),
    last: intToIp(broadcast - 1),
  };
  const prompts = {
    broadcast: "What is the broadcast address of",
    first: "What is the first usable host in",
    last: "What is the last usable host in",
  };
  return {
    mode: "broadcast-range",
    prompt: prompts[ask],
    promptValue: `${intToIp(ip)} /${prefix}`,
    answerKind: "dotted",
    answer: answers[ask],
    placeholder: "e.g. 192.168.1.190",
    solution: [
      ...blockSizeSolution(ip, prefix),
      `Broadcast = next network − 1 → ${intToIp(broadcast)}.`,
      `Usable range: ${intToIp(network + 1)} – ${intToIp(broadcast - 1)}.`,
    ],
  };
}

function genHostMath(rng: Rng, difficulty: Difficulty): DrillQuestion {
  // Includes /30 so the classic point-to-point fact (2 usable) gets asked.
  const range = difficulty === "standard" ? ([24, 30] as const) : ([18, 30] as const);
  const prefix = randInt(rng, range[0], range[1]);
  if (rng() < 0.5) {
    return {
      mode: "host-math",
      prompt: "How many usable hosts in a",
      promptValue: `/${prefix}`,
      answerKind: "count",
      answer: String(usableHosts(prefix)),
      placeholder: "e.g. 62",
      solution: [
        `Host bits: 32 − ${prefix} = ${32 - prefix}.`,
        `2^${32 - prefix} − 2 = ${Math.pow(2, 32 - prefix)} − 2 = ${usableHosts(prefix)}.`,
      ],
    };
  }
  // "N hosts → smallest prefix": pick N so `prefix` is the unique answer.
  const lo = usableHosts(prefix + 1) + 1;
  const hi = usableHosts(prefix);
  const hosts = randInt(rng, lo, hi);
  return {
    mode: "host-math",
    prompt: "Smallest prefix that fits",
    promptValue: `${hosts} hosts`,
    answerKind: "cidr",
    answer: String(prefix),
    placeholder: "e.g. /26",
    solution: [
      `Need ${hosts} + 2 addresses (network + broadcast) = ${hosts + 2}.`,
      `Next power of two ≥ ${hosts + 2} is ${Math.pow(2, 32 - prefix)} = 2^${32 - prefix}.`,
      `32 − ${32 - prefix} = /${prefix} (${usableHosts(prefix)} usable).`,
    ],
  };
}

function genSameSubnet(rng: Rng, difficulty: Difficulty): DrillQuestion {
  const prefix = drillPrefix(rng, difficulty);
  const ipA = randomIp(rng);
  const network = networkOf(ipA, prefix);
  const size = Math.pow(2, 32 - prefix);
  const same = rng() < 0.5;

  let ipB: number;
  if (same) {
    ipB = network + randInt(rng, 1, size - 2);
  } else {
    // Near miss on purpose: usually the adjacent block, occasionally further.
    const step = rng() < 0.7 ? 1 : randInt(rng, 2, 4);
    const dir = network >= step * size ? -1 : 1;
    ipB = network + dir * step * size + randInt(rng, 1, size - 2);
  }

  const sameActual = networkOf(ipB >>> 0, prefix) === network;
  return {
    mode: "same-subnet",
    prompt: "Are these on the same subnet?",
    promptValue: `${intToIp(ipA)} and ${intToIp(ipB >>> 0)}  /${prefix}`,
    answerKind: "yes-no",
    answer: sameActual ? "yes" : "no",
    placeholder: "",
    solution: [
      `${intToIp(ipA)} /${prefix} → network ${intToIp(network)}.`,
      `${intToIp(ipB >>> 0)} /${prefix} → network ${intToIp(networkOf(ipB >>> 0, prefix))}.`,
      sameActual ? "Same network → yes." : "Different networks → no.",
    ],
  };
}

const GENERATORS: Record<
  DrillMode,
  (rng: Rng, difficulty: Difficulty) => DrillQuestion
> = {
  binary: genBinary,
  "cidr-mask": genCidrMask,
  "network-id": genNetworkId,
  "broadcast-range": genBroadcastRange,
  "host-math": genHostMath,
  "same-subnet": genSameSubnet,
};

/** Generate one question. Pass mode "gauntlet" via pickGauntletMode first. */
export function generateQuestion(
  mode: DrillMode,
  difficulty: Difficulty,
  rng: Rng = Math.random
): DrillQuestion {
  return GENERATORS[mode](rng, difficulty);
}

export function pickGauntletMode(rng: Rng = Math.random): DrillMode {
  return pick(rng, MODES).id;
}
