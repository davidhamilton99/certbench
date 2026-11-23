import type { CertPageFaq } from "@/lib/seo/cert-pages";
import { PASS_GUARANTEE_TERMS } from "@/lib/pricing/guarantee";
import { PRO_PRICE_SHORT, PRO_PRICE_TERMS } from "@/lib/pricing/terms";

/**
 * Content for the pages a visitor reads while deciding: the "best practice
 * tests" guides, and the pages that compare CertBench with one other product.
 *
 * House rules for this content:
 * - Every competitor has its real strengths stated plainly, and CertBench's
 *   rows concede what it does not have.
 * - CertBench publishes these pages. Each description says so, and so does
 *   each answer that could be quoted without the page around it.
 * - A competitor's price carries `source` and `checked` only when it was read
 *   on the vendor's own page on that day. Every other price is hedged
 *   ("typically", "often") and carries no date.
 * - A judgment is attributed to CertBench. Nothing is said about what most
 *   candidates do or recommend, because CertBench has no source for it. No
 *   ratings, user counts or quotations are invented.
 */

/** When the words in this file last changed, for the sitemap and for a "last updated" line. */
export const COMPARISON_PAGES_UPDATED_ISO = "2026-11-22";

/** The day the vendors' own pages were read for every price that carries `checked`. */
const VENDOR_PRICES_CHECKED = "November 22, 2026";

/** The vendors' own pages, where the prices marked as checked were read. */
const VENDOR_PAGES = {
  bosonSecurity: "https://boson.com/certifications/comptia-security/",
  bosonNetwork: "https://boson.com/certifications/comptia-network/",
  bosonAPlus: "https://boson.com/certifications/comptia-a/",
  messerSecurity: "https://www.professormesser.com/sy0-701-success-bundle/",
  messerAPlusCore1: "https://www.professormesser.com/220-1201-success-bundle/",
  dionTraining: "https://www.diontraining.com/",
  totalTesterAPlus: "https://totalsem.com/product/comptia-a-certification-totaltester/",
  pocketPrepSecurity: "https://www.pocketprep.com/exams/comptia-security/",
} as const;

const BOSON_PRICE = "$99 a year for each exam";
const CERTMASTER_PRICE = "Typically more than $150 for each exam";

/** What a visitor can use without paying, for the "Free to try" row of each comparison. */
const CERTBENCH_FREE =
  "A full-length practice exam of 90 questions, the introductory questions, a readiness check and three hands-on labs need no account. A free account shows the exam score, opens 12 labs in all, and opens the study path up to its readiness checkpoint";

/** Said first on a comparison page, so that every judgment on it has an owner. */
const VS_DISCLOSURE = "CertBench publishes this comparison, and the assessments in it are its own.";

export interface ComparisonRow {
  feature: string;
  certbench: string;
  competitor: string;
}

export interface VsPage {
  slug: string;
  competitorName: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string[];
  /** The honest verdict, both directions. */
  chooseThem: string[];
  chooseUs: string[];
  rows: ComparisonRow[];
  faqs: CertPageFaq[];
  /** The vendor's own page where the competitor's price was read. Set only with `priceChecked`. */
  priceSource?: string;
  /** The day that price was read there, as printed: "November 22, 2026". */
  priceChecked?: string;
}

