import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { domainOf } from "@/core/path/rehearsal";
import { fmtDay, longDate } from "@/core/path/versions";

const ROOT = process.cwd();
const PATH_DIR = join(ROOT, "src/components/path");

/** The study path's own source files, and the public practice exam that runs on its player. */
const FILES = [
  ...readdirSync(PATH_DIR)
    .filter((name) => /\.tsx?$/.test(name))
    .map((name) => join(PATH_DIR, name)),
  join(ROOT, "src/components/marketing/PracticeExam.tsx"),
  join(ROOT, "src/components/marketing/QuestionDeck.tsx"),
];

const source = (file: string) => readFileSync(file, "utf8");

describe("the helpers the study path shares", () => {
  // Copies drift: one fix to the wording of a date, or to the reading of a
  // domain, must not have to be made in several places.
  it("are defined once, in the core modules, and nowhere in the study path's files", () => {
    const copies = FILES.filter((file) =>
      /\b(?:const|function)\s+(?:longDate|fmtDay|domainOf)\b/.test(source(file))
    ).map((file) => file.slice(ROOT.length + 1));
    expect(copies).toEqual([]);
  });

  it("read a date and a domain as the copies did", () => {
    expect(longDate("2027-06-11")).toBe("June 11, 2027");
    expect(fmtDay(new Date(2026, 2, 3, 12).getTime())).toBe("March 3");
    expect(domainOf("4.2")).toBe("4.0");
    expect(domainOf("4")).toBe("4");
  });

  // A type exported for nobody is a half-made change: the next writer has to
  // find out that nothing reads it.
  it("export no type of the progress hook that nothing imports", () => {
    expect(source(join(PATH_DIR, "usePathProgress.ts"))).not.toMatch(/\bPathProgressState\b/);
  });

  // Each player's keys act only while the focus is inside it, so one key
  // press can reach one player only, and a page-wide turn decided nothing.
  it("include no page-wide turn for the keyboard", () => {
    expect(existsSync(join(PATH_DIR, "keyboard-turn.ts"))).toBe(false);
    const users = FILES.filter((file) => source(file).includes("keyboard-turn")).map((file) => file.slice(ROOT.length + 1));
    expect(users).toEqual([]);
  });
});

describe("the study path's files and the page's own rules", () => {
  /** Every file of the study path that draws something, the public practice exam's and the home page's sheet included. */
  const DRAWN = [
    ...FILES,
    join(ROOT, "src/components/home/SampleQuestions.tsx"),
    join(ROOT, "src/app/(path)/start/lead.tsx"),
  ];
  const named = (files: string[]) => files.map((file) => file.slice(ROOT.length + 1));

  // The page keeps what it scrolls to clear of its sticky bar once, with
  // `scroll-padding-top` on the page (globals.css). A scroll margin of an
  // element's own was added to that, and a jump landed far below the bar.
  it("set no scroll margin of their own", () => {
    expect(named(DRAWN.filter((file) => /(?<![\w-])scroll-mt-/.test(source(file))))).toEqual([]);
  });

  // An icon's tile is tinted with the token that every selected thing uses
  // (bg-tint-selected), so that one change to the tint reaches all of them.
  it("tint an icon's tile with the tint token, never with a tint of the pressable colour of their own", () => {
    expect(named(DRAWN.filter((file) => /(?<![\w-])bg-primary\/(?:10|\[0\.08\])(?![\w])/.test(source(file))))).toEqual([]);
  });

  // `cb-measure` is the measure for 17px text. Small text set at it runs to
  // about 90 characters a line; `cb-measure-sm` is its own measure.
  it("set small text at the small text's measure", () => {
    const wide = DRAWN.filter((file) =>
      [...source(file).matchAll(/className="([^"]*)"/g)].some(
        ([, classes]) => /(?:^|\s)cb-measure(?:\s|$)/.test(classes) && /(?:^|\s)text-small(?:\s|$)/.test(classes)
      )
    );
    expect(named(wide)).toEqual([]);
  });
});
