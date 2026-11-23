// @vitest-environment jsdom
import type { ReactElement } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

// Server render only: nothing here signs anyone in, reads the database or reaches an API.
vi.mock("@/lib/analytics", () => ({ track: vi.fn(), identifyUser: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

const INVENTORY = vi.hoisted(() => [
  {
    cert: "security-plus-sy0-801",
    name: "Security+",
    code: "SY0-801",
    questions: 1008,
    objectives: "27 objectives",
    labs: 20,
    exam: { href: "/security-plus-sy0-801-practice-test", label: "90 questions in 90 minutes" },
    path: "/path/security-plus-sy0-801",
  },
  {
    cert: "security-plus-sy0-701",
    name: "Security+",
    code: "SY0-701",
    questions: 842,
    objectives: "28 objectives",
    labs: 19,
    exam: { href: "/security-plus-practice-test", label: "90 questions in 90 minutes" },
    path: "/path/security-plus-sy0-701",
  },
]);
vi.mock("@/server/path/inventory", () => ({ examInventory: async () => INVENTORY }));
// The table is another package's component: here it only has to be handed the rows.
vi.mock("@/components/home/Inventory", () => ({
  Inventory: ({ rows }: { rows: { cert: string; name: string; code: string }[] }) => (
    <table data-testid="inventory">
      <tbody>
        {rows.map((row) => (
          <tr key={row.cert}>
            <th scope="row">
              {row.name} {row.code}
            </th>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));
// The players are other packages' components: these pages only have to place them.
vi.mock("@/components/marketing/QuestionDeck", () => ({
  QuestionDeck: ({ questions, label }: { questions: unknown[]; label: string }) => (
    <div data-testid="deck" data-count={questions.length}>
      {label}
    </div>
  ),
}));
vi.mock("@/components/path/QuickRound", () => ({ QuickRound: () => <div data-testid="round" /> }));

const HUB = vi.hoisted(() => ({
  certSlug: "security-plus-sy0-701",
  certName: "CompTIA Security+",
  shortCertName: "Security+",
  examCode: "SY0-701",
  objectiveCount: 3,
  domains: [
    {
      number: "1.0",
      title: "General Security Concepts",
      weight: 12,
      objectives: [
        { code: "1.1", title: "Compare and contrast various types of security controls", topic: "Security controls", slug: "1-1" },
        { code: "1.2", title: "Summarize fundamental security concepts", topic: "Core security concepts", slug: "1-2" },
      ],
    },
    {
      number: "2.0",
      title: "Threats, Vulnerabilities, and Mitigations",
      weight: 22,
      objectives: [{ code: "2.1", title: "Compare and contrast common threat actors and motivations", topic: "Threat actors", slug: "2-1" }],
    },
    { number: "3.0", title: "Security Architecture", weight: 18, objectives: [] },
  ],
}));
vi.mock("@/server/seo/objective-data", () => ({
  loadObjectiveHub: async (cert: string) => (cert === HUB.certSlug ? HUB : null),
  loadObjectivePage: async () => null,
  listObjectivePages: async () => [],
}));

import AboutPage, { metadata as aboutMetadata } from "@/app/(marketing)/about/page";
import EducatorsPage, { metadata as educatorsMetadata } from "@/app/(marketing)/educators/page";
import HelpPage, { metadata as helpMetadata } from "@/app/(marketing)/help/page";
import VsPage from "@/app/(marketing)/compare/[slug]/page";
import ObjectiveHubPage from "@/app/(marketing)/objectives/[cert]/page";
import SecurityPlusV8Page, { metadata as v8Metadata } from "@/app/(marketing)/security-plus-sy0-801/page";
import SecurityPlusVersionsPage, { metadata as versionsMetadata } from "@/app/(marketing)/security-plus-sy0-801-vs-sy0-701/page";
import Sy0801AiQuestionsPage, { metadata as aiMetadata } from "@/app/(marketing)/security-plus-sy0-801-ai-practice-questions/page";
import { ObjectiveLanding, type ObjectiveLandingData } from "@/components/marketing/ObjectiveLanding";
import { longDate } from "@/core/path/versions";
import { FREE_LAB_COUNT } from "@/core/path/free-labs";
import { SY0_801_AI_QUESTIONS, SY0_801_AI_TOPICS, SY0_801_DOMAINS } from "@/data/security-plus-v8";
import { PASS_GUARANTEE_HREF } from "@/lib/pricing/guarantee";
import {
  PRO_ADDON_TERMS,
  PRO_PRICE_REGION_NOTE,
  PRO_PRICE_SHORT,
  PRO_PRICE_TERMS,
  PRO_PRICES,
  PRO_SCOPE_TERMS,
} from "@/lib/pricing/terms";
import { EXAMS_WITH_FREE_LABS } from "@/lib/seo/cert-pages";
import { COMPARISON_PAGES_UPDATED_ISO, VS_PAGES } from "@/lib/seo/comparison-pages";
import {
  COMPTIA_URLS,
  EXAM_FACTS_CHECKED,
  SECURITY_PLUS_CERT,
  SECURITY_PLUS_DOMAIN_CHANGES,
  SECURITY_PLUS_VERSIONS_PATH,
  SY0_801_AI_PATH,
  SY0_801_CERT,
  SY0_801_PATH,
  SY0_801_PRACTICE_PATH,
} from "@/lib/seo/exam-versions";

/** The page as served, parsed: what search, an AI answer and a screen reader are given. */
function served(element: ReactElement): Document {
  return new DOMParser().parseFromString(renderToString(element), "text/html");
}

const text = (el: Element | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const headings = (doc: Document, level: 1 | 2 | 3) => [...doc.querySelectorAll(`h${level}`)].map(text);
const linkNamed = (doc: Document, name: string) => [...doc.querySelectorAll("a")].find((a) => text(a) === name);
const arrows = (doc: Document) => doc.querySelectorAll("svg.lucide-arrow-right, svg.lucide-arrow-up-right").length;
const jsonLd = (doc: Document) =>
  [...doc.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent ?? "{}"));

/** What every reading page has in common: one title on the scale, nothing centred, no frame of its own. */
function expectOneDocument(doc: Document) {
  expect(doc.querySelectorAll("h1")).toHaveLength(1);
  expect(doc.querySelector("h1")?.className).toContain("cb-title");
  // The frame (the header, the main region and the footer) is the layout's.
  expect(doc.querySelector("main, header.glass-nav, footer")).toBeNull();
  expect(doc.body.innerHTML).not.toMatch(/text-center|justify-items-center|cb-display|aurora-bg/);
  expect(doc.body.innerHTML).not.toMatch(/rounded-(?:xl|2xl|3xl|full)/);
  // Every heading after the title is on the scale or is plain text at a text size: none carries a size of its own.
  for (const h of doc.querySelectorAll("h2, h3")) expect(h.className, text(h)).not.toMatch(/text-\[|text-(?:xl|2xl|3xl|4xl)/);
}

/** The navy band at the foot of a page: outside the page's column, so it runs from edge to edge. */
function band(doc: Document): Element {
  const sheet = doc.querySelector("section.cb-sheet");
  if (!sheet) throw new Error("The page has no closing band.");
  return sheet;
}

describe("/about", () => {
  const doc = served(<AboutPage />);

  it("is one document on the scale", () => {
    expectOneDocument(doc);
    expect(aboutMetadata.title).toBe("How CertBench is made");
    expect(headings(doc, 1)).toEqual(["How CertBench is made"]);
  });

  it("states the price itself, with the free plan before it", () => {
    const row = [...doc.querySelectorAll("dt")].find((dt) => text(dt) === "What it costs")!.parentElement!;
    // The practice exam is free for each exam. The labs are free for the exams that
    // have a public page of labs, which the sentence names: Security+ SY0-801 has none.
    expect(text(row)).toContain(
      `A free account also includes one full-length practice exam for each exam, and ${FREE_LAB_COUNT} hands-on labs for each of ${EXAMS_WITH_FREE_LABS}.`
    );
    expect(text(row)).not.toMatch(/hands-on labs for each exam/);
    expect(text(row)).toContain(PRO_PRICE_TERMS);
    expect(linkNamed(doc, "pricing page")?.getAttribute("href")).toBe("/pricing");
  });

  it("names the five CompTIA pages that were read, and the day", () => {
    const row = [...doc.querySelectorAll("dt")].find((dt) => text(dt) === "Against CompTIA's published information")!
      .parentElement!;
    expect(text(row)).toContain(`All five were read on ${EXAM_FACTS_CHECKED}`);
    const hrefs = [...row.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    // The five exam pages, and the article that gave the day the previous A+ exams retired.
    expect(hrefs).toEqual([
      COMPTIA_URLS.securityV7,
      COMPTIA_URLS.securityV8,
      COMPTIA_URLS.networkPlus,
      COMPTIA_URLS.aPlusCore1,
      COMPTIA_URLS.aPlusCore2,
      COMPTIA_URLS.aPlusSeries,
    ]);
    expect(text(row)).toContain(
      "The date on which the previous A+ exams retired is not on those pages: it is from CompTIA's article about the two A+ exams, which was read on the same day."
    );
  });

  it("explains the missing scaled score with what CompTIA states and what CertBench does not know", () => {
    const row = text([...doc.querySelectorAll("dt")].find((dt) => text(dt) === "Why it is not a score out of 900")?.parentElement);
    expect(row).toContain("CompTIA states its passing scores on a scale of 100 to 900.");
    expect(row).toContain("CertBench does not know how answers are converted to that scale");
    expect(row).not.toMatch(/does not publish|No practice test can/);
  });

  // The Network+ questions are grouped into topics of CertBench's own, which are
  // not CompTIA's objectives, and CompTIA publishes no rule for an unanswered
  // question that the facts file holds: the page says what CertBench does.
  it("says where the questions come from in words that hold for Network+, and claims no rule of the real exam", () => {
    const row = (term: string) => text([...doc.querySelectorAll("dt")].find((dt) => text(dt) === term)?.parentElement);
    expect(row("Written for CertBench")).toContain("Every question is written for CertBench. No question is taken from a real exam");
    expect(row("Written for CertBench")).not.toContain("objectives");
    const linked = row("Linked to an objective or a topic");
    expect(linked).toContain("Each question is linked to the objective or topic that it tests");
    expect(linked).toContain("Network+ is the exception. Its questions are grouped into topics of CertBench's own");
    expect(row("What it measures")).toContain("A question left unanswered counts as incorrect.");
    expect(text(doc.body)).not.toMatch(/as it does in the exam|linked to the exam objective that it tests/);
    // A practice exam shows no answer until the end, so the explanation at once is the study path's.
    expect(row("Explained")).toContain("On the study path, a short version is shown as soon as you answer.");
  });

  it("ends on the band, which starts the study path", () => {
    const sheet = band(doc);
    expect(text(sheet.querySelector("h2"))).toBe("Try the questions");
    expect(linkNamed(doc, "Choose your exam")?.getAttribute("href")).toBe("/start");
    // The band is not inside the page's column.
    expect(sheet.previousElementSibling?.querySelector("h1")).not.toBeNull();
    expect(arrows(doc)).toBe(1);
  });
});

describe("/educators", () => {
  let doc: Document;
  beforeAll(async () => {
    doc = served(await EducatorsPage());
  });

  it("is one document on the scale, with its sections in order", () => {
    expectOneDocument(doc);
    expect(educatorsMetadata.title).toBe("For educators");
    expect(headings(doc, 2)).toEqual([
      "What CertBench covers",
      "How CertBench supports a course",
      "How the questions are written and checked",
      "What students can use free of charge",
      "What CertBench does not do",
      "Student accounts and privacy",
      "Arranging access for a class",
      "Review the questions yourself",
    ]);
  });

  it("answers whether a class can use it, with the limits, before the first section", () => {
    const intro = doc.querySelector("header")!;
    expect(text(intro)).toContain(
      "A course can use CertBench at no cost to the institution, because students can begin with free accounts. CertBench does not have class lists or reports for instructors, and it does not connect to a learning management system."
    );
    // The introduction comes before every section heading.
    const firstSection = doc.querySelector("h2")!;
    expect(intro.compareDocumentPosition(firstSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("links the introduction to the section on arranging access, which is the last one", () => {
    const link = linkNamed(doc, "the last section of this page")!;
    expect(link.getAttribute("href")).toBe("#class-access");
    expect(link.className).toContain("cb-link");
    const target = doc.getElementById("class-access")!;
    expect(text(target.querySelector("h2"))).toBe("Arranging access for a class");
    // Nothing but the closing band follows it.
    const sections = [...doc.querySelectorAll("section")];
    expect(sections.indexOf(target)).toBe(sections.length - 2);
    expect(sections[sections.length - 1]).toBe(band(doc));
  });

  it("gives the address as text, with a subject on the link so that the message arrives sorted", () => {
    const target = doc.getElementById("class-access")!;
    const mail = target.querySelector('a[href^="mailto:"]')!;
    expect(mail.getAttribute("href")).toBe("mailto:support@certbench.dev?subject=Access%20for%20a%20class");
    expect(text(mail)).toBe("support@certbench.dev");
    expect(text(target)).toContain("include the course, the exam and the number of students");
    expect(text(target)).toContain("CertBench does not have class lists or reports for instructors");
  });

  it("states what Pro costs a student, from the one wording of the price", () => {
    const section = [...doc.querySelectorAll("section")].find((s) => text(s.querySelector("h2")) === "What students can use free of charge")!;
    expect(text(section)).toContain(`For an individual student, ${PRO_PRICE_SHORT}. ${PRO_PRICE_REGION_NOTE}`);
    expect(text(section)).toContain(PRO_PRICES.annual);
    expect(linkNamed(doc, "pricing page")?.getAttribute("href")).toBe("/pricing");
  });

  it("says that the two Security+ rows share most of their questions, and when the facts were checked", () => {
    const section = [...doc.querySelectorAll("section")].find((s) => text(s.querySelector("h2")) === "What CertBench covers")!;
    expect(text(section)).toContain(
      "Most of the Security+ SY0-801 questions are also in the SY0-701 bank, so the two Security+ rows should not be added together."
    );
    expect(text(section)).toContain(
      `were last checked against CompTIA's exam pages, and its article on the two A+ exams, on ${EXAM_FACTS_CHECKED}.`
    );
    expect(text(section)).not.toContain("Each exam has its own question bank");
    expect(section.querySelectorAll('[data-testid="inventory"] tbody tr')).toHaveLength(INVENTORY.length);
  });

  // CompTIA's exam pages state that the exams have performance-based questions,
  // and nothing about what they ask; the Network+ topics are CertBench's own.
  it("says what the labs are, what CompTIA states of the exam's performance-based questions, and what a question is linked to", () => {
    const row = (term: string) => text([...doc.querySelectorAll("dt")].find((dt) => text(dt) === term)?.parentElement);
    const labs = row("Hands-on practice");
    expect(labs).toContain(
      "The Security+, Network+ and A+ exams have performance-based questions as well as multiple-choice questions, and CompTIA does not publish which topics they test."
    );
    expect(labs).toContain("in a lab, a student carries out a task in the browser instead of choosing an answer.");
    expect(labs).not.toMatch(/work like/);
    expect(row("Practice by objective")).toContain(
      "Every question is linked to the exam objective that it tests or, for Network+, to a topic of CertBench's own."
    );
    expect(row("Original questions")).toContain("Every question is written for CertBench. No question is taken from a real exam.");
    expect(row("Original questions")).not.toContain("objectives");
    // The objective pages by the name the page gives them above, with Network+'s topics.
    expect(text(doc.body)).toContain(
      "The page of practice questions for each objective of Security+ SY0-701 and A+, and for each Network+ topic."
    );
    expect(text(doc.body)).not.toContain("The practice pages for the exam objectives");
  });

  it("says what the free practice exam is not suited to, and names the exams whose page publishes its answers", () => {
    expect(text(doc.body)).toContain(
      "The free practice exam is the same for every student, and for Security+ SY0-701, Network+ and A+ its questions and answers are also published on the practice-test page, so it is suited to practice and not to graded assessment."
    );
    // The SY0-801 page lists 45 other questions with their answers, and not the
    // exam's: its PracticeExam has no list. The other pages' exams list theirs.
    const examElement = (file: string) =>
      readFileSync(join(process.cwd(), file), "utf8").match(/<PracticeExam\s[\s\S]*?\/>/)?.[0] ?? "";
    const sy0801 = examElement("src/app/(marketing)/security-plus-sy0-801-practice-test/page.tsx");
    expect(sy0801).toContain("testId");
    expect(sy0801).not.toContain("listTitle");
    expect(examElement("src/components/marketing/PracticeTestLanding.tsx")).toContain("listTitle");
  });

  it("ends on the band, set outside the column, with no arrow on either button", () => {
    const sheet = band(doc);
    expect(sheet.previousElementSibling?.querySelector("h1")).not.toBeNull();
    const buttons = [...sheet.querySelectorAll("a")];
    // A link to the exam list inside a page has one name on every page.
    expect(buttons.map(text)).toEqual(["Open the Security+ practice exam", "Choose your exam"]);
    expect(buttons.map((a) => a.getAttribute("href"))).toEqual(["/security-plus-practice-test", "/start"]);
    expect(arrows(doc)).toBe(0);
  });
});

describe("/help", () => {
  const doc = served(<HelpPage />);
  const answerTo = (question: string) => {
    const h = [...doc.querySelectorAll("h3")].find((el) => text(el) === question);
    if (!h) throw new Error(`No question reads "${question}".`);
    return text(h.parentElement);
  };

  it("is one document on the scale, in sentence case", () => {
    expectOneDocument(doc);
    expect(helpMetadata.title).toBe("Help center");
    expect(headings(doc, 1)).toEqual(["Help center"]);
    expect(headings(doc, 2)).toEqual([
      "Contents",
      "Getting started",
      "The study path",
      "The readiness score",
      "Spaced review",
      "Labs and practice exams",
      "Account and billing",
      "If your question is not answered here",
    ]);
  });

  it("sets every question as a heading under its section", () => {
    const questions = headings(doc, 3);
    expect(questions).toHaveLength(24);
    for (const q of questions) expect(q.endsWith("?")).toBe(true);
    expect(doc.querySelector("dl")).toBeNull();
  });

  it("lists its sections, and each link leads to one", () => {
    const contents = doc.querySelector('nav[aria-labelledby="help-contents"]')!;
    expect(text(doc.getElementById("help-contents"))).toBe("Contents");
    const links = [...contents.querySelectorAll("a")];
    expect(links.map(text)).toEqual(headings(doc, 2).slice(1, 7));
    for (const link of links) {
      const target = doc.getElementById(link.getAttribute("href")!.slice(1));
      expect(target?.tagName).toBe("SECTION");
      expect(text(target?.querySelector("h2"))).toBe(text(link));
    }
  });

  it("states the price and what one plan covers in the one wording, and types no price by hand", () => {
    const answer = answerTo("What does Pro cost, and what does it include?");
    expect(answer).toContain(PRO_PRICE_TERMS);
    expect(answer).toContain(PRO_SCOPE_TERMS);
    expect(linkNamed(doc, "Read the guarantee terms")?.getAttribute("href")).toBe(PASS_GUARANTEE_HREF);
    // An added exam is one payment, and it stays open only while the Pro plan is
    // active: the one wording of that, from the pricing terms, with the region note.
    const added = answerTo("Can I study for more than one exam?");
    expect(added).toContain(`${PRO_ADDON_TERMS} ${PRO_PRICE_REGION_NOTE}`);
    expect(added).toContain(`a single payment of ${PRO_PRICES.quarterly}. The exam stays open while your Pro plan is active.`);
    expect(added).not.toMatch(/for as long as you have Pro/);
    const source = readFileSync(join(process.cwd(), "src/app/(marketing)/help/page.tsx"), "utf8");
    expect(source).not.toMatch(/\$\d/);
  });

  it("describes the free plan as it is: a full practice exam, and 12 labs with a free account for the exams that have a page of labs", () => {
    const answer = answerTo("Is CertBench free?");
    expect(answer).toContain("take a full-length practice exam (90 questions in 90 minutes, or a half-length exam of 45 questions)");
    expect(answer).toContain("try the first three hands-on labs");
    expect(answer).toContain(
      `A free account shows your practice exam score, opens nine more hands-on labs so that ${FREE_LAB_COUNT} are free for each of ${EXAMS_WITH_FREE_LABS}`
    );
    // Security+ SY0-801 has no free lab, so neither answer says "for each exam" of the labs.
    expect(answer).not.toMatch(/free for each exam/);
    expect(answerTo("What are PBQs, and how do the labs work?")).toContain(
      `${EXAMS_WITH_FREE_LABS} each have a PBQ page with ${FREE_LAB_COUNT} labs that are free: three with no account, and the rest with a free account.`
    );
  });

  // What CertBench does, in its own words: nothing about the real exam's wording
  // or its rules, and of the exam's performance-based questions only what
  // CompTIA's exam pages state.
  it("says what CertBench does, and claims nothing about the real exam's wording or its rules", () => {
    expect(answerTo("What is CertBench?")).toContain("A step begins with short questions and then moves to exam-style questions.");
    expect(answerTo("How does the study path work?")).toContain(
      "beginning with short questions and ending with an exam-style question."
    );
    expect(answerTo("Why did my score go down?")).toContain("Unanswered questions count as incorrect. Each practice exam result");
    expect(answerTo("What is the practice exam?")).toContain("Unanswered questions count as incorrect. The practice exam is the last step");
    expect(answerTo("What are PBQs, and how do the labs work?")).toContain(
      "The Security+, Network+ and A+ exams have performance-based questions (PBQs) as well as multiple-choice questions, and CompTIA does not publish which topics they test."
    );
    expect(answerTo("Can I flag questions?")).toContain("you can move to any question from the question grid. If you leave");
    // The checkpoint is weighted by the domains' published shares; nothing is said of how the real exam is scored.
    expect(answerTo("What is the readiness checkpoint?")).toContain("weighted in the same way as the domains of the real exam");
    expect(text(doc.body)).not.toMatch(
      /wording of the real exam|as they do in the exam|hands-on tasks in real|as in the real exam|same way as the real exam/
    );
  });

  // The answers speak for every exam, and a Network+ step is a topic of
  // CertBench's own, so a step's subject is called a topic, which the page
  // defines for each exam.
  it("calls a step's subject a topic, which for Security+ and A+ is one of CompTIA's objectives", () => {
    expect(answerTo("How does the study path work?")).toContain(
      "For Security+ and A+, each topic is one of CompTIA’s exam objectives. The Network+ topics are CertBench’s own. Most steps cover one topic"
    );
    expect(answerTo("Where do I start?")).toContain("You then study your first topic and take the readiness checkpoint");
    expect(answerTo("What is the readiness checkpoint?")).toContain("It follows your first topic");
    expect(text(doc.body)).not.toMatch(/your first objective|one objective|each objective|an objective as/);
  });

  it("mentions nothing that CertBench no longer offers", () => {
    const page = text(doc.body);
    expect(page).not.toMatch(/study sets?|your (?:own )?notes|AI[- ](?:generated|question|quiz)|flashcards?|diagnostic|daily plan|dashboard/i);
    // The words the product itself uses.
    expect(page).not.toMatch(/\bwarm-?ups?\b|\brehearsals?\b|guided path|interactive PBQs/i);
  });

  it("names the delete section as the profile page names it", () => {
    const profile = readFileSync(join(process.cwd(), "src/components/workspace/ProfileSettings.tsx"), "utf8");
    expect(profile).toContain("Delete your account");
    const answer = answerTo("Can I delete my account?");
    expect(answer).toContain("type DELETE in the section named “Delete your account”");
    expect(answer).toContain("Deleting your account also cancels your Pro subscription.");
  });

  it("underlines every link", () => {
    const links = [...doc.querySelectorAll("a")];
    expect(links.length).toBeGreaterThan(12);
    for (const link of links) expect(link.className, text(link)).toContain("cb-link");
    expect(arrows(doc)).toBe(0);
  });
});

describe("/security-plus-sy0-801", () => {
  const doc = served(<SecurityPlusV8Page />);
  const objectiveCount = SY0_801_DOMAINS.reduce((n, d) => n + d.objectives.length, 0);

  it("is one document on the scale, titled in sentence case", () => {
    expectOneDocument(doc);
    expect(v8Metadata.title).toBe("Security+ SY0-801: exam objectives, domains and launch date");
    expect(headings(doc, 1)).toEqual([`Security+ SY0-801: the exam, its domains and all ${objectiveCount} objectives`]);
    expect(headings(doc, 2).slice(0, 4)).toEqual([
      "At a glance",
      "Domains and objectives",
      "What changed from SY0-701",
      "The new AI objective",
    ]);
  });

  it("states the launch as a date that has passed, everywhere", () => {
    const page = text(doc.body);
    expect(page).toContain("CompTIA launched it on November 17, 2026 and now recommends it.");
    expect(page).not.toMatch(/on or around|scheduled/i);
    expect(JSON.stringify(jsonLd(doc))).not.toMatch(/on or around|scheduled/i);
    expect(String(v8Metadata.description)).not.toMatch(/on or around|scheduled/i);
  });

  it("says what was checked against CompTIA's page, and when", () => {
    expect(text(doc.querySelector("header"))).toContain(
      `The dates, the format and the domain weights on this page were last checked against CompTIA's Security+ V8 page on ${EXAM_FACTS_CHECKED}.`
    );
    expect(linkNamed(doc, "Security+ V8 page")?.getAttribute("href")).toBe(COMPTIA_URLS.securityV8);
  });

  it("sets the exam's facts as a plain table with a header for every row", () => {
    const table = doc.querySelector("table")!;
    const rows = [...table.querySelectorAll("tbody tr")];
    expect(rows).toHaveLength(8);
    for (const row of rows) expect(row.querySelector("th")?.getAttribute("scope")).toBe("row");
    const fact = (label: string) => text(rows.find((row) => text(row.querySelector("th")) === label)?.querySelector("td"));
    expect(fact("Launch")).toBe("November 17, 2026");
    expect(fact("Time limit")).toBe("90 minutes");
    expect(fact("Passing score")).toBe("750 on a scale of 100 to 900");
    expect(table.closest(".glass")).toBeNull();
  });

  it("lists every domain with its share as a figure, and every objective, with no bars", () => {
    const domains = headings(doc, 3).filter((h) => h.startsWith("Domain "));
    expect(domains).toEqual(
      SY0_801_DOMAINS.map((d) => `Domain ${d.number.replace(/\.0$/, "")}: ${d.title} ${d.weight}% of the exam`)
    );
    // A row reads as words: the code, then the objective.
    expect(text(doc.querySelector("section li"))).toBe("1.1 Concepts and controls");
    const section = [...doc.querySelectorAll("section")].find((s) => text(s.querySelector("h2")) === "Domains and objectives")!;
    expect(section.querySelectorAll("li")).toHaveLength(objectiveCount);
    // A bar drawn against the largest domain made 27% look like the whole exam.
    expect(doc.querySelector("[style]")).toBeNull();
    expect(section.innerHTML).not.toMatch(/bg-primary|h-1\.5/);
    expect(text(section).match(/New in SY0-801/g)).toHaveLength(1);
  });

  it("defines the topics of the new objective as terms and descriptions", () => {
    const section = [...doc.querySelectorAll("section")].find((s) => text(s.querySelector("h2")) === "The new AI objective")!;
    expect([...section.querySelectorAll("dt")].map(text)).toEqual(SY0_801_AI_TOPICS.map((t) => t.term));
    expect(section.querySelectorAll("dd")).toHaveLength(SY0_801_AI_TOPICS.length);
  });

  it("ends on the band: one button to the practice test, and the other ways on in one sentence", () => {
    const sheet = band(doc);
    // "Practice exam" in the band's words: "practice test" names the page in links and titles only.
    expect(text(sheet.querySelector("h2"))).toBe("Take the free SY0-801 practice exam");
    expect(text(sheet)).toContain("The practice exam is timed and follows the exam's domain weights.");
    expect(text(sheet.querySelector("a"))).toBe("Take the practice exam");
    expect(text(sheet)).not.toMatch(/practice test/);
    expect(text(sheet)).toContain("Anyone can take it, and a free account shows the score.");
    const links = [...sheet.querySelectorAll("a")];
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      SY0_801_PRACTICE_PATH,
      SY0_801_AI_PATH,
      `/path/${SY0_801_CERT}`,
      `/path/${SECURITY_PLUS_CERT}`,
    ]);
    for (const link of links.slice(1)) expect(link.className).toContain("cb-link");
    // The practice test is not the study path, so its button has no arrow.
    expect(arrows(doc)).toBe(0);
    expect(sheet.previousElementSibling?.querySelector("h1")).not.toBeNull();
  });

  // Read at CompTIA's V8 page on 23 November 2026 (the facts file). No CompTIA
  // page says that both exams lead to the same certification: they are listed
  // as versions of Security+.
  it("gives the recommended experience in CompTIA's words, and says only that CompTIA lists both exams as versions of Security+", () => {
    const table = doc.querySelector("table")!;
    const row = [...table.querySelectorAll("tbody tr")].find((r) => text(r.querySelector("th")) === "Recommended experience");
    expect(text(row?.querySelector("td"))).toBe("Two years of hands-on experience as a security administrator");
    expect(text(doc.body)).toContain("and CompTIA lists both exams as versions of Security+.");
    expect(text(doc.body)).not.toMatch(/lead to the same certification|hands-on security administration/);
    // What the SY0-701 objectives hold, and not a claim about every other course.
    expect(text(doc.body)).toContain("SY0-701 has no objective on AI.");
    expect(text(doc.body)).not.toMatch(/No SY0-701 material|has not had an objective/);
    // CertBench's own labs are hands-on labs; a PBQ is CompTIA's name for the exam's task.
    expect(text(doc.body)).toContain("12 free hands-on labs, three of them with no account");
    expect(text(doc.body)).not.toMatch(/interactive PBQs/);
  });

  it("links the versions page in a whole sentence", () => {
    const link = linkNamed(doc, "which version to take")!;
    expect(link.getAttribute("href")).toBe(SECURITY_PLUS_VERSIONS_PATH);
    expect(text(link.parentElement)).toBe("If you are deciding between the two versions, read which version to take.");
  });
});

describe("/security-plus-sy0-801-vs-sy0-701", () => {
  const doc = served(<SecurityPlusVersionsPage />);
  const table = (headed: string) => {
    const section = [...doc.querySelectorAll("section")].find((s) => text(s.querySelector("h2")) === headed);
    return section!.querySelector("table")!;
  };

  it("is one document on the scale, titled in sentence case", () => {
    expectOneDocument(doc);
    expect(versionsMetadata.title).toBe("Security+ SY0-801 vs SY0-701: which should you take?");
    expect(headings(doc, 1)).toEqual(["Security+ SY0-801 vs SY0-701: which should you take?"]);
    expect(String(versionsMetadata.description)).toContain("This page sets out what changes");
  });

  it("states the launch as a date that has passed, and what was checked when", () => {
    const page = text(doc.body);
    expect(page).not.toMatch(/on or around|scheduled/i);
    expect(JSON.stringify(jsonLd(doc))).not.toMatch(/on or around|scheduled/i);
    expect(text(doc.querySelector("header"))).toContain(`pages, which were last checked on ${EXAM_FACTS_CHECKED}.`);
  });

  it("sets the key dates as a table with a header for every row and column", () => {
    const dates = table("Key dates");
    expect([...dates.querySelectorAll("thead th")].map(text)).toEqual(["Date", "SY0-701 (V7)", "SY0-801 (V8)"]);
    for (const th of dates.querySelectorAll("thead th")) expect(th.getAttribute("scope")).toBe("col");
    const rows = [...dates.querySelectorAll("tbody tr")];
    expect(rows.map((row) => text(row.querySelector("th")))).toEqual(["Launch", "Retirement (English)", "Other languages"]);
    expect([...rows[0].querySelectorAll("td")].map(text)).toEqual(["November 7, 2023", "November 17, 2026"]);
    // On a phone a row stacks, and each cell carries its column's name.
    expect([...rows[0].querySelectorAll("td")].map((td) => td.getAttribute("data-label"))).toEqual([
      "SY0-701 (V7)",
      "SY0-801 (V8)",
    ]);
  });

  it("sets each domain's share in both versions, and the change, as figures", () => {
    const weights = table("What changes");
    expect([...weights.querySelectorAll("thead th")].map(text)).toEqual(["Domain", "SY0-701", "SY0-801", "Change"]);
    const rows = [...weights.querySelectorAll("tbody tr")];
    expect(rows).toHaveLength(SECURITY_PLUS_DOMAIN_CHANGES.length);
    const first = SECURITY_PLUS_DOMAIN_CHANGES[0];
    expect([...rows[0].querySelectorAll("td")].map(text)).toEqual([
      `${first.sy0701}%`,
      `${first.sy0801}%`,
      `+${first.sy0801 - first.sy0701} percentage points`,
    ]);
    // A fall is written with a minus sign, which is not a dash between words.
    const falls = SECURITY_PLUS_DOMAIN_CHANGES.filter((d) => d.sy0801 < d.sy0701);
    expect(falls.length).toBeGreaterThan(0);
    expect(text(weights)).toContain(`${String.fromCharCode(0x2212)}${falls[0].sy0701 - falls[0].sy0801}`);
    // Counts are set in the text face: the mono face is for codes.
    expect(weights.innerHTML).not.toContain("font-mono");
    // At 320 pixels the table must fit its 280-pixel column (it was 312 wide and its
    // last column was cut off): closer cells and breakable names below sm, measured
    // in a browser at 245 pixels wide at the least, and a box that scrolls, and
    // never cuts, should larger text make it wider still.
    expect(weights.parentElement?.className).toBe("overflow-x-auto");
    const domainCells = [weights.querySelector("thead th")!, ...weights.querySelectorAll("tbody th")];
    for (const cell of domainCells) expect(cell.className).toMatch(/(?:^| )pr-2 .*sm:pr-4/);
    for (const cell of weights.querySelectorAll("tbody th")) expect(cell.className).toContain("max-sm:[overflow-wrap:anywhere]");
    const figureCells = [...weights.querySelectorAll("thead th")].slice(1).concat([...weights.querySelectorAll("td")]);
    for (const cell of figureCells) {
      expect(cell.className).toMatch(/(?:^| )pl-2 .*sm:pl-4/);
      expect(cell.className).not.toMatch(/(?:^| )pl-4/);
    }
    // A change of one point is read aloud as one point, not "1 percentage points".
    const ones = SECURITY_PLUS_DOMAIN_CHANGES.map((d, k) => [d, rows[k]] as const).filter(
      ([d]) => Math.abs(d.sy0801 - d.sy0701) === 1
    );
    expect(ones.length).toBeGreaterThan(0);
    for (const [, row] of ones) expect(text([...row.querySelectorAll("td")].at(-1))).toMatch(/1 percentage point$/);
    expect(text(weights)).not.toMatch(/\b1 percentage points/);
  });

  it("sets the choice as a table: the situation, the version and the reason", () => {
    const choices = table("How to choose");
    expect([...choices.querySelectorAll("thead th")].map(text)).toEqual(["Your situation", "Version to take", "Reason"]);
    const rows = [...choices.querySelectorAll("tbody tr")];
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      expect(row.querySelector("th")?.getAttribute("scope")).toBe("row");
      expect(text(row.querySelectorAll("td")[0])).toMatch(/^SY0-(?:701|801)$/);
      // The pressable colour is kept for what can be pressed.
      expect(row.innerHTML).not.toContain("text-primary");
    }
    expect(doc.querySelector(".glass")).toBeNull();
  });

  it("ends on the band, where the one arrow is on the button that starts a study path", () => {
    const sheet = band(doc);
    const buttons = [...sheet.querySelectorAll("a")];
    expect(buttons.map(text)).toEqual(["Start the SY0-801 study path", "Start the SY0-701 study path"]);
    expect(buttons.map((a) => a.getAttribute("href"))).toEqual([`/path/${SY0_801_CERT}`, `/path/${SECURITY_PLUS_CERT}`]);
    expect(arrows(doc)).toBe(1);
    expect(buttons[0].querySelector("svg.lucide-arrow-right")).not.toBeNull();
    expect(sheet.previousElementSibling?.querySelector("h1")).not.toBeNull();
  });

  // Each fact here was read at one of CompTIA's own pages (the facts file, 23
  // November 2026). No CompTIA page says that passing either exam earns the same
  // certification: its pages list both as versions of Security+.
  it("states only what CompTIA's pages say: the versions, the recommended experience and how long the certification lasts", () => {
    const page = text(doc.body);
    expect(page).not.toMatch(/lead to the same/);
    expect(text(doc.querySelector("header"))).toContain(
      "CompTIA lists both exams as versions of Security+, and in CertBench's view SY0-701 has three years of study material behind it."
    );
    expect(page).toContain(
      "The certification: CompTIA lists both exams as versions of Security+, and a Security+ certification is valid for three years from the day that you pass."
    );
    expect(page).toContain(
      "For SY0-701, CompTIA recommends Network+ and two years in a security or systems administrator role, and for SY0-801, two years of hands-on experience as a security administrator. CompTIA gives both as recommended experience and not as a requirement."
    );
    expect(page).toContain("CompTIA's page mentions AI-assisted workflows and operational technology environments.");
    expect(page).not.toMatch(/AI-assisted automation|SY0-80?1 recommends|SY0-701 recommends|requirement to book/);
    // The site's words: "practice exam" in a sentence, and "hands-on labs" for CertBench's own labs.
    expect(text(doc.querySelector("header"))).toContain("There is also a free SY0-801 practice exam.");
    expect(page).toContain("a timed SY0-801 practice exam in the exam's domain weights");
    expect(page).toContain("12 free hands-on labs, three of them with no account");
    expect(page).not.toMatch(/interactive PBQs/);
  });

  it("names its three sources in a sentence", () => {
    const sources = [...doc.querySelectorAll("p")].find((p) => text(p).startsWith("The sources for this page are"))!;
    expect([...sources.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual([
      COMPTIA_URLS.securityV7,
      COMPTIA_URLS.securityV8,
      COMPTIA_URLS.securityValidity,
    ]);
    expect(text(sources).endsWith(".")).toBe(true);
  });
});

describe("/security-plus-sy0-801-ai-practice-questions", () => {
  const doc = served(<Sy0801AiQuestionsPage />);

  it("is one document on the scale, titled and described in sentences", () => {
    expectOneDocument(doc);
    expect(aiMetadata.title).toBe("SY0-801 practice questions: AI threats (objective 2.6)");
    expect(String(aiMetadata.description)).toMatch(/^This page has \d+ free, original Security\+ SY0-801 practice questions/);
    expect(headings(doc, 1)).toEqual(["SY0-801 practice questions: AI threats and vulnerabilities"]);
  });

  it("puts the questions first, then the topics as terms and descriptions", () => {
    expect(headings(doc, 2).slice(0, 2)).toEqual([
      "The questions",
      `The ${SY0_801_AI_TOPICS.length} topics of objective 2.6, briefly defined`,
    ]);
    expect(doc.querySelector('[data-testid="deck"]')?.getAttribute("data-count")).toBe(String(SY0_801_AI_QUESTIONS.length));
    expect([...doc.querySelectorAll("dt")].map(text)).toEqual(SY0_801_AI_TOPICS.map((t) => t.term));
    expect(doc.querySelector(".glass")).toBeNull();
  });

  it("ends on the band: one button to the practice test, and the other ways on in one sentence", () => {
    const sheet = band(doc);
    expect(text(sheet.querySelector("h2"))).toBe("Take the whole SY0-801 practice exam");
    expect(text(sheet)).not.toMatch(/practice test/);
    // No claim about every other course: what the SY0-701 objectives hold.
    expect(text(doc.querySelector("header"))).toContain("SY0-701 has no objective on AI.");
    expect(text(doc.body)).not.toMatch(/No SY0-701 course|has never had/);
    expect([...sheet.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual([
      SY0_801_PRACTICE_PATH,
      SY0_801_PATH,
      `/path/${SY0_801_CERT}`,
      `/path/${SECURITY_PLUS_CERT}`,
    ]);
    expect(arrows(doc)).toBe(0);
  });
});

describe("the SY0-801 reading pages", () => {
  // The measure for 17px text is cb-measure; text set at 15px takes the narrower
  // cb-measure-sm, so that a line stays near 80 characters.
  it("set small text at the measure made for it", () => {
    for (const page of [<SecurityPlusV8Page key="v8" />, <SecurityPlusVersionsPage key="vs" />, <Sy0801AiQuestionsPage key="ai" />]) {
      const doc = served(page);
      const wide = [...doc.querySelectorAll(".cb-measure")].filter((el) => el.classList.contains("text-small"));
      expect(wide.map(text)).toEqual([]);
    }
    expect(band(served(<SecurityPlusV8Page />)).querySelector("p.cb-measure-sm.text-small")).not.toBeNull();
    expect(band(served(<Sy0801AiQuestionsPage />)).querySelector("p.cb-measure-sm.text-small")).not.toBeNull();
  });

  // No source says how much study material either version has (FW-10), so
  // wherever a page says it, in its text or its structured data, it is CertBench's view.
  it("give the study material behind SY0-701 as CertBench's view, everywhere they mention it", () => {
    for (const page of [<SecurityPlusV8Page key="v8" />, <SecurityPlusVersionsPage key="vs" />]) {
      const doc = served(page);
      const said = [text(doc.body), JSON.stringify(jsonLd(doc))]
        .join(" ")
        .split(/(?<=\.)\s+/)
        .filter((sentence) => /study material/i.test(sentence));
      expect(said.length).toBeGreaterThan(0);
      for (const sentence of said) expect(sentence).toContain("CertBench's view");
    }
  });
});

describe.each(VS_PAGES.map((page) => [page.slug, page] as const))("/compare/%s", (slug, page) => {
  it("is one document on the scale, with the verdict in both directions and the table", async () => {
    const doc = served(await VsPage({ params: Promise.resolve({ slug }) }));
    expectOneDocument(doc);
    expect(headings(doc, 1)).toEqual([page.h1]);
    expect(headings(doc, 2).slice(0, 3)).toEqual([`Choose ${page.competitorName} if`, "Choose CertBench if", "Side by side"]);
    const table = doc.querySelector("table")!;
    expect([...table.querySelectorAll("thead th")].map(text)).toEqual(["Feature", "CertBench", page.competitorName]);
    expect(table.querySelectorAll("tbody tr")).toHaveLength(page.rows.length);
    for (const row of table.querySelectorAll("tbody tr")) expect(row.querySelector("th")?.getAttribute("scope")).toBe("row");
  });

  it("says when its words last changed, and dates the competitor's price only where it was read at its source", async () => {
    const doc = served(await VsPage({ params: Promise.resolve({ slug }) }));
    expect(text(doc.body)).toContain(`This comparison was last updated on ${longDate(COMPARISON_PAGES_UPDATED_ISO)}.`);
    const note = [...doc.querySelectorAll("p")].find((p) => text(p).includes("The details and prices of other products change."))!;
    const read = page.priceSource && page.priceChecked;
    if (read) {
      expect(text(note)).toContain(
        `CertBench read the price of ${page.competitorName} on the vendor's own page on ${page.priceChecked}.`
      );
      expect(note.querySelector("a")?.getAttribute("href")).toBe(page.priceSource);
    } else {
      expect(text(note)).not.toContain("CertBench read the price");
      expect(note.querySelector("a")).toBeNull();
    }
    // A date is never set without the page it was read on, and the other way round.
    expect(Boolean(page.priceSource)).toBe(Boolean(page.priceChecked));
  });
});

describe("/compare with an address that is not a comparison", () => {
  it("is not found", async () => {
    await expect(VsPage({ params: Promise.resolve({ slug: "certbench-vs-nobody" }) })).rejects.toThrow("NOT_FOUND");
  });
});

describe("/objectives/[cert]", () => {
  it("lists every objective as a ruled row under its domain, which is a section of the page", async () => {
    const doc = served(await ObjectiveHubPage({ params: Promise.resolve({ cert: HUB.certSlug }) }));
    expectOneDocument(doc);
    expect(headings(doc, 1)).toEqual(["SY0-701 exam objectives, with practice for each one"]);
    // The domains that have objectives, each with its share of the exam.
    const domains = headings(doc, 2).filter((h) => h.startsWith("Domain "));
    expect(domains).toEqual([
      "Domain 1: General Security Concepts 12% of the exam",
      "Domain 2: Threats, Vulnerabilities, and Mitigations 22% of the exam",
    ]);
    const rows = [...doc.querySelectorAll("ul li a")].filter((a) => a.getAttribute("href")?.startsWith("/objectives/"));
    expect(rows.map((a) => a.getAttribute("href"))).toEqual([
      `/objectives/${HUB.certSlug}/1-1`,
      `/objectives/${HUB.certSlug}/1-2`,
      `/objectives/${HUB.certSlug}/2-1`,
    ]);
    expect(text(rows[0])).toBe("1.1 Security controls Compare and contrast various types of security controls");
  });

  it("gives its facts as a summary list, and names CompTIA's own page", async () => {
    const doc = served(await ObjectiveHubPage({ params: Promise.resolve({ cert: HUB.certSlug }) }));
    const facts = doc.querySelector("dl")!;
    expect([...facts.querySelectorAll("dt")].map(text)).toEqual(["Objectives", "Domains", "Account"]);
    expect([...facts.querySelectorAll("dd")].map(text)).toEqual(["3", "3", "Not required"]);
    expect(linkNamed(doc, "SY0-701 exam page")?.getAttribute("href")).toMatch(/^https:\/\/www\.comptia\.org\//);
    // One arrow: the button that starts the study path. The rows have none.
    expect(arrows(doc)).toBe(1);
    expect(linkNamed(doc, "Start the Security+ study path")?.getAttribute("href")).toBe(`/path/${HUB.certSlug}`);
  });

  it("is not found for an exam that has no objectives page", async () => {
    await expect(ObjectiveHubPage({ params: Promise.resolve({ cert: "nothing" }) })).rejects.toThrow("NOT_FOUND");
  });
});

describe("ObjectiveLanding", () => {
  const DATA: ObjectiveLandingData = {
    certSlug: "security-plus-sy0-701",
    certName: "CompTIA Security+",
    shortCertName: "Security+",
    examCode: "SY0-701",
    code: "1.1",
    title: "Compare and contrast various types of security controls",
    topic: "Security controls",
    domainNumber: "1.0",
    domainTitle: "General Security Concepts",
    domainWeight: 12,
    samples: [{ questionText: "Q", options: ["a", "b", "c", "d"], correctIndex: 0, explanation: "Because." }],
    siblings: [{ code: "1.2", title: "Summarize fundamental security concepts", topic: "Core security concepts", slug: "1-2" }],
  };

  it("is one document on the scale, with its facts labelled and its place in the exam shown", () => {
    const doc = served(<ObjectiveLanding data={DATA} />);
    expectOneDocument(doc);
    expect(headings(doc, 1)).toEqual(["Objective 1.1: Compare and contrast various types of security controls"]);
    const facts = doc.querySelector("dl")!;
    expect([...facts.querySelectorAll("dt")].map(text)).toEqual(["Domain", "Domain weight", "Account"]);
    expect([...facts.querySelectorAll("dd")].map(text)).toEqual([
      "1: General Security Concepts",
      "12% of the exam",
      "Not required",
    ]);
    const crumbs = doc.querySelector('nav[aria-label="Breadcrumb"]')!;
    expect([...crumbs.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual([
      "/security-plus-practice-test",
      "/objectives/security-plus-sy0-701",
    ]);
    expect(text(crumbs.querySelector('[aria-current="page"]'))).toBe("Objective 1.1");
  });

  it("lists the domain's other objectives as rows, and appends an arrow only to the study path's button", () => {
    const doc = served(<ObjectiveLanding data={DATA} />);
    const sibling = linkNamed(doc, "1.2 Core security concepts Summarize fundamental security concepts");
    expect(sibling?.getAttribute("href")).toBe("/objectives/security-plus-sy0-701/1-2");
    expect(arrows(doc)).toBe(1);
    expect(linkNamed(doc, "Start the Security+ study path")?.querySelector("svg.lucide-arrow-right")).not.toBeNull();
    expect(linkNamed(doc, "View all Security+ SY0-701 objectives")?.className).toContain("cb-link");
  });
});
