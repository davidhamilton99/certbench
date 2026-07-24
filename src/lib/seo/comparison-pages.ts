import type { CertPageFaq } from "@/lib/seo/cert-pages";

/**
 * Content for the decision-intent pages: the "best practice tests" roundup
 * (acquisition — the query with real volume) and the vs-pages (conversion —
 * on-site evaluators, brand searches, "alternative to X" long-tail).
 *
 * House rules for this content:
 * - Honest to a fault. Every competitor gets its genuine strengths stated
 *   plainly; CertBench's rows concede what we don't have. These pages only
 *   earn links and trust if a Boson owner reads ours and nods.
 * - Prices are approximate and hedged ("about", "typically") so drift
 *   doesn't make us liars; no fabricated ratings, user counts, or quotes.
 */

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
}

export const VS_PAGES: VsPage[] = [
  {
    slug: "certbench-vs-boson",
    competitorName: "Boson ExSim",
    metaTitle: "CertBench vs Boson ExSim for Security+",
    metaDescription:
      "An honest comparison of CertBench and Boson ExSim-Max for CompTIA Security+: exam realism, explanations, adaptive study planning, spaced repetition, and price.",
    h1: "CertBench vs Boson ExSim, honestly",
    intro: [
      "Boson's ExSim-Max is the practice exam most often recommended on r/CompTIA, and that reputation is earned — if you want the closest thing to sitting the real Security+ exam a week before you sit it, Boson is excellent. We're not going to pretend otherwise.",
      "The comparison that actually matters is what each tool is for. Boson is a final-weeks exam simulator you run two or three times. CertBench is the daily system for the two months before that: an adaptive plan that decides what to study each day, spaced repetition on everything you miss, and a readiness score that tells you when you're prepared. Different jobs; here's the honest breakdown.",
    ],
    chooseThem: [
      "You want the most exam-realistic full-length simulation available and don't mind paying ~$99 per exam for it",
      "You're in your final two weeks and mainly need dress rehearsals, not a study system",
      "You prefer owning software outright over a subscription",
    ],
    chooseUs: [
      "You want a system that tells you what to study every day, not just how you did on a mock",
      "You want spaced repetition on your misses built in, instead of managing Anki separately",
      "You want to start free and pay only for the months you actually study (or use the free tier the whole way)",
    ],
    rows: [
      { feature: "Full-length exam realism", certbench: "Weighted, timed practice exams", competitor: "Best in class — the closest sim to the real thing" },
      { feature: "Explanations", certbench: "Every question, teaching why the wrong answers are wrong", competitor: "Excellent, famously detailed" },
      { feature: "Adaptive daily study plan", certbench: "Yes — rebuilt daily from your performance", competitor: "No" },
      { feature: "Spaced repetition", certbench: "Built in on every miss", competitor: "No" },
      { feature: "Readiness score", certbench: "Domain-weighted, confidence-penalised", competitor: "Per-exam score reports" },
      { feature: "Interactive PBQ practice", certbench: "Playable simulations in the browser", competitor: "Limited" },
      { feature: "Free tier", certbench: "Diagnostic, readiness score, 20 questions/day, drills", competitor: "Demo only" },
      { feature: "Price", certbench: "Free; Pro $19/mo or $39 per exam cycle", competitor: "About $99 per exam" },
    ],
    faqs: [
      {
        question: "Is Boson ExSim worth it for Security+?",
        answer:
          "If you want maximum exam-day realism and can afford it, yes — ExSim-Max has a deserved reputation for matching the real exam's difficulty and style, with excellent explanations. Many people pair a daily study system with one or two Boson runs in the final fortnight. The two approaches complement each other more than they compete.",
      },
      {
        question: "Can I use CertBench and Boson together?",
        answer:
          "That's arguably the strongest stack: CertBench for the daily adaptive plan, spaced repetition, and readiness tracking across your whole prep, then a Boson simulation in the last week or two as a dress rehearsal. If your CertBench readiness score and a Boson mock agree you're ready, you almost certainly are.",
      },
      {
        question: "Why is CertBench so much cheaper than Boson?",
        answer:
          "Different models. Boson sells per-exam licences (~$99 per certification exam). CertBench is free to study on every day (20 questions daily, diagnostic, readiness score, drills), with a Pro tier at $19/month or $39 for a three-month exam cycle for unlimited everything. Prices in USD, adjusted regionally, and Pro carries a pass guarantee.",
      },
    ],
  },
  {
    slug: "certbench-vs-certmaster",
    competitorName: "CompTIA CertMaster",
    metaTitle: "CertBench vs CompTIA CertMaster Practice",
    metaDescription:
      "An honest comparison of CertBench and CompTIA's official CertMaster Practice for Security+: content alignment, adaptive study, spaced repetition, readiness tracking, and price.",
    h1: "CertBench vs CertMaster, honestly",
    intro: [
      "CertMaster is CompTIA's own product, and that comes with real advantages: guaranteed objective alignment, integration with official courseware, and the credibility of the exam vendor itself. If your employer or school provides it, use it — it's solid.",
      "Paying out of pocket is a different calculation. CertMaster Practice typically runs well north of $150 per exam, and its study experience is closer to a question bank with progress tracking than an adaptive system. Here's where each one actually earns its price.",
    ],
    chooseThem: [
      "Your employer, school, or bootcamp already provides CertMaster — free official content is free official content",
      "You want the psychological safety of studying from the exam vendor itself",
      "You're buying a full CompTIA bundle (courseware + labs + practice) through an academic programme at a discount",
    ],
    chooseUs: [
      "You're paying out of your own pocket and the price difference matters",
      "You want an adaptive daily plan and spaced repetition, not just a question bank with a progress bar",
      "You want a readiness score that's deliberately conservative rather than a completion percentage",
    ],
    rows: [
      { feature: "Official CompTIA alignment", certbench: "Written independently to the exam objectives", competitor: "The exam vendor's own content" },
      { feature: "Adaptive daily study plan", certbench: "Yes — rebuilt daily from your performance", competitor: "Limited adaptivity within modules" },
      { feature: "Spaced repetition", certbench: "Built in on every miss", competitor: "No true SRS scheduling" },
      { feature: "Readiness score", certbench: "Domain-weighted, confidence-penalised", competitor: "Progress and topic mastery indicators" },
      { feature: "Interactive PBQ practice", certbench: "Playable simulations in the browser", competitor: "In CertMaster Labs (sold separately)" },
      { feature: "Free tier", certbench: "Diagnostic, readiness score, 20 questions/day, drills", competitor: "No" },
      { feature: "Price", certbench: "Free; Pro $19/mo or $39 per exam cycle", competitor: "Typically $150+ per exam" },
    ],
    faqs: [
      {
        question: "Is CertMaster Practice worth the price?",
        answer:
          "If someone else is paying — an employer, a school programme, a training grant — absolutely use it. If you're self-funding, most independent practice platforms deliver comparable or better study mechanics for a fraction of the price, and you can put the difference toward the exam voucher itself, which is the genuinely unavoidable cost.",
      },
      {
        question: "Are CertBench questions aligned to the same objectives as CertMaster?",
        answer:
          "Yes — every CertBench question is written against the current official exam objectives (SY0-701 for Security+) and tagged to a specific objective, with domain weighting that mirrors the real exam blueprint. The difference is authorship, not coverage: CompTIA writes CertMaster's items; ours are original, written independently, with full explanations.",
      },
      {
        question: "Does using unofficial practice material risk my certification?",
        answer:
          "No — what violates CompTIA policy is using braindumps: leaked copies of real exam questions. Original practice questions written to the public exam objectives are exactly how every legitimate third-party publisher (Boson, Sybex, Dion, CertBench) operates. CertBench contains no real exam content.",
      },
    ],
  },
  {
    slug: "certbench-vs-pocket-prep",
    competitorName: "Pocket Prep",
    metaTitle: "CertBench vs Pocket Prep for CompTIA",
    metaDescription:
      "An honest comparison of CertBench and Pocket Prep for CompTIA Security+, Network+, and A+: mobile experience, question depth, adaptive planning, spaced repetition, and price.",
    h1: "CertBench vs Pocket Prep, honestly",
    intro: [
      "Pocket Prep's apps are genuinely good at what they're for: studying in the gaps of your day. The mobile experience is polished, offline mode works, and ten questions in a waiting room is a real study pattern that deserves a tool built around it.",
      "The trade-off is depth. Quick-quiz apps are strongest at maintaining knowledge and weakest at building it systematically — there's no full-length weighted exam simulation, no adaptive plan deciding what you should do today, and no hands-on PBQ practice. Here's the honest split.",
    ],
    chooseThem: [
      "Your study time is genuinely mobile-first — commutes, breaks, queues — and you want a native app experience",
      "You want one subscription covering many certification bodies beyond CompTIA",
      "You mainly want maintenance-mode quizzing rather than a structured path to an exam date",
    ],
    chooseUs: [
      "You're working toward a specific exam date and want a system that plans each day and tells you when you're ready",
      "You want full-length weighted practice exams and playable PBQs, not only quick quizzes",
      "You want spaced repetition that schedules your misses automatically",
    ],
    rows: [
      { feature: "Mobile experience", certbench: "Responsive web app — works well, no native app yet", competitor: "Polished native apps with offline mode" },
      { feature: "Full-length weighted exams", certbench: "Yes, mirroring the real blueprint", competitor: "Quiz-builder format" },
      { feature: "Adaptive daily study plan", certbench: "Yes — rebuilt daily from your performance", competitor: "No" },
      { feature: "Spaced repetition", certbench: "Built in on every miss", competitor: "Missed-question review, not scheduled SRS" },
      { feature: "Interactive PBQ practice", certbench: "Playable simulations in the browser", competitor: "No" },
      { feature: "Readiness score", certbench: "Domain-weighted, confidence-penalised", competitor: "Average-score tracking" },
      { feature: "Free tier", certbench: "Diagnostic, readiness score, 20 questions/day, drills", competitor: "Limited free question sample" },
      { feature: "Price", certbench: "Free; Pro $19/mo or $39 per exam cycle", competitor: "Subscription, roughly comparable monthly" },
    ],
    faqs: [
      {
        question: "Does CertBench work on a phone?",
        answer:
          "Yes — the whole product is built mobile-first and most CertBench studying happens on phones. It runs in the browser rather than as a native app, which means no offline mode yet, but nothing to install and your progress follows you across devices automatically.",
      },
      {
        question: "Is quick-quiz studying enough to pass Security+?",
        answer:
          "For some people, eventually — but the pattern has known gaps: without full-length timed exams you don't build exam stamina, and without PBQ practice the hands-on questions at the start of the real exam can sink you. Quiz apps are excellent supplements and risky primaries.",
      },
      {
        question: "Can I switch from Pocket Prep to CertBench mid-study?",
        answer:
          "Yes, and the transition is fast: take the free 25-question diagnostic and CertBench rebuilds your picture from scratch — your readiness score and weak domains are measured directly rather than imported, so a switch costs one 20-minute session.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */

export interface RoundupTool {
  name: string;
  price: string;
  bestFor: string;
  strengths: string[];
  weaknesses: string[];
  /** Set for CertBench's own entry — renders the bias disclosure. */
  isSelf?: boolean;
  /** Optional internal comparison link. */
  compareSlug?: string;
}

export const ROUNDUP = {
  path: "best-security-plus-practice-tests",
  metaTitle: "Best Security+ Practice Tests in 2026",
  metaDescription:
    "An honest guide to the best CompTIA Security+ (SY0-701) practice tests in 2026 — Boson, CertMaster, Pocket Prep, Professor Messer, Dion, and CertBench — with real strengths, weaknesses, and prices.",
  h1: "The best Security+ practice tests in 2026",
  intro: [
    "First, the disclosure: CertBench is our product, and it's on this list. We've kept every entry honest anyway — including the ways the others beat us — because you'll figure out the truth within a week of choosing, and a guide that lies to you isn't worth ranking.",
    "Second, the actual answer: most people who pass Security+ comfortably use two things — a daily practice system for six to eight weeks, and one realistic full-length simulator in the final stretch. Every tool below is good at one of those jobs. None is best at both.",
  ],
  tools: [
    {
      name: "Boson ExSim-Max",
      price: "About $99 per exam",
      bestFor: "The final-weeks dress rehearsal",
      strengths: [
        "The most exam-realistic full-length simulation available — difficulty, style, and pacing",
        "Famously detailed explanations on every question",
        "The default recommendation on r/CompTIA for good reason",
      ],
      weaknesses: [
        "No study system: no plan, no spaced repetition, no adaptivity",
        "Priced per exam, and the interface shows its age",
      ],
      compareSlug: "certbench-vs-boson",
    },
    {
      name: "CertBench",
      price: "Free tier; Pro $19/mo or $39 per exam cycle",
      bestFor: "The daily adaptive study system",
      isSelf: true,
      strengths: [
        "Adaptive daily plan rebuilt from your actual performance, with spaced repetition on every miss",
        "A domain-weighted, deliberately conservative readiness score that tells you when to book",
        "Playable PBQ simulations in the browser, and a free tier deep enough to study on every day",
      ],
      weaknesses: [
        "Web app only — no native mobile app or offline mode yet",
        "Newer question bank than the incumbents, and CompTIA-only coverage",
      ],
    },
    {
      name: "CompTIA CertMaster Practice",
      price: "Typically $150+ per exam",
      bestFor: "When your employer or school pays",
      strengths: [
        "Official vendor content with guaranteed objective alignment",
        "Integrates with CompTIA courseware and instructor-led programmes",
      ],
      weaknesses: [
        "The most expensive option for self-funders by a wide margin",
        "Study mechanics are closer to a tracked question bank than an adaptive system",
      ],
      compareSlug: "certbench-vs-certmaster",
    },
    {
      name: "Professor Messer practice exams",
      price: "About $25–30 per set (PDF)",
      bestFor: "Pairing with his free video course",
      strengths: [
        "Excellent question quality with thorough written walkthroughs",
        "Natural companion if his free videos are already your primary course",
      ],
      weaknesses: [
        "Static PDFs — no tracking, timing, adaptivity, or review tooling",
      ],
    },
    {
      name: "Jason Dion practice exams (Udemy)",
      price: "Often $15–25 on Udemy sales",
      bestFor: "Cheap volume of full-length exams",
      strengths: [
        "Six full-length exams with explanations at an impulse-buy price",
        "Udemy's exam player handles timing and basic review",
      ],
      weaknesses: [
        "Community consensus says difficulty runs slightly off-real in places",
        "No system around the exams — you manage your own study loop",
      ],
    },
    {
      name: "ExamCompass",
      price: "Free",
      bestFor: "Zero-budget topic quizzes",
      strengths: [
        "Genuinely free browser quizzes organised by topic",
        "Fine as a light warm-up alongside a course",
      ],
      weaknesses: [
        "Thin explanations, no tracking, and difficulty well below the real exam",
      ],
    },
  ] satisfies RoundupTool[],
  faqs: [
    {
      question: "What's the best overall Security+ practice test?",
      answer:
        "For a single final-weeks simulation, Boson ExSim-Max — its realism is the industry benchmark. For the weeks of daily study before that, an adaptive system with spaced repetition (that's the job CertBench was built for) outperforms re-running static exams. The strongest budget stack most people land on: a free video course, a daily practice system, and one simulator run before booking.",
    },
    {
      question: "How many practice questions do I need before the real exam?",
      answer:
        "Volume matters less than coverage and correction: you want every SY0-701 domain exercised, every miss revisited until it sticks, and at least two full-length timed exams for stamina. Most people who pass comfortably see somewhere in the range of 500–1,000 distinct questions across their prep — but 300 questions with disciplined review of misses beats 1,500 answered once.",
    },
    {
      question: "Are free Security+ practice tests good enough?",
      answer:
        "Free resources can genuinely carry you a long way in 2026 — free question banks, video courses, and topic quizzes cover the knowledge. What free options rarely include is the feedback machinery: weighted readiness measurement, spaced repetition, and realistic full-length simulation. If your budget is literally zero, it's doable; if you can spend anything, spend it on those three things.",
    },
    {
      question: "Should I buy more than one practice test product?",
      answer:
        "Two is the sweet spot for most people: one daily system and one final-stretch simulator. Buying three or four question banks mostly buys you overlap — the marginal questions teach less than reviewing your existing misses properly would.",
    },
  ] satisfies CertPageFaq[],
};
