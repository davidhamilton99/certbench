import { FREE_LAB_COUNT } from "@/core/path/free-labs";
import type { PathCert } from "@/core/path/types";
import { EXAM_CODES, examVersions } from "@/core/path/versions";
import { EXAM_NAMES } from "@/data/path/titles";
import { READINESS_TARGET } from "@/lib/readiness/band";
import { SECURITY_PLUS_VERSIONS_PATH, SY0_801_PRACTICE_PATH } from "./exam-versions";

/**
 * The words of the public practice-test pages and PBQ pages. Exam facts
 * (question limits, time limits, passing scores, domain weights and dates)
 * are CompTIA's, as read on its exam pages on the date in exam-versions.ts
 * (EXAM_FACTS_CHECKED). CertBench's own price is never typed here: a page
 * that states it takes the wording from src/lib/pricing/terms.ts.
 */

/** When the words in this file last changed, for the sitemap and the pages' structured data. */
export const CERT_PAGES_UPDATED_ISO = "2026-11-22";

export interface CertPageFaq {
  question: string;
  answer: string;
}

/** An exam's domains as CompTIA lists them today, for a page whose database rows don't match. */
export interface ExamOutline {
  name: string;
  examCode: string;
  domains: { number: string; title: string; weight: number }[];
}

export interface PracticeTestPage {
  /** URL segment, e.g. "security-plus-practice-test". */
  path: string;
  /** Cert slugs whose questions appear on the page (A+ has two exams). */
  certSlugs: string[];
  title: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string[];
  faqs: CertPageFaq[];
  /** Internal links to related free resources, chosen by hand. */
  related?: { href: string; label: string; note: string }[];
  /** CompTIA's current domains, when they differ from the bank's. */
  currentExams?: ExamOutline[];
  /** For an exam taken in parts (A+): each part's own practice page, offered first. */
  cores?: { href: string; name: string; examCode: string; blurb: string }[];
}

/**
 * Why no practice exam can give a scaled score, and what CertBench reports
 * instead. The figure is the site's one readiness target, so an answer about
 * the passing score never advises a percentage of its own.
 */
const NO_SCALED_SCORE = `The CertBench practice exam reports your score by domain against a readiness target of ${READINESS_TARGET}%, which is a guide and not a guarantee. It is not a score on CompTIA's scale.`;

/** The free full-length practice exam, in the words every practice-test page uses for it. */
const FREE_EXAM_INTRO =
  "Begin with the introductory questions, and then take the free full-length practice exam. It has 90 questions and a time limit of 90 minutes, it is scored by domain, and every answer is explained at the end. Anyone can take it, and a free account shows your score.";

/** The opening of every "is this practice test free" answer on a page that carries the exam itself. */
const FREE_EXAM_ANSWER =
  "Yes. This page has a free full-length practice exam of 90 questions with a time limit of 90 minutes. Anyone can take it, and a free account shows the score.";

/** "12": how many hands-on labs each exam's PBQ page gives away (core/path/free-labs.ts). */
const FREE_PBQS = String(FREE_LAB_COUNT);

/** The free labs, as an "is this free" answer states them. The first three need no account (PbqLab). */
const freeLabsOn = (pbqPage: string) =>
  `The ${pbqPage} has ${FREE_PBQS} free hands-on labs, three of them with no account.`;

/**
 * How many performance-based questions an exam has. CompTIA publishes neither
 * the number, nor where they come in the exam, nor how they are weighted, so
 * no page states any of them or tells a visitor what to expect. The answer
 * gives what each of CompTIA's five exam pages does state.
 */
const PBQ_COUNT_ANSWER =
  "CompTIA does not publish the number. Its exam page gives a maximum of 90 questions, which are multiple-choice and performance-based, and a time limit of 90 minutes.";

/** Opens an answer about what the exam's PBQs cover: the page can speak only for its own labs. */
export const PBQ_TOPICS_UNPUBLISHED = "CompTIA's exam questions are confidential, so it publishes no list of PBQ topics.";

/**
 * Closes each PBQ page's account of its free labs, in the words the page's own
 * chooser uses (PbqLab). It describes the lab and promises nothing about how
 * the real exam feels.
 */
const LAB_ON_THE_PAGE = "Each lab is graded with partial credit on this page.";

/**
 * Opens each PBQ page. Of the exam itself it says only what CompTIA's exam
 * page states: that the exam has performance-based questions as well as
 * multiple-choice questions. CompTIA does not publish what its PBQs ask or how
 * long they take, so the paragraph gives no example of them and compares them
 * with nothing. The rest says what the labs on the page ask. `handsOn` is
 * written from the page's own labs (src/data/pbq), and a test holds each lab
 * it names to one that is free on the page.
 */