export const VS_PAGES: VsPage[] = [
  {
    slug: "certbench-vs-boson",
    competitorName: "Boson ExSim",
    metaTitle: "CertBench vs Boson ExSim for Security+",
    metaDescription:
      "CertBench's own comparison of CertBench and Boson ExSim-Max for CompTIA Security+: exam realism, explanations, the study path, spaced repetition and price.",
    h1: "CertBench and Boson ExSim compared",
    intro: [
      `${VS_DISCLOSURE} Boson's ExSim-Max is a full-length exam simulator, and in CertBench's assessment it gives the closest experience to the real Security+ exam. If that is what you want in the week before your exam, Boson is an excellent choice.`,
      "The useful comparison is what each product is for. Boson is an exam simulator for the final weeks, which you run two or three times. CertBench is for the weeks before that. It provides a study path through every SY0-701 objective in short steps, brings back the questions that you missed until you can answer them, and gives a readiness score from a checkpoint and timed practice exams. The two products do different jobs, and the comparison below sets out each one.",
    ],
    chooseThem: [
      `You want the most realistic full-length simulation and are willing to pay ${BOSON_PRICE}`,
      "You are in your final two weeks and mainly need full practice exams, not a study system",
      "You want a detailed explanation of every question in a full-length exam",
    ],
    chooseUs: [
      "You want a study path that always has your next step ready, and not only a score on a practice exam",
      "You want spaced repetition of the questions that you missed built in, instead of managing Anki separately",
      "You want to try it free of charge first, without a payment card, and then pay only for the months in which you study",
    ],
    rows: [
      { feature: "Full-length exam realism", certbench: "Timed 90-question practice exams, weighted like the real exam", competitor: "In CertBench's assessment, the closest simulation of the real exam" },
      { feature: "Explanations", certbench: "Every answer is explained, and exam-style questions have a full explanation", competitor: "Excellent and very detailed" },
      { feature: "Study path", certbench: "Yes: a short step for every objective, in order", competitor: "No" },
      { feature: "Spaced repetition", certbench: "Built in for every question that you miss", competitor: "No" },
      { feature: "Readiness score", certbench: "Domain-weighted, from a checkpoint and timed practice exams", competitor: "A score report for each exam" },
      { feature: "Interactive PBQ practice", certbench: "Hands-on labs in the browser", competitor: "Limited" },
      { feature: "Free to try", certbench: CERTBENCH_FREE, competitor: "Demo only" },
      { feature: "Price", certbench: PRO_PRICE_SHORT, competitor: BOSON_PRICE },
    ],
    faqs: [
      {
        question: "Is Boson ExSim worth it for Security+?",
        answer:
          "CertBench, which publishes this comparison, considers that it is, if you want the greatest realism and can afford it. In CertBench's assessment, ExSim-Max matches the real exam's difficulty and style closely, and its explanations are excellent. CertBench recommends pairing a structured study system with one or two Boson runs in the final two weeks. The two approaches complement each other more than they compete.",
      },
      {
        question: "Can I use CertBench and Boson together?",
        answer:
          "Yes. CertBench, which publishes this comparison, recommends this combination: CertBench's study path, spaced repetition and readiness score throughout your preparation, and then a Boson simulation in the last week or two as a final practice exam. Two independent results that agree are a better guide than one, although neither is a guarantee.",
      },
      {
        question: "How do the prices of CertBench and Boson compare?",
        answer: `The two products are sold in different ways. Boson sells ExSim-Max at ${BOSON_PRICE}. CertBench's study path is free to start (introductory questions with no account, and then a free account up to the readiness checkpoint). ${PRO_PRICE_TERMS} Pro opens the rest of the study path for one exam: every step, every hands-on lab and timed practice exams. Pro carries a pass guarantee. ${PASS_GUARANTEE_TERMS}`,
      },
    ],
    priceSource: VENDOR_PAGES.bosonSecurity,
    priceChecked: VENDOR_PRICES_CHECKED,
  },
  {
    slug: "certbench-vs-certmaster",
    competitorName: "CompTIA CertMaster",
    metaTitle: "CertBench vs CompTIA CertMaster Practice",
    metaDescription:
      "CertBench's own comparison of CertBench and CompTIA's official CertMaster Practice for Security+: alignment with the objectives, the study path, spaced repetition, readiness tracking and price.",
    h1: "CertBench and CertMaster compared",
    intro: [
      `${VS_DISCLOSURE} CertMaster is CompTIA's own product, and that brings real advantages: alignment with the objectives by the organization that writes them, integration with the official courseware, and the credibility of the exam vendor itself. If your employer or school provides it, you should use it.`,
      "If you are paying for it yourself, the calculation is different. CertMaster Practice typically costs more than $150 for each exam, and it is built around practice tests and objective assessments with mastery scores, whereas CertBench is a study path through every objective. The comparison below sets out what each one offers for its price.",
    ],
    chooseThem: [
      "Your employer, school or bootcamp already provides CertMaster, so the official content costs you nothing",
      "You want the reassurance of studying from the exam vendor itself",
      "You are buying a full CompTIA bundle (courseware, labs and practice) through an academic program at a discount",
    ],
    chooseUs: [
      "You are paying for it yourself, and the price matters to you",
      "You want a study path through every objective, which brings back the questions that you missed until you can answer them",
      "You want a readiness score from exam-style questions, weighted the way the real exam weights its domains",
    ],
    rows: [
      { feature: "Official CompTIA alignment", certbench: "Written independently to the exam objectives", competitor: "The exam vendor's own content" },
      { feature: "Study path", certbench: "Yes: a short step for every objective, in order", competitor: "Practice tests and objective assessments that find gaps by domain" },
      { feature: "Spaced repetition", certbench: "Built in for every question that you miss", competitor: "No scheduled spaced repetition" },
      { feature: "Readiness score", certbench: "Domain-weighted, from a checkpoint and timed practice exams", competitor: "Progress and topic mastery indicators" },
      { feature: "Interactive PBQ practice", certbench: "Hands-on labs in the browser", competitor: "In CertMaster Labs (sold separately)" },
      { feature: "Free to try", certbench: CERTBENCH_FREE, competitor: "No" },
      { feature: "Price", certbench: PRO_PRICE_SHORT, competitor: CERTMASTER_PRICE },
    ],
    faqs: [
      {
        question: "Is CertMaster Practice worth the price?",
        answer:
          "CertBench publishes this comparison, so this answer is its own view. If someone else is paying (an employer, a school program or a training grant), you should use it. If you are paying for it yourself, compare its price with independent practice platforms before you buy. Any money that you save can go toward the exam voucher, which is the one cost that cannot be avoided.",
      },
      {
        question: "Are CertBench questions aligned to the same objectives as CertMaster?",
        answer:
          "Yes. Every CertBench question is written against the current official exam objectives (SY0-701 and SY0-801 for Security+) and is linked to a specific objective, with domain weighting that matches the real exam. The difference is authorship, not coverage. CompTIA writes CertMaster's questions. CertBench's questions are original and written independently, and every answer is explained.",
      },
      {
        question: "Does using unofficial practice material risk my certification?",
        answer:
          "No. What violates CompTIA's policy is the use of braindumps, which are leaked copies of real exam questions. Every legitimate third-party publisher (Boson, Sybex, Dion, CertBench) writes original practice questions to the public exam objectives. CertBench contains no real exam content.",
      },
    ],
  },
  {
    slug: "certbench-vs-pocket-prep",
    competitorName: "Pocket Prep",
    metaTitle: "CertBench vs Pocket Prep for CompTIA",
    metaDescription:
      "CertBench's own comparison of CertBench and Pocket Prep for CompTIA Security+, Network+ and A+: the mobile experience, question depth, the study path, spaced repetition and price.",
    h1: "CertBench and Pocket Prep compared",
    intro: [
      `${VS_DISCLOSURE} Pocket Prep's apps are good at what they are designed for, which is studying in short intervals during the day. The mobile experience is polished, the offline mode works, and answering ten questions in a waiting room is a real way to study.`,
      "The trade-off is depth. Short-quiz apps are strongest at maintaining knowledge and weakest at building it systematically, and Pocket Prep has no hands-on PBQ practice. The comparison below sets out each product.",
    ],
    chooseThem: [
      "You study mainly on a phone (on journeys, in breaks and in queues) and you want a native app",
      "You want one subscription covering many certification bodies beyond CompTIA",
      "You mainly want short quizzes to maintain your knowledge, rather than a structured study path to an exam date",
    ],
    chooseUs: [
      "You are working toward an exam date and want a study path that shows when you will finish at your pace, with a readiness score against a target",
      "You want hands-on labs and timed full-length practice exams, and not only short quizzes",
      "You want spaced repetition that schedules the questions that you missed automatically",
    ],
    rows: [
      { feature: "Mobile experience", certbench: "A responsive web app that works well on a phone. There is no native app", competitor: "Polished native apps with offline mode" },
      { feature: "Full-length weighted exams", certbench: "Yes, weighted like the real exam", competitor: "Mock Exam mode (premium), at the real exam's length and time limit" },
      { feature: "Study path", certbench: "Yes: a short step for every objective, in order", competitor: "Level Up mode (premium): each subject in levels that get harder" },
      { feature: "Spaced repetition", certbench: "Built in for every question that you miss", competitor: "A review of missed questions, without scheduled repetition" },
      { feature: "Interactive PBQ practice", certbench: "Hands-on labs in the browser", competitor: "No" },
      { feature: "Readiness score", certbench: "Domain-weighted, from a checkpoint and timed practice exams", competitor: "Average-score tracking" },
      { feature: "Free to try", certbench: CERTBENCH_FREE, competitor: "Limited free question sample" },
      { feature: "Price", certbench: PRO_PRICE_SHORT, competitor: "Premium for Security+ costs $20.99 a month, $49.99 every three months, or $124.99 a year" },
    ],
    faqs: [
      {
        question: "Does CertBench work on a phone?",
        answer:
          "Yes. CertBench is designed for phones first. It runs in the browser and not as a native app, so there is no offline mode. There is nothing to install, and progress that is saved to your account is available on every device.",
      },
      {
        question: "Is quick-quiz studying enough to pass Security+?",
        answer:
          "CertBench publishes this comparison, so this answer is its own view. For some people it is, eventually, but the approach has gaps. Without full-length timed exams you do not build stamina for the exam, and without PBQ practice the hands-on questions in the real exam can cost you a pass. Quiz apps are excellent supplements, and they are a risk as your only preparation.",
      },
      {
        question: "Can I switch from Pocket Prep to CertBench mid-study?",
        answer:
          "Yes, and there is nothing to import. The readiness checkpoint in your CertBench study path, which comes after a few minutes, measures where you stand in each domain. For a fuller result, take the free full-length practice exam, and with Pro you can start a new one at any time.",
      },
    ],
    priceSource: VENDOR_PAGES.pocketPrepSecurity,
    priceChecked: VENDOR_PRICES_CHECKED,
  },
];

