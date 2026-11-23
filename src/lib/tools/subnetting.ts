/**
 * Subnetting drill engine: pure question generators + graders for the free
 * /tools/subnetting-practice page. Each mode drills one conversion until
 * it's reflex; every question carries a worked solution that teaches the
 * block-size ("magic number") method, not just the answer.
 *
 * Everything a learner reads here is a sentence: the task, the question and
 * each worked step. A step states its arithmetic inside a sentence ("The block
 * size is 256 − 192 = 64, so ...") and never as a chain of arrows.
 *
 * Everything takes an injectable RNG so tests can sweep the generator space
 * deterministically.
 */

import { gradeAnswer, type AnswerKind } from "./subnet-grade";

export type Rng = () => number;

export type DrillMode =
  | "binary"
  | "cidr-mask"
  | "network-id"
  | "broadcast-range"
  | "host-math"
  | "same-subnet";

export type Difficulty = "standard" | "any-prefix";

export type { AnswerKind } from "./subnet-grade";

export interface DrillQuestion {
  mode: DrillMode;
  /** The task as a sentence that stands over the value: "Convert this number to 8-bit binary." */
  prompt: string;
  /** The value being asked about, displayed prominently in mono. */
  promptValue: string;
  /** The whole question in one sentence, value included, for a card that prints no separate value. */
  sentence: string;
  answerKind: AnswerKind;
  /** Canonical answer, already normalized. */
  answer: string;
  /**
   * An example of the form the answer takes ("255.255.255.192"), printed as a
   * hint beside the field. It is never the answer to this question. Empty
   * where the answer is yes or no.
   */
  placeholder: string;
  /** Worked solution, one sentence for each step (shown on a miss). */
  solution: string[];
}

