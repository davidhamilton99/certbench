import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { A_PLUS_V15 } from "@/data/a-plus-v15";
import { A_PLUS_CORE1_CERT } from "../exam-versions";

/**
 * Migration 033 (supabase/migrations/033_a_plus_objective_titles.sql) takes a
 * contraction out of two A+ Core 1 objective titles. The public pages print an
 * objective's title as the database stores it, so the words can be corrected
 * only there. The owner runs the file by hand.
 *
 * These checks hold the file to what its header says: one update of two
 * titles, which finds them as migration 029 wrote them and leaves no A+
 * objective title with a contraction.
 */
const ROOT = process.cwd();
const FILE = readFileSync(join(ROOT, "supabase/migrations/033_a_plus_objective_titles.sql"), "utf8");
const LINES = FILE.split(/\r?\n/);
const OLD = "what they're for";
const NEW = "what they are for";
const CODES = ["2.1", "2.8"];

/** The migration's statements, without its comments. */
const statements = LINES.filter((line) => !line.trim().startsWith("--"))
  .join(" ")
  .split(";")
  .map((statement) => statement.replace(/\s+/g, " ").trim())
  .filter(Boolean);

/** The comments, as one text. */
const header = LINES.filter((line) => line.trim().startsWith("--"))
  .map((line) => line.replace(/^\s*-- ?/, ""))
  .join("\n");

/** A contraction, and not a possessive ("CompTIA's"). */
const CONTRACTION = /\b\w+'(?:re|ve|ll|d|t|m)\b|\b(?:it|that|there|what|who|here|let)'s\b/i;

const core1 = A_PLUS_V15.find((exam) => exam.slug === A_PLUS_CORE1_CERT)!;

describe("migration 033: two A+ Core 1 objective titles", () => {
  it("does one thing, in one transaction", () => {
    expect(statements).toEqual([
      "begin",
      "update public.cert_sub_objectives s set title = replace(s.title, 'what they''re for', 'what they are for') " +
        "from public.cert_domains d join public.certifications c on c.id = d.certification_id " +
        "where s.domain_id = d.id and c.slug = 'a-plus-core1-220-1201' and s.code in ('2.1', '2.8') " +
        "and s.title like '%what they''re for'",
      "commit",
    ]);
  });

  it("finds the two titles as migration 029 wrote them", () => {
    expect(core1.slug).toBe("a-plus-core1-220-1201");
    const titles = core1.domains.flatMap((domain) => domain.objectives).filter((objective) => CODES.includes(objective.code));
    expect(titles.map((objective) => objective.title)).toEqual([
      `TCP and UDP ports, protocols and ${OLD}`,
      `Networking tools and ${OLD}`,
    ]);
    // 029 is the record of what was run: it holds the same two titles, with the apostrophe doubled as SQL writes it.
    const applied = readFileSync(join(ROOT, "supabase/migrations/029_a_plus_v15.sql"), "utf8");
    for (const { code, title } of titles) expect(applied).toContain(`'${code}', '${title.replace(/'/g, "''")}'`);
  });

  it("leaves no A+ objective title with a contraction", () => {
    // The update, as it acts on the titles that 029 wrote.
    const after = A_PLUS_V15.flatMap((exam) =>
      exam.domains.flatMap((domain) =>
        domain.objectives.map((objective) =>
          exam.slug === core1.slug && CODES.includes(objective.code) && objective.title.endsWith(OLD)
            ? objective.title.replace(OLD, NEW)
            : objective.title
        )
      )
    );
    expect(after.filter((title) => title.endsWith(NEW))).toHaveLength(CODES.length);
    expect(after.filter((title) => CONTRACTION.test(title))).toEqual([]);
    // Without the update there are exactly the two.
    const before = A_PLUS_V15.flatMap((exam) => exam.domains.flatMap((domain) => domain.objectives.map((objective) => objective.title)));
    expect(before.filter((title) => CONTRACTION.test(title))).toHaveLength(CODES.length);
  });

  it("says when it was run on the live database, and gives the read-only query before the update", () => {
    expect(header).toContain("RUN on the live database on 23 November 2026");
    expect(header).not.toContain("THIS FILE HAS NOT BEEN RUN.");
    const query = header.indexOf("select s.code, s.title");
    expect(query).toBeGreaterThan(-1);
    expect(header.slice(query)).toContain("where c.slug = 'a-plus-core1-220-1201'");
    expect(header.slice(query)).toContain("and s.code in ('2.1', '2.8')");
    // The query is in the header, which comes before the first statement.
    const firstStatement = LINES.findIndex((line) => line.trim() === "begin;");
    expect(LINES.findIndex((line) => line.includes("select s.code, s.title"))).toBeLessThan(firstStatement);
    expect(header).toContain("Afterwards, run Query 1 again.");
  });

  it("gives the undo: the same update with the two phrases exchanged", () => {
    const undo = header
      .slice(header.indexOf("To undo it"))
      .split("\n")
      .filter((line) => line.startsWith("  "))
      .map((line) => line.trim())
      .join(" ")
      .replace(/;$/, "");
    const exchanged = statements[1]
      .replace("replace(s.title, 'what they''re for', 'what they are for')", "replace(s.title, 'what they are for', 'what they''re for')")
      .replace("like '%what they''re for'", "like '%what they are for'");
    expect(undo).toBe(exchanged);
  });
});