const labsIntro = (exam: string, handsOn: string) =>
  `The ${exam} exam has performance-based questions (PBQs) as well as multiple-choice questions, and the hands-on labs on this page are CertBench's practice for them. A lab asks you to carry out a task instead of choosing A, B, C or D. ${handsOn} The drills ask you to put steps in order, to match items and to sort them into categories.`;

/** What a simulation asks, on every PBQ page: its tasks are worked in order. */
const SIMULATION_ASKS = "In a simulation you work through a scenario task by task";
/** What a network diagram asks, on the pages of the exams that have one. */
const DIAGRAM_ASKS = "In a network diagram you correct the devices that are misconfigured";

export const PRACTICE_TEST_PAGES: PracticeTestPage[] = [
  {
    path: "security-plus-practice-test",
    certSlugs: ["security-plus-sy0-701"],
    title: "Security+ practice test",
    // The root layout adds " | CertBench" to every title, so these base titles
    // stay under about 48 characters and the whole tag under 60.
    metaTitle: "Free CompTIA Security+ practice test (SY0-701)",
    metaDescription:
      "CertBench offers a free full-length Security+ SY0-701 practice exam of 90 questions in 90 minutes, scored by domain, with every answer explained. Its Security+ PBQ page has 12 free hands-on labs.",
    h1: "Free CompTIA Security+ (SY0-701) practice test",
    intro: [
      "Every question on this page is original, is written against the SY0-701 exam objectives, and has its answer explained. CertBench does not use braindumps or questions recycled from other question banks. CertBench holds more than 800 Security+ SY0-701 questions across all five domains, and the practice exam draws on them in the proportions of the real exam.",
      `${FREE_EXAM_INTRO} For the hands-on part of the exam, the Security+ PBQ page has 12 free hands-on labs.`,
    ],
    faqs: [
      {
        question: "How many questions are on the Security+ exam?",
        answer:
          "The SY0-701 exam has a maximum of 90 questions, a mix of multiple-choice and performance-based questions (PBQs), in 90 minutes.",
      },
      {
        question: "What score do I need to pass Security+?",
        answer: `You need 750 on a scale of 100 to 900. ${NO_SCALED_SCORE}`,
      },
      {
        question: "Are these real Security+ exam questions?",
        answer:
          "No. Using leaked exam content (braindumps) violates CompTIA's policies and can void your certification. CertBench questions are original items written to cover the same SY0-701 objectives, each with an explanation of why the correct answer is correct.",
      },
      {
        question: "How should I use practice tests to prepare?",
        answer:
          "Find your weak domains early, work through every objective, and review every question that you answer incorrectly until you can answer it correctly. Keep full-length timed exams for the final two weeks. CertBench's Security+ study path runs in that order: a readiness checkpoint a few minutes in shows where you stand by domain, a short step covers each objective and brings back the questions that you missed, and timed practice exams come last.",
      },
      {
        question: "Is this for SY0-701 or SY0-801?",
        answer:
          "SY0-701. CompTIA keeps it open until June 11, 2027 in English. SY0-801 launched on November 17, 2026, and CompTIA's Security+ page calls it the recommended version. CertBench has a separate study path and a free practice exam for SY0-801.",
      },
    ],
    related: [
      {
        href: SECURITY_PLUS_VERSIONS_PATH,
        label: "SY0-801 vs SY0-701",
        note: "What changes, and which one to take",
      },
      {
        href: SY0_801_PRACTICE_PATH,
        label: "SY0-801 practice test",
        note: "A free timed exam for the newest Security+ exam",
      },
      {
        href: "/readiness-check/security-plus-sy0-701",
        label: "Security+ readiness check",
        note: "Ten questions for an estimate by domain, with no account",
      },
      {
        href: "/objectives/security-plus-sy0-701",
        label: "SY0-701 exam objectives",
        note: "Every objective by domain, with practice for each one",
      },
      {
        href: "/security-plus-pbq-examples",
        label: "Security+ PBQ examples",
        note: "12 free hands-on labs, three of them with no account",
      },
      {
        href: "/best-security-plus-practice-tests",
        label: "Best Security+ practice tests, compared",
        note: "CertBench's guide to SY0-701 practice tests, its own included",
      },
      {
        href: "/tools/port-numbers-quiz",
        label: "Port numbers quiz",
        note: "Practice port numbers and protocols for Security+",
      },
      {
        href: "/tools/security-plus-acronyms-quiz",
        label: "Security+ acronyms list and quiz",
        note: "Learn the SY0-701 acronyms",
      },
    ],
  },
  {
    path: "network-plus-practice-test",
    certSlugs: ["network-plus-n10-009"],
    title: "Network+ practice test",
    metaTitle: "Free CompTIA Network+ practice test (N10-009)",
    metaDescription:
      "CertBench offers a free full-length Network+ N10-009 practice exam of 90 questions in 90 minutes, scored by domain, with every answer explained. Its Network+ PBQ page has 12 free hands-on labs.",
    h1: "Free CompTIA Network+ (N10-009) practice test",
    intro: [
      // CertBench groups its Network+ questions into topics of its own (exam-versions.ts), so the page claims no mapping to CompTIA's numbered objectives.
      "Every question on this page is original, is written for the N10-009 exam, and has its answer explained. CertBench's Network+ topics include subnetting, routing, wireless networking and troubleshooting. CertBench holds more than 600 Network+ questions, and the practice exam draws on them in the proportions of the real exam.",
      `${FREE_EXAM_INTRO} For the hands-on part, the Network+ PBQ page has 12 free hands-on labs, and the subnetting drills cover the calculations.`,
    ],
    faqs: [
      {
        question: "How many questions are on the Network+ exam?",
        answer:
          "The N10-009 exam has a maximum of 90 questions, a mix of multiple-choice and performance-based questions (PBQs), in 90 minutes.",
      },
      {
        question: "What score do I need to pass Network+?",
        answer: `You need 720 on a scale of 100 to 900. ${NO_SCALED_SCORE}`,
      },
      {
        question: "Should I take Network+ before Security+?",
        answer:
          "CertBench suggests Network+ first if networking is new to you, because Security+ questions assume networking fundamentals such as ports, protocols and network topology. If you already have IT experience, it is reasonable to go directly to Security+.",
      },
      {
        question: "Are these real Network+ exam questions?",
        answer:
          "No. They are original questions written for the N10-009 exam, with explanations. Braindumps violate CompTIA policy and can void your certification.",
      },
      {
        question: "Is there a free N10-009 practice test here?",
        answer:
          `${FREE_EXAM_ANSWER} The introductory questions, the sample questions and the three-minute readiness check are also free and need no account. ${freeLabsOn("Network+ PBQ page")} A free account saves your progress and opens your Network+ study path up to its readiness checkpoint. Pro opens the rest of the study path, with further full-length timed exams and every hands-on lab. N10-009 is the current Network+ exam version, so everything here is written for it.`,
      },
    ],
    currentExams: [
      {
        name: "CompTIA Network+",
        examCode: "N10-009",
        domains: [
          { number: "1.0", title: "Networking concepts", weight: 23 },
          { number: "2.0", title: "Network implementation", weight: 20 },
          { number: "3.0", title: "Network operations", weight: 19 },
          { number: "4.0", title: "Network security", weight: 14 },
          { number: "5.0", title: "Network troubleshooting", weight: 24 },
        ],
      },
    ],
    related: [
      {
        href: "/readiness-check/network-plus-n10-009",
        label: "Network+ readiness check",
        note: "Ten questions for an estimate by domain, with no account",
      },
      {
        href: "/network-plus-pbq-examples",
        label: "Network+ PBQ examples",
        note: "Network diagram and troubleshooting labs to work through",
      },
      {
        href: "/best-network-plus-practice-tests",
        label: "Best Network+ practice tests, compared",
        note: "CertBench's guide to N10-009 practice tests, its own included",
      },
      {
        href: "/tools/subnetting-practice",
        label: "Subnetting practice",
        note: "Rapid CIDR and subnet-mask drills",
      },
      {
        href: "/tools/subnet-calculator",
        label: "Subnet calculator",
        note: "Network, broadcast and host range for any IPv4 address",
      },
      {
        href: "/tools/port-numbers-quiz",
        label: "Port numbers quiz",
        note: "Practice port numbers and protocols for N10-009",
      },
    ],
  },
  {
    path: "a-plus-practice-test",
    certSlugs: ["a-plus-core1-220-1201", "a-plus-core2-220-1202"],
    title: "A+ practice test",
    metaTitle: "Free CompTIA A+ practice test (Core 1 and 2)",
    metaDescription:
      "This page has sample A+ Core 1 and Core 2 (220-1201/1202) questions with explanations, and links to a free full-length practice exam for each core.",
    h1: "Free CompTIA A+ practice test (Core 1 and Core 2)",
    intro: [
      "A+ is two exams: Core 1 (mobile devices, networking, hardware, virtualization and cloud computing, and hardware and network troubleshooting) and Core 2 (operating systems, security, software troubleshooting and operational procedures). Each core has a free full-length practice exam on its own practice-test page, with 90 questions in 90 minutes. The sample questions on this page come from both cores, and each one has its answer explained. CertBench holds more than 1,300 A+ questions across the two cores, all written to 220-1201 and 220-1202.",
      "Try the sample questions, and then take the free full-length practice exam for the core that you will take first. Anyone can take it, and a free account shows your score.",
    ],
    cores: [
      {
        href: "/a-plus-core-1-practice-test",
        name: "A+ Core 1",
        examCode: "220-1201",
        blurb: "Mobile devices, networking, hardware, cloud and troubleshooting",
      },
      {
        href: "/a-plus-core-2-practice-test",
        name: "A+ Core 2",
        examCode: "220-1202",
        blurb: "Operating systems, security, software troubleshooting and procedures",
      },
    ],
    faqs: [
      {
        question: "How many questions are on the A+ exams?",
        answer:
          "Each core has a maximum of 90 questions in 90 minutes, including performance-based questions. You must pass both cores, from the same exam version, to earn the A+ certification.",
      },
      {
        question: "What scores do I need to pass A+?",
        answer:
          "Core 1 (220-1201) requires 675 and Core 2 (220-1202) requires 700, each on a scale of 900. The two exams are booked and taken separately.",
      },
      {
        question: "Which A+ exam version is current?",
        answer:
          "220-1201 and 220-1202, which CompTIA calls V15, launched on March 25, 2025. The older 220-1101 and 220-1102 retired on September 25, 2025. CertBench's A+ questions are written to 220-1201 and 220-1202. Each question is linked to its V15 objective, the topics that V15 added have their own questions, and the topics that it removed are no longer included.",
      },
      {
        question: "Which core should I take first?",
        answer:
          "CertBench suggests Core 1 first, because in its view Core 2's troubleshooting builds on Core 1's hardware and networking. You need to pass both cores, from the same series, to earn A+.",
      },
      {
        question: "Are these real A+ exam questions?",
        answer:
          "No. They are original questions written to the 220-1201/1202 objectives, with explanations. Braindumps violate CompTIA policy and can void your certification.",
      },
      {
        question: "Is this a free A+ exam practice test?",
        answer:
          `Yes. Each core has a free full-length practice exam of 90 questions with a time limit of 90 minutes on its own practice-test page. Anyone can take it, and a free account shows the score. The sample questions on this page, each core's introductory questions and both readiness checks are also free and need no account. ${freeLabsOn("PBQ page for each core")} A free account saves your progress and opens each core's study path up to its readiness checkpoint. Pro opens the rest of your core's study path, with further full-length timed exams and every hands-on lab.`,
      },
    ],
    currentExams: [
      {
        name: "A+ Core 1",
        examCode: "220-1201",
        domains: [
          { number: "1.0", title: "Mobile devices", weight: 13 },
          { number: "2.0", title: "Networking", weight: 23 },
          { number: "3.0", title: "Hardware", weight: 25 },
          { number: "4.0", title: "Virtualization and cloud computing", weight: 11 },
          { number: "5.0", title: "Hardware and network troubleshooting", weight: 28 },
        ],
      },
      {
        name: "A+ Core 2",
        examCode: "220-1202",
        domains: [
          { number: "1.0", title: "Operating systems", weight: 28 },
          { number: "2.0", title: "Security", weight: 28 },
          { number: "3.0", title: "Software troubleshooting", weight: 23 },
          { number: "4.0", title: "Operational procedures", weight: 21 },
        ],
      },
    ],
    related: [
      {
        href: "/a-plus-core-1-pbq-examples",
        label: "A+ Core 1 PBQ examples",
        note: "Hardware, networking and troubleshooting scenarios to work through",
      },
      {
        href: "/a-plus-core-2-pbq-examples",
        label: "A+ Core 2 PBQ examples",
        note: "Windows, security and malware removal scenarios to work through",
      },
      {
        href: "/readiness-check/a-plus-core1-220-1201",
        label: "A+ Core 1 readiness check",
        note: "Ten questions for an estimate by domain, with no account",
      },
      {
        href: "/readiness-check/a-plus-core2-220-1202",
        label: "A+ Core 2 readiness check",
        note: "Ten questions for an estimate by domain, with no account",
      },
      {
        href: "/best-a-plus-practice-tests",
        label: "Best A+ practice tests, compared",
        note: "CertBench's guide to A+ Core 1 and Core 2 practice tests, its own included",
      },
      {
        href: "/tools/port-numbers-quiz",
        label: "Port numbers quiz",
        note: "Practice port numbers and protocols for Core 1",
      },
      {
        href: "/tools/subnetting-practice",
        label: "Subnetting practice",
        note: "Practice for Core 1 IP addressing",
      },
    ],
  },
  {
    path: "a-plus-core-1-practice-test",
    certSlugs: ["a-plus-core1-220-1201"],
    title: "A+ Core 1 practice test",
    metaTitle: "Free CompTIA A+ Core 1 practice test (220-1201)",
    metaDescription:
      "CertBench offers a free full-length A+ Core 1 (220-1201) practice exam of 90 questions in 90 minutes, drawn from all five domains, scored by domain, with every answer explained.",
    h1: "Free CompTIA A+ Core 1 (220-1201) practice test",
    intro: [
      "Core 1 is the hardware and networking half of A+: mobile devices, networking, hardware, virtualization and cloud computing, and hardware and network troubleshooting. Every question on this page is original, is written to the 220-1201 objectives, and has its answer explained. CertBench holds more than 600 Core 1 questions across all 27 objectives.",
      `${FREE_EXAM_INTRO} For the hands-on part of the exam, the A+ Core 1 PBQ page has 12 free hands-on labs.`,
    ],
    faqs: [
      {
        question: "How many questions are on A+ Core 1?",
        answer:
          "220-1201 has a maximum of 90 questions in 90 minutes, a mix of multiple-choice and performance-based questions. The passing score is 675 on a scale of 900.",
      },
      {
        question: "What does 220-1201 cover?",
        answer:
          "Five domains: mobile devices (13%), networking (23%), hardware (25%), virtualization and cloud computing (11%), and hardware and network troubleshooting (28%), the largest. The content ranges from laptop components and Wi-Fi standards to RAID, printers and cloud models.",
      },
      {
        question: "What changed from 220-1101?",
        answer:
          "220-1201 replaced 220-1101, which CompTIA retired on September 25, 2025. CompTIA's 220-1201 objectives say that the troubleshooting methodology itself is no longer tested. Every question here is linked to its 220-1201 objective.",
      },
      {
        question: "Should I take Core 1 or Core 2 first?",
        answer:
          "CertBench suggests Core 1 first, because in its view Core 1's hardware and networking come up again in Core 2's troubleshooting. You need both cores, from the same series, to earn A+.",
      },
      {
        question: "Are these real A+ exam questions?",
        answer:
          "No. They are original questions written to the 220-1201 objectives, with explanations. Braindumps violate CompTIA policy and can void your certification.",
      },
      {
        question: "Is this Core 1 practice test free?",
        answer:
          `${FREE_EXAM_ANSWER} The introductory questions, the sample questions and the readiness check are also free and need no account. ${freeLabsOn("A+ Core 1 PBQ page")} A free account saves your progress and opens your Core 1 study path up to its readiness checkpoint. Pro opens the rest of the study path, with further full-length timed exams and every hands-on lab.`,
      },
    ],
    related: [
      {
        href: "/readiness-check/a-plus-core1-220-1201",
        label: "A+ Core 1 readiness check",
        note: "Ten questions for an estimate by domain, with no account",
      },
      {
        href: "/objectives/a-plus-core1-220-1201",
        label: "220-1201 exam objectives",
        note: "All 27 objectives, each with its own practice questions",
      },
      {
        href: "/a-plus-core-1-pbq-examples",
        label: "A+ Core 1 PBQ examples",
        note: "Hardware, networking and troubleshooting scenarios to work through",
      },
      {
        href: "/a-plus-core-2-practice-test",
        label: "A+ Core 2 practice test",
        note: "Operating systems, security and operational procedures",
      },
      {
        href: "/tools/port-numbers-quiz",
        label: "Port numbers quiz",
        note: "Practice port numbers and protocols for Core 1",
      },
      {
        href: "/tools/subnetting-practice",
        label: "Subnetting practice",
        note: "Practice for Core 1 IP addressing",
      },
    ],
  },
  {
    path: "a-plus-core-2-practice-test",
    certSlugs: ["a-plus-core2-220-1202"],
    title: "A+ Core 2 practice test",
    metaTitle: "Free CompTIA A+ Core 2 practice test (220-1202)",
    metaDescription:
      "CertBench offers a free full-length A+ Core 2 (220-1202) practice exam of 90 questions in 90 minutes, drawn from all four domains, scored by domain, with every answer explained.",
    h1: "Free CompTIA A+ Core 2 (220-1202) practice test",
    intro: [
      "Core 2 is the software half of A+: operating systems, security, software troubleshooting and operational procedures. Every question on this page is original, is written to the 220-1202 objectives, and has its answer explained. CertBench holds more than 700 Core 2 questions across all 36 objectives, including the two that 220-1202 added: cloud productivity tools and artificial intelligence.",
      `${FREE_EXAM_INTRO} For the hands-on part of the exam, the A+ Core 2 PBQ page has 12 free hands-on labs.`,
    ],
    faqs: [
      {
        question: "How many questions are on A+ Core 2?",
        answer:
          "220-1202 has a maximum of 90 questions in 90 minutes, a mix of multiple-choice and performance-based questions. The passing score is 700 on a scale of 900.",
      },
      {
        question: "What does 220-1202 cover?",
        answer:
          "Four domains: operating systems (28%), security (28%), software troubleshooting (23%) and operational procedures (21%). The content ranges from Windows, macOS and Linux tools to malware removal, backups, scripting and remote access.",
      },
      {
        question: "What is new in 220-1202?",
        answer:
          "Two new objectives: installing and configuring cloud-based productivity tools (1.11), and basic concepts of artificial intelligence (4.10). The objective on Windows editions now lists Windows 11 beside Windows 10, the Linux tools add commands such as dnf, fsck and curl, and malware removal is now part of the Security domain. 220-1202 replaced 220-1102, which CompTIA retired on September 25, 2025.",
      },
      {
        question: "Do I need to take Core 1 first?",
        answer:
          "The cores are separate exams, and CertBench suggests starting with Core 1, because in its view Core 2's troubleshooting builds on Core 1's hardware and networking. You need both, from the same series, to earn A+.",
      },
      {
        question: "Are these real A+ exam questions?",
        answer:
          "No. They are original questions written to the 220-1202 objectives, with explanations. Braindumps violate CompTIA policy and can void your certification.",
      },
      {
        question: "Is this Core 2 practice test free?",
        answer:
          `${FREE_EXAM_ANSWER} The introductory questions, the sample questions and the readiness check are also free and need no account. ${freeLabsOn("A+ Core 2 PBQ page")} A free account saves your progress and opens your Core 2 study path up to its readiness checkpoint. Pro opens the rest of the study path, with further full-length timed exams and every hands-on lab.`,
      },
    ],
    related: [
      {
        href: "/readiness-check/a-plus-core2-220-1202",
        label: "A+ Core 2 readiness check",
        note: "Ten questions for an estimate by domain, with no account",
      },
      {
        href: "/objectives/a-plus-core2-220-1202",
        label: "220-1202 exam objectives",
        note: "All 36 objectives, each with its own practice questions",
      },
      {
        href: "/a-plus-core-2-pbq-examples",
        label: "A+ Core 2 PBQ examples",
        note: "Windows, security and malware removal scenarios to work through",
      },
      {
        href: "/a-plus-core-1-practice-test",
        label: "A+ Core 1 practice test",
        note: "Mobile devices, networking, hardware and troubleshooting",
      },
    ],
  },
];

