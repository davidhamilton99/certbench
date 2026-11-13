import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/marketing/Footer";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { PASS_GUARANTEE_TERMS } from "@/lib/pricing/guarantee";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Help Centre",
  description:
    "Everything you need to know about using CertBench to prepare for your CompTIA certification exam.",
  path: "/help",
});

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface FaqItem {
  q: string;
  a: string;
  /** Where to go next, when the answer is a place on the site. */
  link?: { href: string; label: string };
}

interface Section {
  id: string;
  title: string;
  description: string;
  items: FaqItem[];
}

// Every answer describes the guided path as it is (src/core/path,
// src/components/path). A guard test keeps the old workspace's claims off
// this page: src/lib/seo/__tests__/public-copy.test.ts.
const sections: Section[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description:
      "New here? These cover what CertBench is, what’s free, and where to begin.",
    items: [
      {
        q: "What is CertBench?",
        a: "CertBench is CompTIA exam prep laid out as a guided path. Pick your exam and each objective becomes a short stop: quick questions first, then questions in the real exam’s wording. A readiness checkpoint shows where you stand, and a timed exam rehearsal finishes the path. It covers Security+ SY0-701, Network+ N10-009, and A+ Core 1 and Core 2. Our A+ questions are written to 220-1201 and 220-1202, the current A+ exams.",
      },
      {
        q: "Is CertBench free?",
        a: `The start of it is. With no account you can play each exam’s warm-up, take the 3-minute readiness check, try the practice-test pages and PBQ examples, use the subnet calculator, and play a first round of the port, subnetting, and acronym drills. A free account saves your progress, opens your path through the readiness checkpoint, and keeps the drills going with no limit. Pro opens the rest of your path, every objective to exam day, with domain practice, every hands-on PBQ lab, timed exam rehearsals, and spaced review of your misses, plus AI study sets from your notes. ${PASS_GUARANTEE_TERMS}`,
        link: { href: "/pricing", label: "See plans and prices" },
      },
      {
        q: "Where do I start?",
        a: "Pick your exam. Its first stop is a warm-up that needs no account. Save your map with a free account to keep going: your first few objectives, then the readiness checkpoint, about twenty minutes in, which shows where you stand in each domain.",
        link: { href: "/start", label: "Pick your exam" },
      },
      {
        q: "Is this an exam dump?",
        a: "No. Every question in CertBench is independently written, and none comes from a real certification exam. Exam-style questions come with a full explanation of why the right answer is right. We built CertBench to help you understand the material, not memorise leaked answers.",
      },
      {
        q: "Can I use CertBench as my only study resource?",
        a: "CertBench teaches through questions: most stops work through one objective, every answer shows you the one thing to remember, and exam-style questions explain their reasoning in full. There are no video lessons or textbook chapters, so it works best alongside a video course (like Professor Messer or Jason Dion) or a book. Use CertBench to practise, find your weak spots, and see when you’re ready.",
      },
    ],
  },
  {
    id: "path",
    title: "Your Path",
    description: "How the stops are laid out, and what comes after them.",
    items: [
      {
        q: "How does the path work?",
        a: "Your path goes through the exam’s objectives in order, domain by domain. Most stops cover one objective: quick questions first, then one in the real exam’s wording. When a domain ends, a practice stop asks 10 exam-style questions from it, and with Pro a hands-on lab closes it. The readiness checkpoint comes after your first four objectives, and a timed exam rehearsal ends the path. Your map shows each objective as covered, a miss that comes back later, or not started.",
      },
      {
        q: "Do I have to go in order?",
        a: "Yes. There’s always one next stop, so you never have to decide what to study. With Pro, “Practice any time” on your map also lets you start an exam rehearsal, open any lab in your exam’s lab library, or review your misses whenever you like.",
      },
      {
        q: "Why does the path ask about my exam date?",
        a: "Early on, your path asks when your exam is (or roughly when you’re aiming for) and how much time you can give it on most days. At the readiness checkpoint it uses your answers to show when you’ll finish the path at that pace, and how that fits with your exam date.",
      },
      {
        q: "What happens after the last stop?",
        a: "Your path keeps going with “Keep practicing” rounds: your misses first, then questions from your weakest domains. You can also sit another exam rehearsal whenever you like.",
      },
    ],
  },
  {
    id: "readiness-score",
    title: "Readiness Score",
    description:
      "Where the number on your readiness dial comes from, and what it means.",
    items: [
      {
        q: "What is the readiness checkpoint?",
        a: "Twelve exam-style questions across every domain of your exam, after your first four objectives. It’s free with an account. You get a score weighted the way the real exam weights its domains, how each domain went, the domain with the most to gain, and when you’ll finish the path at your pace.",
      },
      {
        q: "How is my readiness score worked out?",
        a: "From exam-style questions only, weighted the way the real exam weights its domains. The checkpoint gives your first reading. With Pro, each timed exam rehearsal is scored the same way, on the same dial, so you can watch it move. Your map shows your latest reading, from the checkpoint or your last rehearsal.",
      },
      {
        q: "What score means I’m ready to book my exam?",
        a: "CertBench calls 75% exam-ready. Treat it as a guide, not a promise: check CompTIA’s passing score for your exam, and remember the real exam includes performance-based questions, so practise the hands-on labs too.",
      },
      {
        q: "Why did my score go down?",
        a: "Your score is your latest reading, not an average. A full rehearsal asks 90 questions across every domain, against the checkpoint’s 12, so it can read lower, and unanswered questions count as wrong, as on the exam. Each rehearsal result shows the change since your last reading and lets you go through every answer, so you know what to work on. Better to find a gap here than on exam day.",
      },
      {
        q: "How is the free readiness check different?",
        a: "The readiness check is a quick public estimate: 10 exam-weighted questions in about three minutes, with no account. The checkpoint is part of your path. It’s saved with your progress, and it’s the first reading on your readiness dial.",
      },
    ],
  },
  {
    id: "spaced-repetition",
    title: "Spaced Review",
    description: "Why the questions you miss keep coming back.",
    items: [
      {
        q: "What happens to questions I get wrong?",
        a: "They come back. Most stops start with up to two of your earlier misses, and your map marks an objective with a miss until you get it right. With Pro, “Your misses” under “Practice any time” goes over them ten at a time. A miss you then get right comes back once more three days later, and leaves review after two right answers, days apart. That spacing is what makes it stick.",
      },
      {
        q: "Will I see the same question twice?",
        a: "Yes, on purpose: misses come back until they stick. Otherwise, new stops and rehearsals pick questions you haven’t seen first, and after the last stop, “Keep practicing” rounds bring back your misses, then questions from your weakest domains.",
      },
    ],
  },
  {
    id: "labs-and-rehearsals",
    title: "Labs & Exam Rehearsals",
    description: "Hands-on PBQs, and the whole exam against the clock.",
    items: [
      {
        q: "What are PBQs, and how do the labs work?",
        a: "Performance-based questions (PBQs) are the hands-on tasks on real CompTIA exams. CertBench’s labs are played in your browser: simulations, network topologies, and threat hunts, plus ordering, matching, and sorting tasks. On your path a lab closes every domain, and Pro opens your exam’s whole lab library. The PBQ example pages let you try some free.",
      },
      {
        q: "How are labs scored?",
        a: "With partial credit. Each field, step, or match you get right counts toward your score, so one slip doesn’t cost you the whole lab.",
      },
      {
        q: "What is the exam rehearsal?",
        a: "The whole exam in one sitting: 90 questions in 90 minutes, CompTIA’s limit for Security+, Network+, and A+, or a half rehearsal of 45 in 45. Questions are spread the way the exam weights its domains, ones you haven’t seen first, and there are no answers until you finish. Unanswered questions count as wrong, as on the exam. It’s the last stop on your path, and with Pro you can start one any time.",
      },
      {
        q: "Can I flag questions?",
        a: "Yes, in an exam rehearsal. Flag anything to come back to and jump to any question from the grid, as on the real exam. If you leave mid-way, the clock pauses until you’re back.",
      },
    ],
  },
  {
    id: "ai-study-materials",
    title: "AI Study Sets",
    description: "Practice questions written from your own notes, with Pro.",
    items: [
      {
        q: "How does AI question generation work?",
        a: "Paste your notes or upload a file (PDF, Word, plain text, or a photo of a page) and choose how many questions you want, up to 50. CertBench writes them from your material: a mix of multiple choice, true/false, multi-select, ordering, and matching. A second pass reviews each question for quality before you save the set. Pro members find it under “Study sets”, in the study tools linked under their map.",
      },
      {
        q: "What are the limits on AI generation?",
        a: "It comes with Pro, with no cap on how many sets you make. Each run writes up to 50 questions, from the first 100,000 characters of your material.",
      },
      {
        q: "Can I share my study sets?",
        a: "Yes. Make a set public and other Pro members can find and bookmark it in Community, and its share link opens for anyone, no account needed.",
      },
    ],
  },
  {
    id: "account",
    title: "Account & Billing",
    description:
      "Plans, studying for more than one exam, cancelling, and deleting your account.",
    items: [
      {
        q: "What does Pro cost, and what does it include?",
        a: `Pro is $19/month, $39 every 3 months, or $99/year, in USD and adjusted for your region. It covers one exam: the rest of its path, every objective to exam day, with domain practice, every hands-on PBQ lab, timed exam rehearsals, spaced review of your misses, and a readiness score, plus unlimited AI study sets from your notes. ${PASS_GUARANTEE_TERMS} The full terms are in our Terms of Service. Cancel any time.`,
      },
      {
        q: "Can I study for more than one exam?",
        a: "Yes. Each exam has its own path, map, and readiness score; switch with “Studying for a different exam?” under your map. Pro covers one exam. To add another, open its path: after that exam’s readiness checkpoint you’re offered it for a one-time payment ($39, adjusted for your region), and it stays unlocked while you’re on Pro.",
      },
      {
        q: "How do I cancel Pro?",
        a: "From the billing portal. Signed in, go to certbench.dev/upgrade and choose “Manage billing”: it opens Stripe’s customer portal, where you can cancel. You keep Pro until the end of the period you’ve paid for.",
        link: { href: "/upgrade", label: "Go to billing" },
      },
      {
        q: "Can I delete my account?",
        a: "Yes. Pro members can do it themselves: signed in, go to certbench.dev/profile and type DELETE in the danger zone. That permanently deletes your account, progress, and history, and can’t be undone. On any account, free or Pro, you can also ask us to delete it at privacy@certbench.dev, as our Privacy Policy describes.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

function SectionBlock({ section }: { section: Section }) {
  return (
    <div id={section.id} className="scroll-mt-24">
      <h2 className="text-[22px] font-bold text-foreground tracking-tight">
        {section.title}
      </h2>
      <p className="text-[15px] text-muted-foreground mt-1 mb-6">
        {section.description}
      </p>
      <div className="flex flex-col gap-5">
        {section.items.map((item, i) => (
          <div
            key={i}
            className="border border-border rounded-lg bg-card p-5"
          >
            <h3 className="text-[15px] font-semibold text-foreground">
              {item.q}
            </h3>
            <p className="text-[14px] text-muted-foreground mt-2 leading-relaxed">
              {item.a}
            </p>
            {item.link && (
              <Link
                href={item.link.href}
                className="mt-3 inline-block text-[14px] font-medium text-primary hover:underline"
              >
                {item.link.label} &rarr;
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="min-h-screen overflow-x-hidden aurora-bg text-foreground">
      <MarketingHeader />

      <main className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        {/* Hero */}
        <div className="text-center mb-6">
          <h1 className="text-[28px] sm:text-[36px] md:text-[40px] font-bold text-foreground tracking-tight">
            Help Centre
          </h1>
          <p className="text-[17px] text-muted-foreground mt-3 max-w-xl mx-auto">
            Everything you need to know about using CertBench. If you
            can&apos;t find your answer here, reach out — we respond to
            every message.
          </p>
          <div className="mt-4">
            <Link
              href="/contact"
              className="text-[15px] text-primary hover:underline font-medium"
            >
              Contact support &rarr;
            </Link>
          </div>
        </div>

        {/* Jump nav */}
        <nav className="border border-border rounded-lg bg-card p-5 mb-12">
          <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Jump to
          </p>
          <div className="flex flex-wrap gap-2">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="px-3 py-1.5 text-[13px] text-muted-foreground bg-background border border-border rounded-md hover:text-primary hover:border-primary transition-colors duration-150"
              >
                {s.title}
              </a>
            ))}
          </div>
        </nav>

        {/* Sections */}
        <div className="flex flex-col gap-14">
          {sections.map((section) => (
            <SectionBlock key={section.id} section={section} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 border border-border rounded-lg bg-card p-8 text-center">
          <h2 className="text-[20px] font-bold text-foreground">
            Still have questions?
          </h2>
          <p className="text-[15px] text-muted-foreground mt-2">
            I read and reply to every message. If something is broken,
            confusing, or missing — I want to know.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link href="/contact">
              <Button size="lg">Get in Touch</Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
