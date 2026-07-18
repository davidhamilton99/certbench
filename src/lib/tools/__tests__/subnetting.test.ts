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

describe("combination coverage (every variant appears)", () => {
  function sweep(mode: Parameters<typeof generateQuestion>[0], d: Difficulty, n: number) {
    const rng = seeded(2026);
    const qs: DrillQuestion[] = [];
    for (let i = 0; i < n; i++) qs.push(generateQuestion(mode, d, rng));
    return qs;
  }

  function promptPrefix(q: DrillQuestion): number | null {
    const m = q.promptValue.match(/\/(\d+)$/);
    return m ? Number(m[1]) : null;
  }

  it("binary drills both directions in both difficulties", () => {
    for (const d of ["standard", "any-prefix"] as const) {
      const qs = sweep("binary", d, 300);
      expect(qs.some((q) => q.prompt.includes("8-bit binary"))).toBe(true);
      expect(qs.some((q) => q.prompt.includes("Convert to decimal"))).toBe(true);
    }
    // Standard mixes mask octets AND familiar octets.
    const values = new Set(
      sweep("binary", "standard", 400).map((q) =>
        q.answerKind === "count" ? Number(q.answer) : parseInt(q.answer, 2)
      )
    );
    expect(values.has(192)).toBe(true); // mask octet
    expect(values.has(10)).toBe(true); // familiar octet
  });

  it("cidr-mask asks both directions and covers every prefix /8–/30", () => {
    const qs = sweep("cidr-mask", "any-prefix", 2000);
    expect(qs.some((q) => q.answerKind === "dotted")).toBe(true);
    expect(qs.some((q) => q.answerKind === "cidr")).toBe(true);
    const prefixes = new Set(
      qs.map((q) =>
        q.answerKind === "cidr" ? Number(q.answer) : prefixFromMask(q.answer)
      )
    );
    for (let p = 8; p <= 30; p++) expect(prefixes.has(p), `/${p}`).toBe(true);
  });

  it("network-id any-prefix covers every prefix /8–/30", () => {
    const prefixes = new Set(
      sweep("network-id", "any-prefix", 2000).map(promptPrefix)
    );
    for (let p = 8; p <= 30; p++) expect(prefixes.has(p), `/${p}`).toBe(true);
  });

  it("network-id standard covers every prefix /24–/30", () => {
    const prefixes = new Set(
      sweep("network-id", "standard", 600).map(promptPrefix)
    );
    for (let p = 24; p <= 30; p++) expect(prefixes.has(p), `/${p}`).toBe(true);
  });

  it("broadcast-range rotates through all three asks", () => {
    const qs = sweep("broadcast-range", "any-prefix", 300);
    expect(qs.some((q) => q.prompt.includes("broadcast"))).toBe(true);
    expect(qs.some((q) => q.prompt.includes("first usable"))).toBe(true);
    expect(qs.some((q) => q.prompt.includes("last usable"))).toBe(true);
  });

  it("host-math asks both directions and includes /30 in both", () => {
    for (const d of ["standard", "any-prefix"] as const) {
      const qs = sweep("host-math", d, 1200);
      const p2h = qs.filter((q) => q.answerKind === "count");
      const h2p = qs.filter((q) => q.answerKind === "cidr");
      expect(p2h.length).toBeGreaterThan(0);
      expect(h2p.length).toBeGreaterThan(0);
      // /30 → 2 usable, and 1–2 hosts → /30: the point-to-point classic.
      expect(p2h.some((q) => q.promptValue === "/30")).toBe(true);
      expect(h2p.some((q) => q.answer === "30")).toBe(true);
      // Full prefix coverage for the difficulty's range.
      const lo = d === "standard" ? 24 : 18;
      const seen = new Set(p2h.map((q) => Number(q.promptValue.replace("/", ""))));
      for (let p = lo; p <= 30; p++) expect(seen.has(p), `${d} /${p}`).toBe(true);
    }
  });

  it("same-subnet produces both yes and no answers in both difficulties", () => {
    for (const d of ["standard", "any-prefix"] as const) {
      const answers = new Set(sweep("same-subnet", d, 200).map((q) => q.answer));
      expect(answers.has("yes")).toBe(true);
      expect(answers.has("no")).toBe(true);
    }
  });

  it("gauntlet reaches every mode", () => {
    const rng = seeded(5);
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(pickGauntletMode(rng));
    expect(seen.size).toBe(MODES.length);
  });
});
