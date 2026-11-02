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
          "Yes — the questions on this page are free with no account, and the free 3-minute readiness check gives you a readiness score. Pro adds the full 25-question N10-009 diagnostic, a personalised daily plan, and unlimited practice. N10-009 is the current Network+ exam version, so everything here targets it.",
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
    certSlugs: ["a-plus-core1-220-1101", "a-plus-core2-220-1102"],
    title: "A+ practice test",
    metaTitle: "Free CompTIA A+ Practice Test (Core 1 & 2)",
    metaDescription:
      "Free CompTIA A+ Core 1 and Core 2 practice questions with full explanations. Written to 220-1101/1102; most topics carry over to today's 220-1201/1202 exams.",
    h1: "Free CompTIA A+ practice test (Core 1 & Core 2)",
    intro: [
      "A+ is two exams: Core 1 (hardware, networking, mobile devices, cloud) and Core 2 (operating systems, security, software troubleshooting). The samples below come from both, each with a full explanation. CertBench holds 1,100+ A+ questions across the two cores.",
      "Try them, then take the free readiness check for whichever core you're sitting first.",
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
          "220-1201 and 220-1202, which CompTIA calls V15, launched on March 25, 2025. The older 220-1101 and 220-1102 retired on September 25, 2025. Our A+ questions were written to the older objectives. Professor Messer's comparisons count about 87% of Core 1 and 80% of Core 2 as unchanged, so they still cover most of what you'll be asked, but we haven't added the new topics yet.",
      },
      {
        question: "Which core should I take first?",
        answer:
          "Most people take Core 1 first — it's the order CompTIA presents them and Core 2's troubleshooting content builds on Core 1's hardware foundation. There's no rule though; take them in whichever order fits your study plan.",
      },
      {
        question: "Are these real A+ exam questions?",
        answer:
          "No. They're original questions written to the 220-1101/1102 objectives at exam-level difficulty, with explanations. Braindumps violate CompTIA policy and can void your certification.",
      },
      {
        question: "Is this a free A+ exam practice test?",
        answer:
          "Yes. The sample questions on this page are free with no account, split between Core 1 and Core 2. The free readiness check gives you a score, and Pro adds the full 25-question diagnostic per core, a personalised daily plan, and unlimited practice.",
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
        href: "/readiness-check/a-plus-core1-220-1101",
        label: "A+ Core 1 readiness check",
        note: "10 questions, no account: an estimate by domain",
      },
      {
        href: "/readiness-check/a-plus-core2-220-1102",
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
];

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
    certSlug: "a-plus-core1-220-1101",
    title: "A+ Core 1 PBQ examples",
    metaTitle: "Free Interactive A+ Core 1 PBQ Examples",
    metaDescription:
      "Interactive CompTIA A+ Core 1 performance-based question examples you can work through in your browser: ports, troubleshooting steps, and hardware scenarios. Free, no signup.",
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
          "220-1101, which CompTIA retired on September 25, 2025. Today's Core 1 exam is 220-1201. Most topics carry over, and the hands-on skills in these scenarios still apply, but we haven't added the new topics yet.",
      },
    ],
    related: [
      {
        href: "/a-plus-core-2-pbq-examples",
        label: "A+ Core 2 PBQ examples",
        note: "Windows, security and malware removal scenarios to work through",
      },
      {
        href: "/a-plus-practice-test",
        label: "A+ practice test",
        note: "Original Core 1 and Core 2 questions with full explanations",
      },
      {
        href: "/readiness-check/a-plus-core1-220-1101",
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
    certSlug: "a-plus-core2-220-1102",
    title: "A+ Core 2 PBQ examples",
    metaTitle: "Free Interactive A+ Core 2 PBQ Examples",
    metaDescription:
      "Interactive CompTIA A+ Core 2 performance-based question examples you can work through in your browser: malware removal, Windows tools, and mobile security. Free, no signup.",
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
          "220-1102, which CompTIA retired on September 25, 2025. Today's Core 2 exam is 220-1202. Most topics carry over, and the hands-on skills in these scenarios still apply, but we haven't added the new topics yet.",
      },
    ],
    related: [
      {
        href: "/a-plus-core-1-pbq-examples",
        label: "A+ Core 1 PBQ examples",
        note: "Hardware, networking and troubleshooting scenarios to work through",
      },
      {
        href: "/a-plus-practice-test",
        label: "A+ practice test",
        note: "Original Core 1 and Core 2 questions with full explanations",
      },
      {
        href: "/readiness-check/a-plus-core2-220-1102",
        label: "A+ Core 2 readiness check",
        note: "10 questions, no account: an estimate by domain",
      },
    ],
  },
];
