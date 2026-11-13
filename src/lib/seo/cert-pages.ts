import { SECURITY_PLUS_VERSIONS_PATH } from "./exam-versions";

/**
 * Static content for the public SEO pages (practice tests + PBQ examples).
 * Exam facts are public knowledge from CompTIA's exam pages; keep prices
 * approximate so drift doesn't make us wrong.
 */

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
  /** Curated internal links to related free resources (useful + spreads link equity). */
  related?: { href: string; label: string; note: string }[];
  /** CompTIA's current domains, when they differ from the bank's. */
  currentExams?: ExamOutline[];
  /** For an exam taken in parts (A+): each part's own practice page, offered first. */
  cores?: { href: string; name: string; examCode: string; blurb: string }[];
}

export const PRACTICE_TEST_PAGES: PracticeTestPage[] = [
  {
    path: "security-plus-practice-test",
    certSlugs: ["security-plus-sy0-701"],
    title: "Security+ practice test",
    // NOTE: the root layout template appends "— CertBench" to every title;
    // keep these base titles ≤ ~48 chars so the full tag stays under 60.
    metaTitle: "Free CompTIA Security+ Practice Test (SY0-701)",
    metaDescription:
      "Free Security+ SY0-701 practice questions with full explanations, weighted by real exam domains. Take the free readiness check and get your readiness score.",
    h1: "Free CompTIA Security+ (SY0-701) practice test",
    intro: [
      "Every question below is original, written against the SY0-701 exam objectives, and comes with a full explanation — no braindumps, no recycled question banks. CertBench holds 800+ Security+ questions across all five domains, weighted the way the real exam weights them.",
      "Try the samples, then take the free 3-minute readiness check for a readiness score that tells you exactly which domains need work — no account.",
    ],
    faqs: [
      {
        question: "How many questions are on the Security+ exam?",
        answer:
          "The SY0-701 exam has a maximum of 90 questions — a mix of multiple-choice and performance-based questions (PBQs) — in 90 minutes. Most candidates see fewer than 90 because PBQs count for more.",
      },
      {
        question: "What score do I need to pass Security+?",
        answer:
          "You need 750 on a scale of 100–900. CompTIA doesn't publish a percentage, but 750/900 is commonly treated as roughly 83%, so aim to score consistently above that on practice exams before booking.",
      },
      {
        question: "Are these real Security+ exam questions?",
        answer:
          "No — using leaked exam content (braindumps) violates CompTIA's policies and can void your certification. CertBench questions are original items written to cover the same SY0-701 objectives at exam-level difficulty, each with an explanation of why the right answer is right.",
      },
      {
        question: "How should I use practice tests to prepare?",
        answer:
          "Take a diagnostic first to find your weak domains, drill those domains until they turn green, and use spaced repetition on every question you miss. Save full-length timed exams for the final two weeks. CertBench automates that sequence into a daily plan.",
      },
      {
        question: "Is this for SY0-701 or SY0-801?",
        answer:
          "SY0-701. It's the current exam, and CompTIA keeps it open until June 11, 2027 in English. CompTIA lists SY0-801 as launching on or around November 17, 2026, and we don't have SY0-801 questions yet. Both versions lead to the same Security+ certification, so if you can sit SY0-701 by June 2027 there's no need to wait.",
      },
    ],
    related: [
      {
        href: SECURITY_PLUS_VERSIONS_PATH,
        label: "SY0-801 vs SY0-701",
        note: "What changes, and which one to take",
      },
      {
        href: "/readiness-check/security-plus-sy0-701",
        label: "Security+ readiness check",
        note: "10 questions, no account: an estimate by domain",
      },
      {
        href: "/objectives/security-plus-sy0-701",
        label: "SY0-701 exam objectives",
        note: "Every objective by domain, with practice for each one",
      },
      {
        href: "/security-plus-pbq-examples",
        label: "Security+ PBQ examples",
        note: "Work through interactive performance-based questions",
      },
      {
        href: "/best-security-plus-practice-tests",
        label: "Best Security+ practice tests, compared",
        note: "How the top SY0-701 question banks stack up",
      },
      {
        href: "/tools/port-numbers-quiz",
        label: "Port numbers quiz",
        note: "Drill the ports Security+ loves to test",
      },
      {
        href: "/tools/security-plus-acronyms-quiz",
        label: "Security+ acronyms list and quiz",
        note: "Master the SY0-701 acronym soup",
      },
    ],
  },
  {
    path: "network-plus-practice-test",
    certSlugs: ["network-plus-n10-009"],
    title: "Network+ practice test",
    metaTitle: "Free CompTIA Network+ Practice Test (N10-009)",
    metaDescription:
      "Free Network+ N10-009 practice questions with explanations, weighted by the real exam domains. Take the free readiness check and get your readiness score.",
    h1: "Free CompTIA Network+ (N10-009) practice test",
    intro: [
      "These are original questions written against the N10-009 objectives — subnetting, routing, wireless, troubleshooting — each with a full explanation. CertBench holds 600+ Network+ questions weighted by the real exam domains.",
      "Try the samples, then take the free 3-minute readiness check to see your readiness score and weakest domains — no account.",
    ],
    faqs: [
      {
        question: "How many questions are on the Network+ exam?",
        answer:
          "The N10-009 exam has a maximum of 90 questions in 90 minutes, mixing multiple-choice with performance-based questions like network topology and configuration scenarios.",
      },
      {
        question: "What score do I need to pass Network+?",
        answer:
          "720 on a scale of 100–900. Plan to score comfortably above 80% on full-length practice exams before you book the real thing.",
      },
      {
        question: "Should I take Network+ before Security+?",
        answer:
          "CompTIA recommends Network+ first because Security+ assumes networking fundamentals — ports, protocols, and topology questions show up constantly in security scenarios. Plenty of people go straight to Security+ though, especially with IT experience.",
      },
      {
        question: "Are these real Network+ exam questions?",
        answer:
          "No — they're original questions mapped to the same N10-009 objectives at exam-level difficulty. Braindumps violate CompTIA policy and can void your certification.",
      },
      {
        question: "Is there a free N10-009 practice test here?",
        answer:
          "Yes. The warm-up, the sample questions and the 3-minute readiness check are free with no account. A free account saves your progress and opens your Network+ path through its readiness checkpoint; Pro opens the rest, with full-length timed exams and every PBQ lab. N10-009 is the current Network+ exam version, so everything here targets it.",
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
        note: "10 questions, no account: an estimate by domain",
      },
      {
        href: "/network-plus-pbq-examples",
        label: "Network+ PBQ examples",
        note: "Try interactive topology and troubleshooting scenarios",
      },
      {
        href: "/best-network-plus-practice-tests",
        label: "Best Network+ practice tests, compared",
        note: "How the top N10-009 question banks stack up",
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
        note: "The ports and protocols N10-009 tests hardest",
      },
    ],
  },
  {
    path: "a-plus-practice-test",
    certSlugs: ["a-plus-core1-220-1201", "a-plus-core2-220-1202"],
    title: "A+ practice test",
    metaTitle: "Free CompTIA A+ Practice Test (Core 1 & 2)",
    metaDescription:
      "Free CompTIA A+ Core 1 and Core 2 practice questions with full explanations, written to today's 220-1201/1202 exams. No account needed.",
    h1: "Free CompTIA A+ practice test (Core 1 & Core 2)",
    intro: [
      "A+ is two exams: Core 1 (hardware, networking, mobile devices, cloud) and Core 2 (operating systems, security, software troubleshooting). Each has its own practice test above; the samples below come from both, each with a full explanation. CertBench holds 1,300+ A+ questions across the two cores, all written to 220-1201 and 220-1202.",
      "Try them, then take the free readiness check for whichever core you're sitting first.",
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
          "Core 1 (220-1201) requires 675/900 and Core 2 (220-1202) requires 700/900. The two exams are booked and taken separately.",
      },
      {
        question: "Which A+ exam version is current?",
        answer:
          "220-1201 and 220-1202, which CompTIA calls V15, launched on March 25, 2025. The older 220-1101 and 220-1102 retired on September 25, 2025. Our A+ questions are written to 220-1201 and 220-1202: each sits under its V15 objective, the topics V15 added have their own questions, and the ones it dropped are gone.",
      },
      {
        question: "Which core should I take first?",
        answer:
          "Most people take Core 1 first — it's the order CompTIA presents them and Core 2's troubleshooting content builds on Core 1's hardware foundation. There's no rule though; take them in whichever order fits your study plan.",
      },
      {
        question: "Are these real A+ exam questions?",
        answer:
          "No. They're original questions written to the 220-1201/1202 objectives at exam-level difficulty, with explanations. Braindumps violate CompTIA policy and can void your certification.",
      },
      {
        question: "Is this a free A+ exam practice test?",
        answer:
          "Yes. The sample questions on this page, each core's warm-up and both readiness checks are free with no account. A free account saves your progress and opens each core's path through its readiness checkpoint; Pro opens the rest of your core's path, with full-length timed exams and every PBQ lab.",
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
        note: "10 questions, no account: an estimate by domain",
      },
      {
        href: "/readiness-check/a-plus-core2-220-1202",
        label: "A+ Core 2 readiness check",
        note: "10 questions, no account: an estimate by domain",
      },
      {
        href: "/best-a-plus-practice-tests",
        label: "Best A+ practice tests, compared",
        note: "How the top A+ Core 1 & 2 question banks stack up",
      },
      {
        href: "/tools/port-numbers-quiz",
        label: "Port numbers quiz",
        note: "Core 1 networking — the ports you need cold",
      },
      {
        href: "/tools/subnetting-practice",
        label: "Subnetting practice",
        note: "Core 1 IP addressing, drilled",
      },
    ],
  },
  {
    path: "a-plus-core-1-practice-test",
    certSlugs: ["a-plus-core1-220-1201"],
    title: "A+ Core 1 practice test",
    metaTitle: "Free CompTIA A+ Core 1 Practice Test (220-1201)",
    metaDescription:
      "Free A+ Core 1 (220-1201) practice questions with full explanations, across all five domains: mobile devices, networking, hardware, cloud and troubleshooting. No account needed.",
    h1: "Free CompTIA A+ Core 1 (220-1201) practice test",
    intro: [
      "Core 1 is the hardware and networking half of A+: mobile devices, networking, hardware, virtualization and cloud computing, and hardware and network troubleshooting. Every question here is original, written to the 220-1201 objectives, with a full explanation. CertBench holds 650+ Core 1 questions across all 27 objectives.",
      "Try the warm-up above and the samples below, then take the free readiness check for an estimate by domain, no account needed.",
    ],
    faqs: [
      {
        question: "How many questions are on A+ Core 1?",
        answer:
          "220-1201 has a maximum of 90 questions in 90 minutes, a mix of multiple-choice and performance-based questions. The passing score is 675 on a scale of 100 to 900.",
      },
      {
        question: "What does 220-1201 cover?",
        answer:
          "Five domains: mobile devices (13%), networking (23%), hardware (25%), virtualization and cloud computing (11%), and hardware and network troubleshooting (28%), the largest. That runs from laptop parts and Wi-Fi standards to RAID, printers and cloud models.",
      },
      {
        question: "What changed from 220-1101?",
        answer:
          "220-1201 replaced 220-1101, which CompTIA retired on September 25, 2025. Most topics carried over and the objectives were renumbered; the troubleshooting methodology is no longer tested on its own. Every question here sits under its 220-1201 objective.",
      },
      {
        question: "Should I take Core 1 or Core 2 first?",
        answer:
          "Most people take Core 1 first: its hardware and networking foundation comes up again in Core 2's troubleshooting. There's no rule, but you need both cores, from the same series, to earn A+.",
      },
      {
        question: "Are these real A+ exam questions?",
        answer:
          "No. They're original questions written to the 220-1201 objectives at exam-level difficulty, with explanations. Braindumps violate CompTIA policy and can void your certification.",
      },
      {
        question: "Is this Core 1 practice test free?",
        answer:
          "Yes. The warm-up, the sample questions and the readiness check are free with no account. A free account saves your progress and opens your Core 1 path through its readiness checkpoint; Pro opens the rest, with full-length timed exams and every PBQ lab.",
      },
    ],
    related: [
      {
        href: "/readiness-check/a-plus-core1-220-1201",
        label: "A+ Core 1 readiness check",
        note: "10 questions, no account: an estimate by domain",
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
        note: "Core 1 networking — the ports you need cold",
      },
      {
        href: "/tools/subnetting-practice",
        label: "Subnetting practice",
        note: "Core 1 IP addressing, drilled",
      },
    ],
  },
  {
    path: "a-plus-core-2-practice-test",
    certSlugs: ["a-plus-core2-220-1202"],
    title: "A+ Core 2 practice test",
    metaTitle: "Free CompTIA A+ Core 2 Practice Test (220-1202)",
    metaDescription:
      "Free A+ Core 2 (220-1202) practice questions with full explanations: operating systems, security, software troubleshooting and operational procedures, AI included. No account needed.",
    h1: "Free CompTIA A+ Core 2 (220-1202) practice test",
    intro: [
      "Core 2 is the software half of A+: operating systems, security, software troubleshooting and operational procedures. Every question here is original, written to the 220-1202 objectives, with a full explanation. CertBench holds 700+ Core 2 questions across all 36 objectives, including the two 220-1202 added: cloud productivity tools and artificial intelligence.",
      "Try the warm-up above and the samples below, then take the free readiness check for an estimate by domain, no account needed.",
    ],
    faqs: [
      {
        question: "How many questions are on A+ Core 2?",
        answer:
          "220-1202 has a maximum of 90 questions in 90 minutes, a mix of multiple-choice and performance-based questions. The passing score is 700 on a scale of 100 to 900.",
      },
      {
        question: "What does 220-1202 cover?",
        answer:
          "Four domains: operating systems (28%), security (28%), software troubleshooting (23%) and operational procedures (21%). That runs from Windows, macOS and Linux tools to malware removal, backups, scripting and remote access.",
      },
      {
        question: "What's new in 220-1202?",
        answer:
          "Two new objectives: installing and configuring cloud-based productivity tools (1.11), and basic concepts of artificial intelligence (4.10). Windows 11 joins Windows 10, the Linux tools add commands such as dnf, fsck and curl, and malware removal is now part of the Security domain. 220-1202 replaced 220-1102, which CompTIA retired on September 25, 2025.",
      },
      {
        question: "Do I need to take Core 1 first?",
        answer:
          "No. The cores are separate exams you can take in either order, though most people start with Core 1. You need both, from the same series, to earn A+.",
      },
      {
        question: "Are these real A+ exam questions?",
        answer:
          "No. They're original questions written to the 220-1202 objectives at exam-level difficulty, with explanations. Braindumps violate CompTIA policy and can void your certification.",
      },
      {
        question: "Is this Core 2 practice test free?",
        answer:
          "Yes. The warm-up, the sample questions and the readiness check are free with no account. A free account saves your progress and opens your Core 2 path through its readiness checkpoint; Pro opens the rest, with full-length timed exams and every PBQ lab.",
      },
    ],
    related: [
      {
        href: "/readiness-check/a-plus-core2-220-1202",
        label: "A+ Core 2 readiness check",
        note: "10 questions, no account: an estimate by domain",
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
    metaTitle: "Free Interactive Security+ PBQ Examples",
    metaDescription:
      "Interactive Security+ performance-based question examples you can actually work through in your browser — firewall rules, log analysis, and more. Free, no signup.",
    h1: "Security+ PBQ examples you can actually try",
    intro: [
      "Performance-based questions are the part of Security+ people fear most: instead of picking A, B, C, or D, you configure firewall rules, analyse logs, or order incident-response steps in an interactive console. They usually appear first in the exam and are worth more than multiple-choice questions.",
      "Reading about PBQs isn't the same as doing one. The scenario below is fully interactive — work through it right here, get graded with partial credit, and see exactly how the real thing feels.",
    ],
    faqs: [
      {
        question: "How many PBQs are on the Security+ exam?",
        answer:
          "Typically 3–5, usually at the very start of the exam. They're worth more than multiple-choice questions, and partial credit is awarded — so never leave one blank.",
      },
      {
        question: "Should I do PBQs first or skip them?",
        answer:
          "A common strategy is to flag them, clear the multiple-choice questions for guaranteed points, then return with the remaining time. But practise them enough beforehand and you won't need to skip — they're very learnable.",
      },
      {
        question: "What topics do Security+ PBQs cover?",
        answer:
          "Common themes: firewall/ACL configuration, log analysis, matching attacks to mitigations, ordering incident-response steps, and certificate or authentication setups. CertBench has interactive simulations for each style.",
      },
    ],
    related: [
      {
        href: "/security-plus-practice-test",
        label: "Security+ practice test",
        note: "Original SY0-701 questions with full explanations",
      },
      {
        href: "/readiness-check/security-plus-sy0-701",
        label: "Security+ readiness check",
        note: "10 questions, no account: an estimate by domain",
      },
      {
        href: "/tools/port-numbers-quiz",
        label: "Port numbers quiz",
        note: "Drill the ports Security+ loves to test",
      },
    ],
  },
  {
    path: "network-plus-pbq-examples",
    certSlug: "network-plus-n10-009",
    title: "Network+ PBQ examples",
    metaTitle: "Free Interactive Network+ PBQ Examples",
    metaDescription:
      "Interactive Network+ performance-based question examples — network topology, configuration, and troubleshooting scenarios you can work through free in your browser.",
    h1: "Network+ PBQ examples you can actually try",
    intro: [
      "Network+ PBQs drop you into a scenario — a topology to complete, a switch to configure, a connectivity issue to trace — instead of a multiple-choice list. They appear early in the exam and carry more weight than regular questions.",
      "The scenario below is fully interactive: work through it in your browser, get graded with partial credit, and feel what the real exam's hands-on questions are like.",
    ],
    faqs: [
      {
        question: "How many PBQs are on the Network+ exam?",
        answer:
          "Usually 3–5, mostly at the start. They take longer than multiple-choice questions but award partial credit, so always attempt every part.",
      },
      {
        question: "What topics do Network+ PBQs cover?",
        answer:
          "Expect network topology completion, device configuration, port/protocol matching, wireless setup, and troubleshooting sequences. Subnetting frequently appears inside these scenarios too.",
      },
      {
        question: "How do I practise PBQs without exam dumps?",
        answer:
          "Use interactive simulations built to the exam objectives, like the ones on this page — they exercise the same skills without violating CompTIA's exam-security policies the way braindumps do.",
      },
    ],
    related: [
      {
        href: "/network-plus-practice-test",
        label: "Network+ practice test",
        note: "Original N10-009 questions with full explanations",
      },
      {
        href: "/readiness-check/network-plus-n10-009",
        label: "Network+ readiness check",
        note: "10 questions, no account: an estimate by domain",
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
    metaTitle: "Free Interactive A+ Core 1 PBQ Examples",
    metaDescription:
      "Interactive CompTIA A+ Core 1 (220-1201) performance-based question examples you can work through in your browser: ports, hardware faults, and SOHO network setup. Free, no signup.",
    h1: "A+ Core 1 PBQ examples you can actually try",
    intro: [
      "Performance-based questions ask you to do the job instead of picking A, B, C, or D: put a process in order, match ports to services, or work through a hardware fault step by step. They take longer than multiple-choice questions, so they're worth practising before exam day.",
      "The scenarios below are fully interactive. Work through one in your browser, get graded straight away, and see what the hands-on part of Core 1 feels like.",
    ],
    faqs: [
      {
        question: "How many PBQs are on A+ Core 1?",
        answer:
          "CompTIA doesn't publish a number, and it varies by exam form. Expect a handful among the 90 questions, often near the start, and budget extra time for them.",
      },
      {
        question: "What topics do A+ Core 1 PBQs cover?",
        answer:
          "Hardware and network troubleshooting is the biggest domain on Core 1, so expect fault-finding scenarios, along with networking tasks like matching ports to services and hardware tasks like choosing connectors or printer steps.",
      },
      {
        question: "Are these written for 220-1201 or 220-1101?",
        answer:
          "220-1201, today's Core 1 exam, which replaced 220-1101 when it retired on September 25, 2025. Every scenario sits under a 220-1201 domain, and the troubleshooting-methodology drill is gone because 220-1201 no longer tests the method itself.",
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
        note: "Original 220-1201 questions with full explanations",
      },
      {
        href: "/readiness-check/a-plus-core1-220-1201",
        label: "A+ Core 1 readiness check",
        note: "10 questions, no account: an estimate by domain",
      },
      {
        href: "/tools/port-numbers-quiz",
        label: "Port numbers quiz",
        note: "Core 1 networking: the ports you need cold",
      },
    ],
  },
  {
    path: "a-plus-core-2-pbq-examples",
    certSlug: "a-plus-core2-220-1202",
    title: "A+ Core 2 PBQ examples",
    metaTitle: "Free Interactive A+ Core 2 PBQ Examples",
    metaDescription:
      "Interactive CompTIA A+ Core 2 (220-1202) performance-based question examples you can work through in your browser: malware removal, Windows tools, and mobile security. Free, no signup.",
    h1: "A+ Core 2 PBQ examples you can actually try",
    intro: [
      "Performance-based questions ask you to do the job instead of picking A, B, C, or D: put the malware removal steps in order, match Windows tools to their purpose, or set up a security policy from a brief. They take longer than multiple-choice questions, so they're worth practising before exam day.",
      "The scenarios below are fully interactive. Work through one in your browser, get graded straight away, and see what the hands-on part of Core 2 feels like.",
    ],
    faqs: [
      {
        question: "How many PBQs are on A+ Core 2?",
        answer:
          "CompTIA doesn't publish a number, and it varies by exam form. Expect a handful among the 90 questions, often near the start, and budget extra time for them.",
      },
      {
        question: "What topics do A+ Core 2 PBQs cover?",
        answer:
          "Operating systems and security are the two biggest domains on Core 2, so expect Windows tools and settings, malware removal steps, and security configuration, along with troubleshooting scenarios.",
      },
      {
        question: "Are these written for 220-1202 or 220-1102?",
        answer:
          "220-1202, today's Core 2 exam, which replaced 220-1102 when it retired on September 25, 2025. Every scenario sits under a 220-1202 domain: malware removal, for one, is a Security topic on 220-1202.",
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
        note: "Original 220-1202 questions with full explanations",
      },
      {
        href: "/readiness-check/a-plus-core2-220-1202",
        label: "A+ Core 2 readiness check",
        note: "10 questions, no account: an estimate by domain",
      },
    ],
  },
];
