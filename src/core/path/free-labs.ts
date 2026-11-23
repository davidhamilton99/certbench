import type { PbqScenario } from "@/data/pbq/types";

/**
 * How many of an exam's labs are free on its public page of labs: the first
 * LABS_WITHOUT_ACCOUNT with no account, and the rest with a free account. AI
 * answers and search rank PBQ resources by how many they give away, so most
 * of an exam's labs are free. Pro opens every one on the study path, with
 * progress kept. An exam that has no public page of labs (Security+ SY0-801
 * today) has no free lab.
 */
export const FREE_LAB_COUNT = 12;

/**
 * How many of those free labs need no account at all: the three that a PBQ
 * page's chooser leads with (an introductory lab, a core lab and one at exam
 * level; they are the first three that freeLabs returns). A free account opens
 * the rest of the free labs. The chooser, the page's summary and the help page
 * all take the number from here, so that none can say another.
 */
export const LABS_WITHOUT_ACCOUNT = 3;

/**
 * What an exam gives away on its public pages, as its study path needs it in
 * order to say so: where the free practice exam is, where the free labs are,
 * and which labs they are. The study path's own page works this out on the
 * server (it knows the public pages) and hands it to the outline, so that a
 * row never says "Included with Pro" about something that is free.
 */
export interface FreeOnPublicPages {
  /** The exam's public practice exam page, where one full practice exam is free. */
  examHref: string;
  /** The exam's public page of labs, or null for an exam that has no such page. */
  labsHref: string | null;
  /** The ids of the labs that are free on that page. Empty when there is no page. */
  labIds: string[];
}

/** Difficulty rank per PBQ type: the on-ramp leads with the lowest. */
export function labRank(type: PbqScenario["type"]): number {
  return {
    ordering: 1,
    "threat-hunt": 2,
    matching: 2,
    categorization: 3,
    topology: 4,
    simulation: 5,
  }[type];
}

/**
 * The free labs, in the order a PBQ page offers them. First the three its
 * chooser leads with: a warm-up, a core lab and an exam-level one. Then one of
 * each kind the exam has that isn't in yet, so every PBQ format is there to
 * try. Then the rest a domain at a time, easiest first in each, which leaves
 * most of the hands-on simulations for Pro. Stable for given data: the same
 * labs on every build.
 */
export function freeLabs(scenarios: readonly PbqScenario[], count = FREE_LAB_COUNT): PbqScenario[] {
  // A stable sort: within a rank, the order the exam's data lists them.
  const pool = [...scenarios].sort((a, b) => labRank(a.type) - labRank(b.type));
  const chosen: PbqScenario[] = [];
  const seen = new Set<string>();
  const add = (s?: PbqScenario) => {
    if (s && !seen.has(s.id) && chosen.length < count) {
      seen.add(s.id);
      chosen.push(s);
    }
  };

  add(pool[0]); // the warm-up
  add(pool.find((s) => labRank(s.type) >= 2 && labRank(s.type) <= 3)); // a core one
  add([...pool].reverse().find((s) => labRank(s.type) >= 4)); // an exam-level one

  // Every kind of PBQ the exam has, easiest kind first.
  for (const type of [...new Set(pool.map((s) => s.type))]) {
    if (!chosen.some((s) => s.type === type)) add(pool.find((s) => s.type === type));
  }

  // The rest, a domain at a time.
  const byDomain = new Map<string, PbqScenario[]>();
  for (const s of pool) {
    if (seen.has(s.id)) continue;
    const list = byDomain.get(s.domain_number) ?? [];
    list.push(s);
    byDomain.set(s.domain_number, list);
  }
  const domains = [...byDomain.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  for (let round = 0; chosen.length < count; round++) {
    const turn = domains.map((d) => byDomain.get(d)?.[round]).filter((s): s is PbqScenario => Boolean(s));
    if (turn.length === 0) break;
    turn.forEach(add);
  }
  return chosen;
}
