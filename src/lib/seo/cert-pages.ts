/**
 * Static content for the public SEO pages (practice tests + PBQ examples).
 * Exam facts are public knowledge from CompTIA's exam pages; keep prices
 * approximate so drift doesn't make us wrong.
 */

export interface CertPageFaq {
  question: string;
  answer: string;
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
}

export const PRACTICE_TEST_PAGES: PracticeTestPage[] = [
  {
    path: "security-plus-practice-test",
    certSlugs: ["security-plus-sy0-701"],
    title: "Security+ practice test",
    metaTitle: "Free CompTIA Security+ (SY0-701) Practice Test — CertBench",
    metaDescription:
      "Free Security+ SY0-701 practice questions with full explanations, weighted by real exam domains. Take the 25-question diagnostic and get your readiness score.",
    h1: "Free CompTIA Security+ (SY0-701) practice test",
    intro: [
      "Every question below is original, written against the SY0-701 exam objectives, and comes with a full explanation — no braindumps, no recycled question banks. CertBench holds 800+ Security+ questions across all five domains, weighted the way the real exam weights them.",
      "Try the samples, then take the free 25-question diagnostic to get a readiness score that tells you exactly which domains need work.",
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
    ],
  },
  {
    path: "network-plus-practice-test",
    certSlugs: ["network-plus-n10-009"],
    title: "Network+ practice test",
    metaTitle: "Free CompTIA Network+ (N10-009) Practice Test — CertBench",
    metaDescription:
      "Free Network+ N10-009 practice questions with explanations, weighted by the real exam domains. Take the free diagnostic and get your readiness score.",
    h1: "Free CompTIA Network+ (N10-009) practice test",
    intro: [
      "These are original questions written against the N10-009 objectives — subnetting, routing, wireless, troubleshooting — each with a full explanation. CertBench holds 600+ Network+ questions weighted by the real exam domains.",
      "Try the samples, then take the free 25-question diagnostic to see your readiness score and weakest domains.",
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
    ],
  },
  {
    path: "a-plus-practice-test",
    certSlugs: ["a-plus-core1-220-1101", "a-plus-core2-220-1102"],
    title: "A+ practice test",
    metaTitle: "Free CompTIA A+ Practice Test (Core 1 & Core 2) — CertBench",
    metaDescription:
      "Free A+ 220-1101 and 220-1102 practice questions with explanations. Try samples from both cores, then take the free diagnostic for your readiness score.",
    h1: "Free CompTIA A+ practice test (Core 1 & Core 2)",
    intro: [
      "A+ is two exams — Core 1 (220-1101: hardware, networking, mobile, cloud) and Core 2 (220-1102: operating systems, security, software troubleshooting). The samples below come from both, each with a full explanation. CertBench holds 1,100+ A+ questions across the two cores.",
      "Try them, then take the free diagnostic for whichever core you're sitting first.",
    ],
    faqs: [
      {
        question: "How many questions are on the A+ exams?",
        answer:
          "Each core has a maximum of 90 questions in 90 minutes, including performance-based questions. You must pass both cores to earn the A+ certification.",
      },
      {
        question: "What scores do I need to pass A+?",
        answer:
          "Core 1 (220-1101) requires 675/900 and Core 2 (220-1102) requires 700/900. The two exams are booked and taken separately.",
      },
      {
        question: "Which core should I take first?",
        answer:
          "Most people take Core 1 first — it's the order CompTIA presents them and Core 2's troubleshooting content builds on Core 1's hardware foundation. There's no rule though; take them in whichever order fits your study plan.",
      },
      {
        question: "Are these real A+ exam questions?",
        answer:
          "No — they're original questions written to the 220-1101/1102 objectives at exam-level difficulty, with explanations. Braindumps violate CompTIA policy and can void your certification.",
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
}

export const PBQ_EXAMPLE_PAGES: PbqExamplePage[] = [
  {
    path: "security-plus-pbq-examples",
    certSlug: "security-plus-sy0-701",
    title: "Security+ PBQ examples",
    metaTitle: "Security+ PBQ Examples — Try a Real Practice PBQ Free",
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
  },
  {
    path: "network-plus-pbq-examples",
    certSlug: "network-plus-n10-009",
    title: "Network+ PBQ examples",
    metaTitle: "Network+ PBQ Examples — Try a Real Practice PBQ Free",
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
  },
];
