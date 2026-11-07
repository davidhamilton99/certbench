import { describe, expect, it } from "vitest";
import { domainLab } from "../labs";
import { pbqRegistry } from "@/data/pbq";
import { PATH_CERTS } from "../types";
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
      "a-plus-core1-220-1101": 5,
      "a-plus-core2-220-1102": 4,
    };
    for (const cert of PATH_CERTS) {
      for (let d = 1; d <= domains[cert]; d++) {
        expect(domainLab(pbqRegistry[cert], `${d}.0`), `${cert} ${d}.0`).toBeDefined();
      }
    }
  });
});