/** The modes, with the name each is printed by. */
export const MODES: { id: DrillMode; label: string }[] = [
  { id: "binary", label: "Binary" },
  { id: "cidr-mask", label: "CIDR and mask" },
  { id: "network-id", label: "Network ID" },
  { id: "broadcast-range", label: "Broadcast and range" },
  { id: "host-math", label: "Host math" },
  { id: "same-subnet", label: "Same subnet?" },
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

/** Usable hosts in a subnet; valid for prefixes 0 to 30. */
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
// Answer normalization / grading (the rules live in ./subnet-grade)

/** True when `raw` is a correct entry of `q.answer` for the question's kind. */
export function grade(q: DrillQuestion, raw: string): boolean {
  return gradeAnswer(q.answerKind, q.answer, raw);
}

// ---------------------------------------------------------------------------
// Generation helpers

function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Octets that appear in subnet masks: the ones worth knowing by heart. */
const MASK_OCTETS = [0, 128, 192, 224, 240, 248, 252, 254, 255] as const;

/** Common non-mask octets students meet constantly. */
const FAMILIAR_OCTETS = [1, 10, 64, 100, 127, 168, 172, 192, 200, 254] as const;

function drillPrefix(rng: Rng, difficulty: Difficulty): number {
  // /24 to /30 keeps the interesting math in the last octet; any-prefix opens
  // every prefix from /8 to /30, the way Network+ and CCNA actually ask.
  return difficulty === "standard" ? randInt(rng, 24, 30) : randInt(rng, 8, 30);
}

function randomIp(rng: Rng): number {
  // Private-looking, familiar address space: 10.x, 172.16.x to 172.31.x, 192.168.x.
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

/** The place values of the bits that are set in an octet, largest first: 172 gives 128, 32, 8, 4. */
function bitValues(n: number): number[] {
  const parts: number[] = [];
  for (let bit = 7; bit >= 0; bit--) {
    if (n & (1 << bit)) parts.push(1 << bit);
  }
  return parts;
}

/** "128, 32, 8 and 4": a list as a sentence writes it. */
function listOf(values: readonly number[]): string {
  if (values.length < 2) return values.join("");
  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
}

const octets = (n: number) => `${n} full ${n === 1 ? "octet" : "octets"}`;
const bits = (n: number) => `${n} ${n === 1 ? "bit" : "bits"}`;

/**
 * An example of the form an answer takes that is never the answer itself. A
 * fixed example would give one question in seven away: "/26" is the answer to
 * "Write the CIDR prefix for the mask 255.255.255.192".
 */
function exampleOf(answer: string, examples: readonly [string, string]): string {
  const bare = (v: string) => v.replace(/^\//, "");
  return bare(examples[0]) === bare(answer) ? examples[1] : examples[0];
}

function toBinarySteps(n: number): string[] {
  const parts = bitValues(n);
  if (parts.length === 0) return ["The number 0 has no bits set, so it is 00000000 in binary."];
  if (parts.length === 1) {
    return [`The number ${n} is the value of a single bit.`, `Set that bit alone, which gives ${toBinary(n)}.`];
  }
  return [`The number ${n} is ${parts.join(" + ")}.`, `Set the bit for each of those values, which gives ${toBinary(n)}.`];
}

function toDecimalSteps(n: number): string[] {
  const parts = bitValues(n);
  const binary = toBinary(n);
  if (parts.length === 0) return [`No bit of ${binary} is set, so its value is 0.`];
  if (parts.length === 1) return [`The one bit that is set in ${binary} is worth ${n}.`];
  return [`The bits that are set in ${binary} are worth ${listOf(parts)}.`, `Their sum is ${parts.join(" + ")} = ${n}.`];
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
  const network = intToIp(networkOf(ipInt, prefix));
  if (prefix % 8 === 0) {
    const kept = prefix / 8;
    return [
      `A /${prefix} prefix ends on an octet boundary, so the mask is ${maskFromPrefix(prefix)}.`,
      `Keep the first ${kept === 1 ? "octet" : `${kept} octets`} and set the rest to zero, which gives the network address ${network}.`,
    ];
  }
  const block = 256 - maskOctet;
  const ipOctet = (ipInt >>> ((3 - index) * 8)) & 255;
  const networkOctet = Math.floor(ipOctet / block) * block;
  // A block of 128 has two subnets in the octet; "and so on" would promise a third.
  const starts = block * 2 > 255 ? `0 and ${block}` : `0, ${block}, ${block * 2} and so on`;
  return [
    `The mask is ${maskFromPrefix(prefix)}, and the prefix ends in octet ${index + 1}, where the mask is ${maskOctet}.`,
    `The block size is 256 − ${maskOctet} = ${block}, so the subnets in that octet begin at ${starts}.`,
    `The value ${ipOctet} is in the block that begins at ${networkOctet}, so the network address is ${network}.`,
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
      prompt: "Convert this number to 8-bit binary.",
      promptValue: String(value),
      sentence: `Convert ${value} to 8-bit binary.`,
      answerKind: "binary",
      answer: toBinary(value),
      placeholder: exampleOf(toBinary(value), ["10101100", "11000000"]),
      solution: toBinarySteps(value),
    };
  }
  return {
    mode: "binary",
    prompt: "Convert this binary number to decimal.",
    promptValue: toBinary(value),
    sentence: `Convert the binary number ${toBinary(value)} to decimal.`,
    answerKind: "count",
    answer: String(value),
    placeholder: exampleOf(String(value), ["172", "192"]),
    solution: toDecimalSteps(value),
  };
}

function genCidrMask(rng: Rng, difficulty: Difficulty): DrillQuestion {
  const prefix = difficulty === "standard" ? randInt(rng, 24, 30) : randInt(rng, 8, 30);
  const mask = maskFromPrefix(prefix);
  const { index, maskOctet } = interestingOctet(prefix);
  const bitsInto = prefix - index * 8;
  const explain =
    prefix % 8 === 0
      ? [`A /${prefix} prefix is ${octets(prefix / 8)} of 255, so the mask is ${mask}.`]
      : [
          `A /${prefix} prefix is ${octets(index)} and ${bits(bitsInto)} of the next octet.`,
          `With ${bits(bitsInto)} set from the left, that octet is ${maskOctet} (${toBinary(maskOctet)}), so the mask is ${mask}.`,
        ];
  if (rng() < 0.5) {
    return {
      mode: "cidr-mask",
      prompt: "Write the dotted subnet mask for this prefix.",
      promptValue: `/${prefix}`,
      sentence: `Write the dotted subnet mask for /${prefix}.`,
      answerKind: "dotted",
      answer: mask,
      placeholder: exampleOf(mask, ["255.255.255.192", "255.255.240.0"]),
      solution: explain,
    };
  }
  return {
    mode: "cidr-mask",
    prompt: "Write the CIDR prefix for this mask.",
    promptValue: mask,
    sentence: `Write the CIDR prefix for the mask ${mask}.`,
    answerKind: "cidr",
    answer: String(prefix),
    placeholder: exampleOf(String(prefix), ["/26", "/20"]),
    solution: explain,
  };
}

function genNetworkId(rng: Rng, difficulty: Difficulty): DrillQuestion {
  const prefix = drillPrefix(rng, difficulty);
  const ip = randomIp(rng);
  const network = intToIp(networkOf(ip, prefix));
  return {
    mode: "network-id",
    prompt: "What is the network address of this host?",
    promptValue: `${intToIp(ip)} /${prefix}`,
    sentence: `What is the network address of ${intToIp(ip)} /${prefix}?`,
    answerKind: "dotted",
    answer: network,
    placeholder: exampleOf(network, ["192.168.1.128", "10.20.0.0"]),
    solution: blockSizeSolution(ip, prefix),
  };
}

function genBroadcastRange(rng: Rng, difficulty: Difficulty): DrillQuestion {
  const prefix = drillPrefix(rng, difficulty);
  const ip = randomIp(rng);
  const network = networkOf(ip, prefix);
  const broadcast = broadcastOf(ip, prefix);
  const ask = pick(rng, ["broadcast", "first", "last"] as const);
  const host = `${intToIp(ip)} /${prefix}`;
  const answers = {
    broadcast: intToIp(broadcast),
    first: intToIp(network + 1),
    last: intToIp(broadcast - 1),
  };
  const prompts = {
    broadcast: "What is the broadcast address of this host's subnet?",
    first: "What is the first usable host in this host's subnet?",
    last: "What is the last usable host in this host's subnet?",
  };
  const sentences = {
    broadcast: `What is the broadcast address of the subnet that holds ${host}?`,
    first: `What is the first usable host in the subnet that holds ${host}?`,
    last: `What is the last usable host in the subnet that holds ${host}?`,
  };
  return {
    mode: "broadcast-range",
    prompt: prompts[ask],
    promptValue: host,
    sentence: sentences[ask],
    answerKind: "dotted",
    answer: answers[ask],
    placeholder: exampleOf(answers[ask], ["192.168.1.190", "10.20.0.62"]),
    solution: [
      ...blockSizeSolution(ip, prefix),
      `The next network begins one address after the broadcast address, so the broadcast address is ${intToIp(broadcast)}.`,
      `The usable hosts run from ${intToIp(network + 1)} to ${intToIp(broadcast - 1)}.`,
    ],
  };
}

function genHostMath(rng: Rng, difficulty: Difficulty): DrillQuestion {
  // Includes /30 so the classic point-to-point fact (2 usable) gets asked.
  const range = difficulty === "standard" ? ([24, 30] as const) : ([18, 30] as const);
  const prefix = randInt(rng, range[0], range[1]);
  const hostBits = 32 - prefix;
  const reserved = "because the network address and the broadcast address cannot be given to a host";
  if (rng() < 0.5) {
    const usable = String(usableHosts(prefix));
    return {
      mode: "host-math",
      prompt: "How many usable hosts are there in a network with this prefix?",
      promptValue: `/${prefix}`,
      sentence: `How many usable hosts are there in a /${prefix} network?`,
      answerKind: "count",
      answer: usable,
      placeholder: exampleOf(usable, ["62", "30"]),
      solution: [
        `A /${prefix} prefix leaves 32 − ${prefix} = ${hostBits} host bits.`,
        `That gives 2^${hostBits} − 2 = ${Math.pow(2, hostBits)} − 2 = ${usable} usable hosts, ${reserved}.`,
      ],
    };
  }
  // "N hosts, smallest subnet": pick N so that `prefix` is the only answer.
  const lo = usableHosts(prefix + 1) + 1;
  const hi = usableHosts(prefix);
  const hosts = randInt(rng, lo, hi);
  return {
    mode: "host-math",
    prompt: "Which prefix gives the smallest subnet that fits this many hosts?",
    promptValue: `${hosts} hosts`,
    sentence: `Which prefix gives the smallest subnet that fits ${hosts} hosts?`,
    answerKind: "cidr",
    answer: String(prefix),
    placeholder: exampleOf(String(prefix), ["/26", "/20"]),
    solution: [
      `A subnet for ${hosts} hosts needs ${hosts} + 2 = ${hosts + 2} addresses, ${reserved}.`,
      `The smallest power of two that is at least ${hosts + 2} is 2^${hostBits} = ${Math.pow(2, hostBits)}.`,
      `That is ${hostBits} host bits, and 32 − ${hostBits} = ${prefix}, so the prefix is /${prefix}, which has ${usableHosts(prefix)} usable hosts.`,
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

  const a = intToIp(ipA);
  const b = intToIp(ipB >>> 0);
  const networkB = networkOf(ipB >>> 0, prefix);
  const sameActual = networkB === network;
  return {
    mode: "same-subnet",
    prompt: "Are these two addresses on the same subnet?",
    promptValue: `${a} and ${b}  /${prefix}`,
    sentence: `Are ${a} and ${b} on the same /${prefix} subnet?`,
    answerKind: "yes-no",
    answer: sameActual ? "yes" : "no",
    placeholder: "",
    solution: [
      `With a /${prefix} prefix, ${a} is in the network ${intToIp(network)} and ${b} is in the network ${intToIp(networkB)}.`,
      sameActual
        ? "The two networks are the same, so the addresses are on the same subnet."
        : "The two networks are different, so the addresses are not on the same subnet.",
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
