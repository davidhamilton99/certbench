import { describe, expect, it } from "vitest";
import {
  broadcastOf,
  generateQuestion,
  grade,
  intToIp,
  ipToInt,
  maskFromPrefix,
  MODES,
  networkOf,
  pickGauntletMode,
  prefixForHosts,
  prefixFromMask,
  usableHosts,
  type Difficulty,
  type DrillQuestion,
  type Rng,
} from "@/lib/tools/subnetting";

/** Deterministic RNG (mulberry32) so generator sweeps are reproducible. */
function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("ip math primitives", () => {
  it("round-trips ip <-> int", () => {
    for (const ip of ["0.0.0.0", "10.37.129.200", "192.168.1.154", "255.255.255.255"]) {
      expect(intToIp(ipToInt(ip))).toBe(ip);
    }
  });

  it("mask <-> prefix round-trips for /8–/30", () => {
    for (let p = 8; p <= 30; p++) {
      expect(prefixFromMask(maskFromPrefix(p))).toBe(p);
    }
  });

  it("computes the classic /26 example", () => {
    const ip = ipToInt("192.168.1.154");
    expect(intToIp(networkOf(ip, 26))).toBe("192.168.1.128");
    expect(intToIp(broadcastOf(ip, 26))).toBe("192.168.1.191");
  });

  it("handles a middle-octet prefix (/19)", () => {
    const ip = ipToInt("10.37.129.200");
    expect(intToIp(networkOf(ip, 19))).toBe("10.37.128.0");
    expect(intToIp(broadcastOf(ip, 19))).toBe("10.37.159.255");
  });

  it("host math", () => {
    expect(usableHosts(26)).toBe(62);
    expect(usableHosts(30)).toBe(2);
    expect(usableHosts(24)).toBe(254);
    // 62 fits in /26 exactly; 63 forces /25.
    expect(prefixForHosts(62)).toBe(26);
    expect(prefixForHosts(63)).toBe(25);
    expect(prefixForHosts(2)).toBe(30);
  });
});

describe("grading normalization", () => {
  const dotted: DrillQuestion = {
    mode: "network-id",
    prompt: "",
    promptValue: "",
    answerKind: "dotted",
    answer: "192.168.1.128",
    placeholder: "",
    solution: [],
  };

  it("accepts dotted answers with whitespace and leading zeros", () => {
    expect(grade(dotted, " 192.168.1.128 ")).toBe(true);
    expect(grade(dotted, "192.168.001.128")).toBe(true);
    expect(grade(dotted, "192.168.1.129")).toBe(false);
    expect(grade(dotted, "192.168.1")).toBe(false);
    expect(grade(dotted, "192.168.1.300")).toBe(false);
  });

  it("accepts cidr with or without the slash", () => {
    const q = { ...dotted, answerKind: "cidr" as const, answer: "26" };
    expect(grade(q, "/26")).toBe(true);
    expect(grade(q, "26")).toBe(true);
    expect(grade(q, "25")).toBe(false);
    expect(grade(q, "abc")).toBe(false);
  });

  it("accepts binary without leading zeros", () => {
    const q = { ...dotted, answerKind: "binary" as const, answer: "00001010" };
    expect(grade(q, "1010")).toBe(true);
    expect(grade(q, "0000 1010")).toBe(true);
    expect(grade(q, "00001011")).toBe(false);
    expect(grade(q, "2010")).toBe(false);
  });

  it("accepts count with separators", () => {
    const q = { ...dotted, answerKind: "count" as const, answer: "1022" };
    expect(grade(q, "1,022")).toBe(true);
    expect(grade(q, "1022")).toBe(true);
    expect(grade(q, "1023")).toBe(false);
  });

  it("grades yes/no in either spelling", () => {
    const q = { ...dotted, answerKind: "yes-no" as const, answer: "yes" };
    expect(grade(q, "y")).toBe(true);
    expect(grade(q, "YES")).toBe(true);
    expect(grade(q, "no")).toBe(false);
  });
});

describe("generator sweep (seeded)", () => {
  const difficulties: Difficulty[] = ["standard", "any-prefix"];

  it("every generated question grades its own canonical answer correct", () => {
    const rng = seeded(42);
    for (const { id } of MODES) {
      for (const d of difficulties) {
        for (let i = 0; i < 150; i++) {
          const q = generateQuestion(id, d, rng);
          expect(grade(q, q.answer), `${id}/${d}: ${q.prompt} ${q.promptValue}`).toBe(true);
          expect(q.solution.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("same-subnet answers are truthful", () => {
    const rng = seeded(7);
    for (let i = 0; i < 300; i++) {
      const q = generateQuestion("same-subnet", "any-prefix", rng);
      const m = q.promptValue.match(/^([\d.]+) and ([\d.]+)\s+\/(\d+)$/);
      expect(m, q.promptValue).not.toBeNull();
      const [, a, b, p] = m!;
      const same =
        networkOf(ipToInt(a), Number(p)) === networkOf(ipToInt(b), Number(p));
      expect(q.answer).toBe(same ? "yes" : "no");
    }
  });

  it("host-math 'smallest prefix' answers are actually the smallest", () => {
    const rng = seeded(13);
    let seen = 0;
    for (let i = 0; i < 400; i++) {
      const q = generateQuestion("host-math", "any-prefix", rng);
      const m = q.promptValue.match(/^(\d+) hosts$/);
      if (!m) continue; // the prefix→hosts direction
      seen++;
      const hosts = Number(m[1]);
      expect(prefixForHosts(hosts)).toBe(Number(q.answer));
    }
    expect(seen).toBeGreaterThan(50);
  });

  it("network-id answers are valid network addresses of the prompt", () => {
    const rng = seeded(99);
    for (let i = 0; i < 300; i++) {
      const q = generateQuestion("network-id", "any-prefix", rng);
      const m = q.promptValue.match(/^([\d.]+) \/(\d+)$/);
      expect(m, q.promptValue).not.toBeNull();
      const [, ip, p] = m!;
      expect(q.answer).toBe(intToIp(networkOf(ipToInt(ip), Number(p))));
    }
  });

  it("gauntlet picker only returns real modes", () => {
    const rng = seeded(1);
    const ids = new Set(MODES.map((m) => m.id));
    for (let i = 0; i < 100; i++) {
      expect(ids.has(pickGauntletMode(rng))).toBe(true);
    }
  });
});
