import { describe, expect, it } from "vitest";
import { pbqRegistry } from "@/data/pbq";
import type { PbqScenario } from "@/data/pbq/types";
import { FREE_LAB_COUNT, freeLabs, labRank } from "../free-labs";

/** Only what the pick reads: an id, a kind and a domain. */
function lab(id: string, type: PbqScenario["type"], domain: string): PbqScenario {
  return { id, type, domain_number: domain, domain_title: `Domain ${domain}`, title: id } as PbqScenario;
}

const EXAM: PbqScenario[] = [
  lab("sim-a", "simulation", "3.0"),
  lab("sim-b", "simulation", "4.0"),
  lab("topo", "topology", "3.0"),
  lab("hunt", "threat-hunt", "4.0"),
  lab("order-1", "ordering", "1.0"),
  lab("order-2", "ordering", "5.0"),
  lab("match-1", "matching", "2.0"),
  lab("match-2", "matching", "1.0"),
  lab("sort-1", "categorization", "2.0"),
  lab("sort-2", "categorization", "5.0"),
  lab("order-3", "ordering", "4.0"),
  lab("match-3", "matching", "3.0"),
  lab("sort-3", "categorization", "1.0"),
  lab("sim-c", "simulation", "5.0"),
];

describe("freeLabs", () => {
  it("leads with a warm-up, a core lab and an exam-level one", () => {
    const [warmUp, core, examLevel] = freeLabs(EXAM);
    expect(labRank(warmUp.type)).toBe(1);
    expect(labRank(core.type)).toBeGreaterThanOrEqual(2);
    expect(labRank(core.type)).toBeLessThanOrEqual(3);
    expect(labRank(examLevel.type)).toBeGreaterThanOrEqual(4);
  });

  it("gives away every kind the exam has, and every domain, but keeps most simulations back", () => {
    const free = freeLabs(EXAM, 9);
    expect(new Set(free.map((s) => s.type))).toEqual(new Set(EXAM.map((s) => s.type)));
    expect(new Set(free.map((s) => s.domain_number))).toEqual(new Set(EXAM.map((s) => s.domain_number)));
    expect(free.filter((s) => s.type === "simulation").length).toBeLessThan(
      EXAM.filter((s) => s.type === "simulation").length
    );
  });

  it("never repeats a lab, stops at the count, and picks the same labs every time", () => {
    const free = freeLabs(EXAM);
    expect(free).toHaveLength(FREE_LAB_COUNT);
    expect(new Set(free.map((s) => s.id)).size).toBe(free.length);
    expect(freeLabs(EXAM).map((s) => s.id)).toEqual(free.map((s) => s.id));
    expect(freeLabs(EXAM.slice(0, 5))).toHaveLength(5);
    expect(freeLabs([])).toEqual([]);
  });

  it("gives each exam with a PBQ page the formats its page names", () => {
    const kinds = (cert: string) => new Set(freeLabs(pbqRegistry[cert] ?? []).map((s) => s.type));
    for (const cert of ["security-plus-sy0-701", "network-plus-n10-009", "a-plus-core1-220-1201", "a-plus-core2-220-1202"]) {
      const all = pbqRegistry[cert] ?? [];
      expect(freeLabs(all)).toHaveLength(FREE_LAB_COUNT);
      expect(kinds(cert)).toEqual(new Set(all.map((s) => s.type)));
    }
    expect([...kinds("security-plus-sy0-701")]).toEqual(expect.arrayContaining(["simulation", "topology", "threat-hunt"]));
    expect([...kinds("network-plus-n10-009")]).toEqual(expect.arrayContaining(["simulation", "topology"]));
    expect(kinds("a-plus-core1-220-1201").has("simulation")).toBe(true);
    expect(kinds("a-plus-core2-220-1202").has("simulation")).toBe(true);
  });
});