/* ------------------------------------------------------------------ */

export interface RoundupTool {
  name: string;
  price: string;
  bestFor: string;
  strengths: string[];
  weaknesses: string[];
  /** Set for CertBench's own entry, which then carries the disclosure. */
  isSelf?: boolean;
  /** Optional internal comparison link. */
  compareSlug?: string;
  /**
   * The vendor's own page, where `price` was read. Set only together with
   * `checked`: a date is printed beside a price only when the price was read
   * at this address on that day.
   */
  source?: string;
  /** The day `price` was read at `source`, as printed: "November 22, 2026". */
  checked?: string;
}

export interface RoundupData {
  path: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string[];
  tools: RoundupTool[];
  faqs: CertPageFaq[];
  /** The practice-test page this roundup funnels to ("try questions first"). */
  practiceTestPath: string;
}

const GUIDE_DISCLOSURE =
  "A disclosure first: CertBench publishes this guide, and CertBench is on this list. Every entry has been written fairly, including the respects in which other products are better, because a guide that misleads its readers is of no use to them.";

/**
 * How the products are ordered, whose judgments these are, and which prices
 * were read at the source. The order is alphabetical because it ranks nobody:
 * the publisher of a guide is in no position to place its own product.
 */
const GUIDE_METHOD =
  "The products are listed in alphabetical order. The strengths and limitations listed for each product are CertBench's own assessment. Where a price shows the date on which it was checked, CertBench read it on the vendor's own page on that date. The other prices are approximate and may have changed.";

