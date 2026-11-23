import { describe, expect, it } from "vitest";
import { pbqRegistry } from "..";

/**
 * CompTIA's domain names for each exam, in CompTIA's order, as its five exam
 * pages gave them on November 22, 2026. A lab page prints "Domain 1:" followed
 * by the lab's own `domain_title`, so a lab filed under a name that CompTIA
 * does not use ("Networking Fundamentals" for N10-009's "Networking concepts")
 * put a second, wrong heading for the same domain on the page.
 */
const COMPTIA_DOMAINS: Record<string, readonly string[]> = {
  "security-plus-sy0-701": [
    "General security concepts",
    "Threats, vulnerabilities, and mitigations",
    "Security architecture",
    "Security operations",
    "Security program management and oversight",
  ],
  "security-plus-sy0-801": [
    "General Security Concepts",
    "Threats, Vulnerabilities, and Attacks",
    "Security Architecture",
    "Security Operations",
    "Security Program Management and Oversight",
  ],
  "network-plus-n10-009": [
    "Networking concepts",
    "Network implementation",
    "Network operations",
    "Network security",
    "Network troubleshooting",
  ],
  "a-plus-core1-220-1201": [
    "Mobile devices",
    "Networking",
    "Hardware",
    "Virtualization and cloud computing",
    "Hardware and network troubleshooting",
  ],
  "a-plus-core2-220-1202": ["Operating systems", "Security", "Software troubleshooting", "Operational procedures"],
};

describe("the domain a lab is filed under", () => {
  it("covers every exam that has labs", () => {
    expect(Object.keys(pbqRegistry).sort()).toEqual(Object.keys(COMPTIA_DOMAINS).sort());
  });

  it.each(Object.keys(COMPTIA_DOMAINS))("carries CompTIA's name for that domain: %s", (cert) => {
    const domains = COMPTIA_DOMAINS[cert];
    const labs = pbqRegistry[cert];
    expect(labs.length).toBeGreaterThan(0);
    for (const lab of labs) {
      expect(lab.domain_number, lab.id).toMatch(/^[1-5]\.0$/);
      const name = domains[Number(lab.domain_number[0]) - 1];
      expect(name, `${lab.id}: ${cert} has no domain ${lab.domain_number}`).toBeDefined();
      // Capitals are a matter of style (lab data is in title case); the words are CompTIA's.
      expect(lab.domain_title.toLowerCase(), lab.id).toBe(name.toLowerCase());
    }
  });

  it("gives each domain of an exam one name across all of its labs", () => {
    for (const [cert, labs] of Object.entries(pbqRegistry)) {
      const names = new Map<string, Set<string>>();
      for (const lab of labs) {
        names.set(lab.domain_number, (names.get(lab.domain_number) ?? new Set()).add(lab.domain_title));
      }
      for (const [number, titles] of names) expect([...titles], `${cert} domain ${number}`).toHaveLength(1);
    }
  });
});
