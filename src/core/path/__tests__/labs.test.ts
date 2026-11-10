import { describe, expect, it } from "vitest";
import { domainLab, HANDS_ON, labLibrary } from "../labs";
import { finishLab, mergePathProgress, sanitizePathProgress } from "../progress";
import { pathProgressSchema } from "@/contracts/path";
import { pbqRegistry } from "@/data/pbq";
import { EMPTY_PATH_PROGRESS, PATH_CERTS } from "../types";
import type { PbqScenario } from "@/data/pbq/types";

const ordering = (id: string, domain: string): PbqScenario => ({
  type: "ordering",
  id,
  title: `Ordering ${id}`,
  description: "",
  domain_number: domain,
  domain_title: "",
  items: ["a", "b"],
  correct_order: [0, 1],
  explanation: "",
});

describe("domainLab", () => {
  it("picks a domain's most hands-on scenario", () => {
    const security = pbqRegistry["security-plus-sy0-701"];
    const sim = security.find((s) => s.domain_number === "3.0" && s.type === "simulation")!;
    expect(domainLab(security, "3.0")).toEqual({ id: sim.id, title: sim.title, minutes: (sim as { estimatedMinutes: number }).estimatedMinutes });
  });

  it("falls back to a drill, at a few minutes, for a domain without a simulation", () => {
    const lab = domainLab([ordering("x", "1.0"), ordering("y", "2.0")], "2.0");
    expect(lab).toEqual({ id: "y", title: "Ordering y", minutes: 3 });
  });

  it("has nothing for a domain with no scenarios", () => {
    expect(domainLab([ordering("x", "1.0")], "4.0")).toBeUndefined();
  });

  it("finds a lab for every domain of every exam with a path", () => {
    const domains: Record<string, number> = {
      "security-plus-sy0-701": 5,
      "network-plus-n10-009": 5,
      "a-plus-core1-220-1201": 5,
      "a-plus-core2-220-1202": 4,
    };
    for (const cert of PATH_CERTS) {
      for (let d = 1; d <= domains[cert]; d++) {
        expect(domainLab(pbqRegistry[cert], `${d}.0`), `${cert} ${d}.0`).toBeDefined();
      }
    }
  });
});

describe("labLibrary", () => {
  it("lists every scenario an exam has, domain by domain, the hands-on ones first", () => {
    for (const cert of PATH_CERTS) {
      const scenarios = pbqRegistry[cert];
      const library = labLibrary(scenarios);
      expect(library.map((l) => l.id).sort(), cert).toEqual(scenarios.map((s) => s.id).sort());
      const domains = library.map((l) => Number(l.domain));
      expect(domains, cert).toEqual([...domains].sort((a, b) => a - b));
      for (const domain of new Set(library.map((l) => l.domain))) {
        const kinds = library.filter((l) => l.domain === domain).map((l) => HANDS_ON.has(l.type));
        expect(kinds, `${cert} ${domain}`).toEqual([...kinds].sort((a, b) => Number(b) - Number(a)));
      }
      for (const lab of library) {
        expect(lab.id.length).toBeLessThanOrEqual(64);
        expect(lab.minutes).toBeGreaterThan(0);
      }
    }
  });

  it("includes the lab closing each domain on the path", () => {
    for (const cert of PATH_CERTS) {
      const ids = new Set(labLibrary(pbqRegistry[cert]).map((l) => l.id));
      for (const d of ["1.0", "2.0", "3.0", "4.0"]) {
        const lab = domainLab(pbqRegistry[cert], d);
        if (lab) expect(ids.has(lab.id), `${cert} ${d}`).toBe(true);
      }
    }
  });

  it("carries titles and lengths only, never a scenario's answers", () => {
    const [first] = labLibrary(pbqRegistry["security-plus-sy0-701"]);
    expect(Object.keys(first).sort()).toEqual(["domain", "id", "minutes", "title", "type"]);
  });
});

describe("labs kept with progress", () => {
  it("records each lab's runs and latest score, by scenario id", () => {
    let p = finishLab(EMPTY_PATH_PROGRESS, "firewall-acl-configuration", 3, 5, 10);
    p = finishLab(p, "firewall-acl-configuration", 5, 5, 20);
    expect(p.labs["firewall-acl-configuration"]).toEqual({ n: 2, c: 5, t: 5, at: 20 });
  });

  it("merges two devices' labs, and reads progress saved before them", () => {
    // One device played lab x once, later; the other twice, and lab y too.
    const a = finishLab(EMPTY_PATH_PROGRESS, "x", 1, 4, 10);
    const b = finishLab(finishLab(finishLab(EMPTY_PATH_PROGRESS, "x", 2, 4, 5), "x", 3, 4, 7), "y", 3, 3, 8);
    const merged = mergePathProgress(a, b);
    expect(merged.labs.x).toEqual({ n: 2, c: 3, t: 4, at: 7 });
    expect(merged.labs.y).toEqual({ n: 1, c: 3, t: 3, at: 8 });
    expect(mergePathProgress(b, a).labs).toEqual(merged.labs);
    expect(sanitizePathProgress({ items: {}, stops: {} }).labs).toEqual({});
    expect(pathProgressSchema.parse({ items: {}, stops: {}, checkpoint: null, goal: null }).labs).toEqual({});
  });

  it("drops malformed lab records and over-long ids", () => {
    const clean = sanitizePathProgress({
      labs: {
        good: { n: 1, c: 2, t: 3, at: 4 },
        scored_above_total: { n: 1, c: 9, t: 3, at: 4 },
        [`x${"y".repeat(64)}`]: { n: 1, c: 1, t: 1, at: 1 },
      },
    });
    expect(Object.keys(clean.labs)).toEqual(["good"]);
  });
});