/** A guide's products in the order the guide says they are in: alphabetical by the name printed. */
const alphabetical = (tools: RoundupTool[]): RoundupTool[] =>
  [...tools].sort((a, b) => a.name.localeCompare(b.name, "en"));

/** Opens an answer that could be quoted without the guide around it. */
const GUIDE_ANSWER_DISCLOSURE = "CertBench publishes this guide, so this answer is its own view.";

const NO_STUDY_SYSTEM = "No study system: no study path and no spaced repetition";
const WEB_APP_ONLY = "A web app only, with no native mobile app or offline mode";
const CERTMASTER_STYLE = "Built around practice tests and assessments rather than a study path through the objectives";
const MESSER_FORMAT = "Static PDF files, with no tracking, timing or review tools";

export const ROUNDUP: RoundupData = {
  path: "best-security-plus-practice-tests",
  metaTitle: "Best Security+ practice tests and exams in 2026",
  metaDescription:
    "CertBench publishes this guide to CompTIA Security+ (SY0-701) practice tests in 2026 and is one of the six products in it. The guide sets out the strengths, limitations and prices of Boson, CertBench, CertMaster, Dion Training, ExamCompass and Professor Messer.",
  h1: "The best Security+ practice tests and exams in 2026",
  intro: [
    GUIDE_DISCLOSURE,
    "CertBench recommends two things: a daily practice system for six to eight weeks, and one realistic full-length simulator in the final weeks. In CertBench's assessment, every product in this guide is good at one of those jobs, and none is the best at both.",
    GUIDE_METHOD,
  ],
  tools: alphabetical([
    {
      name: "Boson ExSim-Max",
      price: BOSON_PRICE,
      source: VENDOR_PAGES.bosonSecurity,
      checked: VENDOR_PRICES_CHECKED,
      bestFor: "A final practice exam in the last weeks",
      strengths: [
        "The most realistic full-length simulation in this guide: difficulty, style and pacing",
        "Very detailed explanations for every question",
      ],
      weaknesses: [NO_STUDY_SYSTEM, "Priced for each exam, with an older interface"],
      compareSlug: "certbench-vs-boson",
    },
    {
      name: "CertBench",
      price: PRO_PRICE_SHORT,
      bestFor: "A study path through every objective, on SY0-701 or SY0-801",
      isSelf: true,
      strengths: [
        "A study path for each Security+ version, SY0-701 and SY0-801: every objective in short steps, a readiness checkpoint, then timed full-length practice exams",
        "Spaced repetition of every question that you miss, and a readiness score weighted the way the real exam weights its domains",
        "Free: a full-length 90-question timed exam for each version and 12 interactive PBQs, with port, acronym and subnetting tools",
      ],
      weaknesses: [WEB_APP_ONLY, "A newer question bank than the established products, covering CompTIA exams only"],
    },
    {
      name: "CompTIA CertMaster Practice",
      price: CERTMASTER_PRICE,
      bestFor: "When your employer or school pays",
      strengths: [
        "The exam vendor's own content, aligned to the exam objectives",
        "Integrates with CompTIA courseware and instructor-led programs",
      ],
      weaknesses: [
        "Typically the most expensive option in this guide if you are paying for it yourself",
        CERTMASTER_STYLE,
      ],
      compareSlug: "certbench-vs-certmaster",
    },
    {
      name: "Professor Messer practice exams",
      price: "$30 for the digital edition, three practice exams of 90 questions",
      source: VENDOR_PAGES.messerSecurity,
      checked: VENDOR_PRICES_CHECKED,
      bestFor: "Pairing with his free video course",
      strengths: [
        "Excellent question quality with thorough written walkthroughs",
        "A natural companion if his free videos are already your main course",
      ],
      weaknesses: [MESSER_FORMAT],
    },
    {
      name: "Dion Training practice exam pack",
      price: "$29.99 for the practice exam pack, sold directly",
      source: VENDOR_PAGES.dionTraining,
      checked: VENDOR_PRICES_CHECKED,
      bestFor: "Practice exams at a low price",
      strengths: [
        "A pack of practice exams at a low price",
        "Jason Dion's practice exams are also sold on Udemy, whose exam player handles timing and basic review",
      ],
      weaknesses: ["No study system around the exams, so you manage your own review"],
    },
    {
      name: "ExamCompass",
      price: "Free",
      bestFor: "Free topic quizzes",
      strengths: [
        "Free quizzes in the browser, organized by topic",
        "Suitable as light practice alongside a course",
      ],
      weaknesses: ["Quizzes by topic only, with no study path around them"],
    },
  ] satisfies RoundupTool[]),
  faqs: [
    {
      question: "What is the best overall Security+ practice test?",
      answer: `${GUIDE_ANSWER_DISCLOSURE} For a single simulation in the final weeks, CertBench's assessment is that Boson ExSim-Max is the most realistic. For the weeks of study before that, the alternative to repeating static exams is a study system with spaced repetition, and CertBench is a product of that kind. For a limited budget, CertBench recommends a free video course, a daily practice system, and one simulator run before booking.`,
    },
    {
      question: "How many practice questions do I need before the real exam?",
      answer: `${GUIDE_ANSWER_DISCLOSURE} Volume matters less than coverage and correction. You should practice every SY0-701 domain, review every question that you miss until you can answer it, and take at least two full-length timed exams for stamina. CertBench does not recommend a number of questions. In its view, 300 questions with disciplined review of the ones that you missed are worth more than 1,500 answered once.`,
    },
    {
      question: "Are free Security+ practice tests good enough?",
      answer: `${GUIDE_ANSWER_DISCLOSURE} Free question banks, video courses and topic quizzes cover much of the knowledge. CertBench's own free plan includes a full-length practice exam of 90 questions and 12 interactive PBQs for Security+. What free options rarely include is continued feedback: spaced repetition of the questions that you missed, and further full-length exams. It is possible to pass with no budget at all. If you are able to spend anything, CertBench recommends spending it on those two things.`,
    },
    {
      question: "Should I buy more than one practice test product?",
      answer: `${GUIDE_ANSWER_DISCLOSURE} CertBench recommends two: one daily practice system and one simulator for the final weeks. Three or four question banks mostly overlap, and the additional questions teach less than a proper review of the questions that you have already missed.`,
    },
  ],
  practiceTestPath: "security-plus-practice-test",
};