/**
 * The practice exam's place on a practice-test page. The page opens with the
 * exam's introductory questions, so a link that is meant to open the exam
 * itself (the study path's "Open the free practice exam") goes to this place.
 */
export const PRACTICE_EXAM_ANCHOR = "practice-test";

/** The practice-test page for one exam: its own page, else the page that includes it. */
export function practicePageFor(certSlug: string): string {
  const page =
    PRACTICE_TEST_PAGES.find((p) => p.certSlugs.length === 1 && p.certSlugs[0] === certSlug) ??
    PRACTICE_TEST_PAGES.find((p) => p.certSlugs.includes(certSlug));
  return page ? `/${page.path}` : "/start";
}

export interface PbqExamplePage {
  path: string;
  certSlug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string[];
  faqs: CertPageFaq[];
  related?: { href: string; label: string; note: string }[];
}

export const PBQ_EXAMPLE_PAGES: PbqExamplePage[] = [
  {
    path: "security-plus-pbq-examples",
    certSlug: "security-plus-sy0-701",
    title: "Security+ PBQ examples",
    metaTitle: `${FREE_PBQS} free interactive Security+ PBQs (SY0-701)`,
    metaDescription: `CertBench offers ${FREE_PBQS} free hands-on labs in your browser as practice for the Security+ SY0-701 PBQs: firewall rules, a threat hunt, a vulnerability simulation, and ordering, matching and sorting drills. No account is needed to start.`,
    h1: `${FREE_PBQS} free Security+ PBQs to try in your browser`,
    intro: [
      labsIntro(
        "Security+",
        `${SIMULATION_ASKS}: one on this page is a vulnerability scan whose findings you classify and choose how to remediate. ${DIAGRAM_ASKS}, and in a threat hunt you flag the lines of a server log that are evidence of an attack.`
      ),
      `${FREE_PBQS} of the labs on this page are free: a vulnerability simulation, network segmentation and firewall rules, a threat hunt on a compromised server, and ordering, matching and sorting drills. The first three need no account, and a free account opens the rest. ${LAB_ON_THE_PAGE}`,
    ],
    faqs: [
      {
        question: "Are these Security+ PBQs free?",
        answer: `Yes. ${FREE_PBQS} hands-on labs on this page are free, the first three with no account and the rest with a free account, covering every kind of lab that CertBench has for SY0-701: a simulation, a network diagram, a threat hunt, and ordering, matching and sorting drills. Pro opens every Security+ lab on your study path, with your progress kept.`,
      },
      {
        question: "How many PBQs are on the Security+ exam?",
        answer: PBQ_COUNT_ANSWER,
      },
      {
        question: "Should I do PBQs first or skip them?",
        answer:
          "One approach is to flag them, answer the multiple-choice questions first, and then return with the remaining time. If you practice them enough beforehand, you will not need to skip them.",
      },
      {
        question: "What topics do Security+ PBQs cover?",
        answer: `${PBQ_TOPICS_UNPUBLISHED} The labs on this page cover firewall rules and network segmentation, log analysis in a threat hunt, a vulnerability simulation, and ordering, matching and sorting tasks.`,
      },
    ],
    related: [
      {
        href: "/security-plus-practice-test",
        label: "Security+ practice test",
        note: "A free full-length SY0-701 exam: 90 questions, 90 minutes",
      },
      {
        href: "/readiness-check/security-plus-sy0-701",
        label: "Security+ readiness check",
        note: "Ten questions for an estimate by domain, with no account",
      },
      {
        href: "/tools/port-numbers-quiz",
        label: "Port numbers quiz",
        note: "Practice port numbers and protocols for Security+",
      },
    ],
  },
  {
    path: "network-plus-pbq-examples",
    certSlug: "network-plus-n10-009",
    title: "Network+ PBQ examples",
    metaTitle: `${FREE_PBQS} free interactive Network+ PBQs (N10-009)`,
    metaDescription: `CertBench offers ${FREE_PBQS} free hands-on labs in your browser as practice for the Network+ N10-009 PBQs: troubleshooting commands, VLAN trunking, ports, cabling and more. No account is needed to start.`,
    h1: `${FREE_PBQS} free Network+ PBQs to try in your browser`,
    intro: [
      labsIntro(
        "Network+",
        `${SIMULATION_ASKS}: one on this page is a connectivity fault that you trace from the output of commands. ${DIAGRAM_ASKS}.`
      ),
      `${FREE_PBQS} of the labs on this page are free: troubleshooting with real commands, VLAN configuration and trunking, and drills on ports, cabling, the OSI model and DHCP. The first three need no account, and a free account opens the rest. ${LAB_ON_THE_PAGE}`,
    ],
    faqs: [
      {
        question: "Are these Network+ PBQs free?",
        answer: `Yes. ${FREE_PBQS} hands-on labs on this page are free, the first three with no account and the rest with a free account, covering every kind of lab that CertBench has for N10-009: a command-line simulation, a network diagram, and ordering, matching and sorting drills. Pro opens every Network+ lab on your study path, with your progress kept.`,
      },
      {
        question: "How many PBQs are on the Network+ exam?",
        answer: PBQ_COUNT_ANSWER,
      },
      {
        question: "What topics do Network+ PBQs cover?",
        answer: `${PBQ_TOPICS_UNPUBLISHED} The labs on this page cover troubleshooting with commands, VLAN configuration and trunking, and drills on ports, cabling, the OSI model and DHCP.`,
      },
      {
        question: "How do I practice PBQs without exam dumps?",
        answer:
          "Use interactive simulations built to the exam objectives, such as the ones on this page. They exercise the same skills without violating CompTIA's exam security policies, as braindumps do.",
      },
    ],
    related: [
      {
        href: "/network-plus-practice-test",
        label: "Network+ practice test",
        note: "A free full-length N10-009 exam: 90 questions, 90 minutes",
      },
      {
        href: "/readiness-check/network-plus-n10-009",
        label: "Network+ readiness check",
        note: "Ten questions for an estimate by domain, with no account",
      },
      {
        href: "/tools/subnetting-practice",
        label: "Subnetting practice",
        note: "Rapid CIDR and subnet-mask drills",
      },
    ],
  },
  {
    path: "a-plus-core-1-pbq-examples",
    certSlug: "a-plus-core1-220-1201",
    title: "A+ Core 1 PBQ examples",
    metaTitle: `${FREE_PBQS} free interactive A+ Core 1 PBQs (220-1201)`,
    metaDescription: `CertBench offers ${FREE_PBQS} free hands-on labs in your browser as practice for the A+ Core 1 (220-1201) PBQs: laptop display troubleshooting, ports, connectors, printers and more. No account is needed to start.`,
    h1: `${FREE_PBQS} free A+ Core 1 PBQs to try in your browser`,
    intro: [
      labsIntro(
        "A+ Core 1",
        `${SIMULATION_ASKS}: one on this page is a laptop display that has gone dim, which you diagnose before you plan its repair.`
      ),
      `${FREE_PBQS} of the labs on this page are free: a laptop display troubleshooting simulation, and drills on ports, cables, connectors, Wi-Fi, the laser printer and the boot sequence. The first three need no account, and a free account opens the rest. ${LAB_ON_THE_PAGE}`,
    ],
    faqs: [
      {
        question: "Are these A+ Core 1 PBQs free?",
        answer: `Yes. ${FREE_PBQS} hands-on labs on this page are free, the first three with no account and the rest with a free account: a troubleshooting simulation, and ordering, matching and sorting drills. Pro opens every Core 1 lab on your study path, with your progress kept.`,
      },
      {
        question: "How many PBQs are on A+ Core 1?",
        answer: PBQ_COUNT_ANSWER,
      },
      {
        question: "What topics do A+ Core 1 PBQs cover?",
        answer: `${PBQ_TOPICS_UNPUBLISHED} The labs on this page cover laptop display troubleshooting in a simulation, and ordering, matching and sorting tasks on ports, cables, connectors, Wi-Fi standards, the laser printer and the boot sequence.`,
      },
      {
        question: "Are these written for 220-1201 or 220-1101?",
        answer:
          "220-1201, the current Core 1 exam, which replaced 220-1101 when it retired on September 25, 2025. Every scenario belongs to a 220-1201 domain, and the drill on troubleshooting methodology has been removed because 220-1201 no longer tests the method itself.",
      },
    ],
    related: [
      {
        href: "/a-plus-core-2-pbq-examples",
        label: "A+ Core 2 PBQ examples",
        note: "Windows, security and malware removal scenarios to work through",
      },
      {
        href: "/a-plus-core-1-practice-test",
        label: "A+ Core 1 practice test",
        note: "A free full-length 220-1201 exam: 90 questions, 90 minutes",
      },
      {
        href: "/readiness-check/a-plus-core1-220-1201",
        label: "A+ Core 1 readiness check",
        note: "Ten questions for an estimate by domain, with no account",
      },
      {
        href: "/tools/port-numbers-quiz",
        label: "Port numbers quiz",
        note: "Practice port numbers and protocols for Core 1",
      },
    ],
  },
  {
    path: "a-plus-core-2-pbq-examples",
    certSlug: "a-plus-core2-220-1202",
    title: "A+ Core 2 PBQ examples",
    metaTitle: `${FREE_PBQS} free interactive A+ Core 2 PBQs (220-1202)`,
    metaDescription: `CertBench offers ${FREE_PBQS} free hands-on labs in your browser as practice for the A+ Core 2 (220-1202) PBQs: mobile device security, malware removal, Windows tools, Linux commands and more. No account is needed to start.`,
    h1: `${FREE_PBQS} free A+ Core 2 PBQs to try in your browser`,
    intro: [
      labsIntro(
        "A+ Core 2",
        `${SIMULATION_ASKS}: one on this page is a security policy that you set for a company's new phones, one of which is then reported lost.`
      ),
      `${FREE_PBQS} of the labs on this page are free: a mobile device security simulation, and drills on malware removal, Windows tools, Linux commands, social engineering and change management. The first three need no account, and a free account opens the rest. ${LAB_ON_THE_PAGE}`,
    ],
    faqs: [
      {
        question: "Are these A+ Core 2 PBQs free?",
        answer: `Yes. ${FREE_PBQS} hands-on labs on this page are free, the first three with no account and the rest with a free account: a mobile security simulation, and ordering, matching and sorting drills. Pro opens every Core 2 lab on your study path, with your progress kept.`,
      },
      {
        question: "How many PBQs are on A+ Core 2?",
        answer: PBQ_COUNT_ANSWER,
      },
      {
        question: "What topics do A+ Core 2 PBQs cover?",
        answer: `${PBQ_TOPICS_UNPUBLISHED} The labs on this page cover mobile device security in a simulation, and ordering, matching and sorting tasks on malware removal, Windows tools, Linux commands, social engineering and change management.`,
      },
      {
        question: "Are these written for 220-1202 or 220-1102?",
        answer:
          "220-1202, the current Core 2 exam, which replaced 220-1102 when it retired on September 25, 2025. Every scenario belongs to a 220-1202 domain. Malware removal, for example, is a Security topic in 220-1202.",
      },
    ],
    related: [
      {
        href: "/a-plus-core-1-pbq-examples",
        label: "A+ Core 1 PBQ examples",
        note: "Hardware, networking and troubleshooting scenarios to work through",
      },
      {
        href: "/a-plus-core-2-practice-test",
        label: "A+ Core 2 practice test",
        note: "A free full-length 220-1202 exam: 90 questions, 90 minutes",
      },
      {
        href: "/readiness-check/a-plus-core2-220-1202",
        label: "A+ Core 2 readiness check",
        note: "Ten questions for an estimate by domain, with no account",
      },
    ],
  },
];

/** "Security+ SY0-701", "Network+", "A+ Core 1": an exam that is taught in two versions is named with its code. */
const examAsNamed = (certSlug: string) =>
  `${EXAM_NAMES[certSlug]}${examVersions(certSlug).length > 0 ? ` ${EXAM_CODES[certSlug as PathCert]}` : ""}`;

/**
 * The exams that have a public page of labs, as a sentence lists them:
 * "Security+ SY0-701, Network+, A+ Core 1 and A+ Core 2". The free labs are
 * the ones on those pages (core/path/free-labs.ts). An exam without such a
 * page, Security+ SY0-801 today, has no free lab: its study path says that its
 * labs are included with Pro. So a sentence that states how many labs are
 * free names these exams, and never says "for each exam".
 */
export const EXAMS_WITH_FREE_LABS: string = (() => {
  const names = PBQ_EXAMPLE_PAGES.map((page) => examAsNamed(page.certSlug));
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names.join("");
})();