export const A_PLUS_ROUNDUP: RoundupData = {
  path: "best-a-plus-practice-tests",
  metaTitle: "Best CompTIA A+ practice tests and exams in 2026",
  metaDescription:
    "CertBench publishes this guide to CompTIA A+ (220-1201 and 220-1202) practice tests in 2026 and is one of the six products in it. The guide sets out the strengths, limitations and prices of Boson, CertBench, CertMaster, Jason Dion, Professor Messer and TotalTester.",
  h1: "The best CompTIA A+ practice tests and exams in 2026",
  intro: [
    GUIDE_DISCLOSURE,
    "A+ is two separate exams, and you pass them one at a time. Core 1 (220-1201) covers hardware, networking, mobile devices and cloud computing, and Core 2 (220-1202) covers operating systems, security and troubleshooting. These exams replaced 220-1101 and 220-1102, which retired on September 25, 2025, so check which version a product was written to before you buy it. CertBench recommends a practice tool that tracks readiness for the two exams separately, together with one realistic simulator for each core before you book.",
    GUIDE_METHOD,
  ],
  tools: alphabetical([
    {
      name: "Total Seminars TotalTester (Mike Meyers)",
      price: "$69 for Core 1 and Core 2",
      source: VENDOR_PAGES.totalTesterAPlus,
      checked: VENDOR_PRICES_CHECKED,
      bestFor: "Candidates who study from the Mike Meyers book or video course",
      strengths: [
        "More than 1,000 multiple-choice questions for 220-1201 and 220-1202, with a single-user license for one year",
        "Pairs with the Mike Meyers All-in-One book and video course",
      ],
      weaknesses: [
        "A traditional test bank, with no study path or spaced repetition",
        "An interface and reports that are older than those of modern web apps",
      ],
    },
    {
      name: "CertBench",
      price: PRO_PRICE_SHORT,
      bestFor: "A study path through each core's objectives",
      isSelf: true,
      strengths: [
        "A study path for each core, written to 220-1201 and 220-1202: every objective in short steps, a readiness checkpoint, then timed full-length practice exams",
        "Spaced repetition of every question that you miss, and hands-on labs in the browser",
        "More than 1,300 A+ questions across the two cores. Free: a full-length 90-question exam and 12 interactive PBQs for each core",
      ],
      weaknesses: [
        WEB_APP_ONLY,
        "A newer question bank than the long-established products",
        "Pro covers one exam, and Core 1 and Core 2 are separate exams, so the second core is paid for separately",
      ],
    },
    {
      name: "Professor Messer A+ practice exams",
      price: "$30 for the digital edition of each core, with three practice exams of 90 questions in each",
      source: VENDOR_PAGES.messerAPlusCore1,
      checked: VENDOR_PRICES_CHECKED,
      bestFor: "Pairing with his free A+ video course",
      strengths: [
        "A natural companion if his free videos are already your main course",
        "Good questions with written walkthroughs",
      ],
      weaknesses: [MESSER_FORMAT],
    },
    {
      name: "Jason Dion A+ practice exams (Udemy)",
      price: "Often $15 to $25 for each core in Udemy's sales",
      bestFor: "Full-length exams at a low price",
      strengths: [
        "Full-length exams for each core with explanations at a low price",
        "Udemy's player handles timing and basic review",
      ],
      weaknesses: ["No study system around the exams, so you manage your own review"],
    },
    {
      name: "Boson ExSim-Max for A+",
      price: BOSON_PRICE,
      source: VENDOR_PAGES.bosonAPlus,
      checked: VENDOR_PRICES_CHECKED,
      bestFor: "A final practice exam in the last week",
      strengths: [
        "The most realistic full-length simulation in this guide, for each core",
        "Very detailed explanations",
      ],
      weaknesses: [NO_STUDY_SYSTEM, "Priced for each exam, so Core 1 and Core 2 are two purchases"],
      compareSlug: "certbench-vs-boson",
    },
    {
      name: "CompTIA CertMaster Practice for A+",
      price: "Typically more than $150 for each core",
      bestFor: "When your employer or school pays",
      strengths: [
        "The exam vendor's own content, aligned to the current exam objectives",
        "Integrates with CompTIA courseware and instructor programs",
      ],
      weaknesses: [
        "Typically the most expensive option in this guide if you are paying for it yourself, and the price is for each core",
        CERTMASTER_STYLE,
      ],
      compareSlug: "certbench-vs-certmaster",
    },
  ]),
  faqs: [
    {
      question: "What is the best A+ practice test?",
      answer: `${GUIDE_ANSWER_DISCLOSURE} CertBench recommends a combination and not a single product: a study path for each core, with Core 1 and Core 2 tracked separately, and one realistic simulator run for each core in the final week. CertBench is a product of the first kind. TotalTester is a traditional question bank that pairs with the Mike Meyers book and video course, and in CertBench's assessment Boson is the closest to the real exam. If you have no budget, a free video course and free practice questions will take you a long way with A+.`,
    },
    {
      question: "How many practice questions do I need to pass A+?",
      answer: `${GUIDE_ANSWER_DISCLOSURE} For each core, CertBench recommends that you practice every domain and review every question that you miss until you can answer it, with at least one full-length timed exam for stamina. Disciplined review of the questions that you miss matters far more than the number of questions. A+ includes performance-based questions, so practice those as well as multiple-choice questions.`,
    },
    {
      question: "Do I need separate practice for Core 1 and Core 2?",
      answer:
        "Yes. They are different exams with different content (Core 1 covers hardware, networking, mobile devices and cloud computing, and Core 2 covers operating systems, security and troubleshooting), and you book and pass them separately. Track your readiness for each core separately so that you know which one you are ready to take. Being ready for Core 1 tells you little about Core 2.",
    },
    {
      question: "Are free A+ practice tests good enough?",
      answer: `${GUIDE_ANSWER_DISCLOSURE} Free question banks, video courses and topic quizzes cover much of the A+ knowledge. CertBench's own free plan includes a full-length practice exam of 90 questions and 12 interactive PBQs for each core. What free options rarely include is continued feedback: spaced repetition of the questions that you missed, and further full-length exams. It is possible to pass with no budget at all. If you are able to spend anything, CertBench recommends spending it on those two things.`,
    },
  ],
  practiceTestPath: "a-plus-practice-test",
};

export const NETWORK_PLUS_ROUNDUP: RoundupData = {
  path: "best-network-plus-practice-tests",
  metaTitle: "Best CompTIA Network+ practice tests and exams in 2026",
  metaDescription:
    "CertBench publishes this guide to CompTIA Network+ (N10-009) practice tests in 2026 and is one of the products in it. The guide sets out the strengths, limitations and prices of Boson, CertBench, CertMaster and Jason Dion, and covers subnetting practice.",
  h1: "The best CompTIA Network+ practice tests and exams in 2026",
  intro: [
    GUIDE_DISCLOSURE,
    "The Network+ (N10-009) exam objectives include subnetting, ports and protocols, which call for quick calculation and recall. CertBench therefore recommends more than a question bank: a question bank together with targeted practice in the calculations that you will do under time pressure, and one realistic simulator before you book.",
    GUIDE_METHOD,
  ],
  // There is no Professor Messer entry here. On November 22, 2026 his N10-009
  // page listed no practice exams, and a guide must not describe a product
  // that could not be found.
  tools: alphabetical([
    {
      name: "CertBench",
      price: PRO_PRICE_SHORT,
      bestFor: "A study path with subnetting drills",
      isSelf: true,
      strengths: [
        "A study path written for N10-009: every topic in short steps, a readiness checkpoint, then timed full-length practice exams, with spaced repetition of every question that you miss",
        "Free subnetting and port-number drills for the timed calculations that Network+ depends on, and hands-on network topology labs",
        "More than 600 Network+ questions. Free: a full-length 90-question exam and 12 interactive PBQs",
      ],
      weaknesses: [WEB_APP_ONLY, "A newer question bank than the established products"],
    },
    {
      name: "Boson ExSim-Max for Network+",
      price: BOSON_PRICE,
      source: VENDOR_PAGES.bosonNetwork,
      checked: VENDOR_PRICES_CHECKED,
      bestFor: "A final practice exam in the last week",
      strengths: [
        "The most realistic full-length simulation in this guide",
        "Very detailed explanations, including for subnetting questions",
      ],
      weaknesses: [NO_STUDY_SYSTEM, "Priced for each exam, with an older interface"],
      compareSlug: "certbench-vs-boson",
    },
    {
      name: "Jason Dion Network+ practice exams (Udemy)",
      price: "Often $15 to $25 in Udemy's sales",
      bestFor: "Full-length exams at a low price",
      strengths: [
        "Full-length exams with explanations at a low price",
        "Udemy's player handles timing and basic review",
      ],
      weaknesses: ["No study system around the exams, and no dedicated subnetting practice"],
    },
    {
      name: "CompTIA CertMaster Practice for Network+",
      price: CERTMASTER_PRICE,
      bestFor: "When your employer or school pays",
      strengths: [
        "The exam vendor's own content, aligned to the N10-009 objectives",
        "Integrates with CompTIA courseware and instructor programs",
      ],
      weaknesses: [
        "Typically the most expensive option in this guide if you are paying for it yourself",
        CERTMASTER_STYLE,
      ],
      compareSlug: "certbench-vs-certmaster",
    },
    {
      name: "Subnetting.org and other free subnetting quizzes",
      price: "Free",
      bestFor: "Subnetting practice only",
      strengths: ["Unlimited free subnetting practice, which is useful for building speed"],
      weaknesses: [
        "Subnetting only, with no coverage of the rest of the exam",
        "No measure of readiness for the exam as a whole",
      ],
    },
  ]),
  faqs: [
    {
      question: "What is the best Network+ practice test?",
      answer: `${GUIDE_ANSWER_DISCLOSURE} CertBench recommends a combination: a study system with spaced repetition and dedicated subnetting drills, and one realistic simulator in the final week. CertBench is a product of the first kind, and in its assessment Boson is the most realistic simulator. Because Network+ tests subnetting and ports under time pressure, make sure that whatever you choose lets you practice those calculations until they are automatic.`,
    },
    {
      question: "How important is subnetting on the Network+ exam?",
      answer: `${GUIDE_ANSWER_DISCLOSURE} Subnetting, ports and protocols are part of the N10-009 exam objectives, and the calculations take time unless they have been practiced. CertBench recommends practicing them until they are automatic, with dedicated drills and not only mixed questions.`,
    },
    {
      question: "How many practice questions do I need for Network+?",
      answer: `${GUIDE_ANSWER_DISCLOSURE} Practice every N10-009 domain, review every question that you miss until you can answer it, and take at least two full-length timed exams for stamina. CertBench does not recommend a number of questions. Reviewing the questions that you missed and practicing subnetting matter more than the number of questions.`,
    },
    {
      question: "Are free Network+ practice tests good enough?",
      answer: `${GUIDE_ANSWER_DISCLOSURE} Free resources cover much of the knowledge, and free subnetting drills are valuable. CertBench's own free plan includes a full-length practice exam of 90 questions and 12 interactive PBQs for Network+. What free options rarely include is continued feedback: spaced repetition of the questions that you missed, and further full-length exams. It is possible to pass with no budget at all. If you are able to spend anything, CertBench recommends spending it on those two things.`,
    },
  ],
  practiceTestPath: "network-plus-practice-test",
};

export const ROUNDUPS: RoundupData[] = [
  ROUNDUP,
  A_PLUS_ROUNDUP,
  NETWORK_PLUS_ROUNDUP,
];
