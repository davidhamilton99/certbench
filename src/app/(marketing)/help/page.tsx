import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Footer } from "@/components/marketing/Footer";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";

export const metadata = {
  title: "Help Centre — CertBench",
  description:
    "Everything you need to know about using CertBench to prepare for your CompTIA certification exam.",
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface FaqItem {
  q: string;
  a: string;
}

interface Section {
  id: string;
  title: string;
  description: string;
  items: FaqItem[];
}

const sections: Section[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description:
      "New here? Start with these — they cover everything from your first sign-up to your first study session.",
    items: [
      {
        q: "What is CertBench?",
        a: "CertBench is a free practice and study tool for CompTIA certification exams. It tracks your performance across every exam domain, builds a personalised study plan each day, and gives you a readiness score so you know when you\u2019re genuinely prepared to sit your exam. It currently covers Security+ SY0-701, Network+ N10-009, A+ Core 1 (220-1101), and A+ Core 2 (220-1102).",
      },
      {
        q: "Is CertBench free?",
        a: "Yes. The full question bank (2,000+ questions), diagnostic exam, practice exams, spaced repetition, readiness score, cheat sheets, PBQ practice, and daily study plans are all completely free. There is an optional Pro plan at $8/month that unlocks unlimited AI quiz generation from your own notes — but the core product costs nothing.",
      },
      {
        q: "Is this an exam dump?",
        a: "No. Every question in CertBench is independently written. None of our questions are sourced from actual certification exams. Each question includes a detailed explanation that teaches you why the correct answer is correct and why the most plausible wrong answer is wrong. We built CertBench to help you understand the material, not memorise leaked answers.",
      },
      {
        q: "What should I do first after signing up?",
        a: "Take the diagnostic exam. It\u2019s 25 questions, takes about 15\u201320 minutes, and there\u2019s no time limit. Your results determine your starting readiness score and unlock your personalised study plan. Everything else in CertBench builds on your diagnostic results, so it\u2019s the best place to start.",
      },
      {
        q: "Can I use CertBench as my only study resource?",
        a: "CertBench is a practice and reinforcement tool — it\u2019s designed to work alongside a video course (like Professor Messer or Jason Dion) or a textbook. It doesn\u2019t teach concepts from scratch, but it\u2019s excellent at testing your understanding, identifying your weak spots, and telling you when you\u2019re ready. Think of it as the practice side of your study stack.",
      },
    ],
  },
  {
    id: "readiness-score",
    title: "Readiness Score",
    description:
      "The number at the centre of your dashboard. Here\u2019s what it actually means.",
    items: [
      {
        q: "How is my readiness score calculated?",
        a: "Your readiness score is a weighted average of your performance across all exam domains. Each domain is weighted by how much it counts on the real exam (for example, Security Operations is 28% of the Security+ exam). Within each domain, a confidence factor scales your score based on how many questions you\u2019ve answered — so getting 5 out of 5 correct on only 5 questions won\u2019t give you a perfect domain score.",
      },
      {
        q: "What does \u201cPreliminary\u201d mean?",
        a: "Your score is marked as \u201cPreliminary\u201d (with a ~ symbol) when you haven\u2019t yet answered at least 15 questions in every domain. The confidence factor is penalising your score to avoid false confidence from a small sample. Keep practising and the Preliminary label will disappear as the system gathers enough data to give you a reliable score.",
      },
      {
        q: "What score means I\u2019m ready to take the exam?",
        a: "There\u2019s no universal threshold — it depends on the exam and your comfort level. As a general guide, consistently scoring 80+ with no domain below 70 suggests strong preparation. But always check the official CompTIA passing score for your exam and remember that the real exam includes performance-based questions that test hands-on skills beyond multiple choice.",
      },
      {
        q: "Why did my score go down after a practice exam?",
        a: "Your readiness score updates after every session to reflect your actual current performance. If a practice exam revealed weak areas or if you answered questions from domains you hadn\u2019t practised yet, the score adjusts accordingly. This is working as intended — it\u2019s better to discover gaps here than on exam day.",
      },
    ],
  },
  {
    id: "study-plan",
    title: "Study Plan & Daily Sessions",
    description:
      "How CertBench decides what you should study each day.",
    items: [
      {
        q: "How does the daily study plan work?",
        a: "Every time you open your dashboard, CertBench generates a fresh study plan using a five-tier priority system. First, it schedules spaced repetition reviews (questions you need to revisit). Then it targets your weakest domain with a focused drill. Next, it checks whether your exam date is approaching and adds urgency-based sessions. Then it schedules regular practice exams. Finally, it surfaces questions you haven\u2019t seen yet. The result is a plan that adapts every day based on how you\u2019re actually performing.",
      },
      {
        q: "Do I have to follow the study plan exactly?",
        a: "No. The study plan is a recommendation based on your performance data. You can skip sessions, do them in a different order, or start a practice exam or domain drill directly from the certification page whenever you want. The plan is there to guide you if you\u2019re not sure what to do next.",
      },
      {
        q: "What are the different session types?",
        a: "There are five types: (1) SRS Review \u2014 flashcard-style review of questions due for spaced repetition. (2) Domain Drill \u2014 10 focused questions from a single domain, targeting your weakest area. (3) Full Practice Exam \u2014 90 questions across all domains, weighted like the real exam. (4) Weak Points Review \u2014 10 questions targeting the specific questions you\u2019ve answered incorrectly. (5) New Content \u2014 questions you haven\u2019t seen yet.",
      },
    ],
  },
  {
    id: "diagnostic",
    title: "Diagnostic Exam",
    description:
      "Your baseline assessment. One shot, but it matters.",
    items: [
      {
        q: "Can I retake the diagnostic exam?",
        a: "No. The diagnostic is a one-time baseline assessment. It\u2019s designed to measure where you\u2019re starting from without any prior exposure to the questions. This gives the study plan engine an honest starting point. After the diagnostic, all subsequent practice exams and reviews will update your readiness score \u2014 so your score will keep evolving as you study.",
      },
      {
        q: "Should I study before taking the diagnostic?",
        a: "That\u2019s up to you, but it\u2019s designed to be taken as-is. The point is to see where you genuinely stand right now. If you study first, the diagnostic won\u2019t reflect your actual gaps accurately, which means your initial study plan might not target the right areas. Treat it like an honest self-assessment.",
      },
      {
        q: "How many questions are on the diagnostic?",
        a: "25 questions, distributed proportionally across all exam domains based on how much each domain counts on the real exam. There is no time limit.",
      },
    ],
  },
  {
    id: "spaced-repetition",
    title: "Spaced Repetition",
    description:
      "The science behind why missed questions keep coming back.",
    items: [
      {
        q: "What is spaced repetition and how does CertBench use it?",
        a: "Spaced repetition is a learning technique where you review material at increasing intervals. CertBench uses a modified version of the SM-2 algorithm: when you answer a question correctly, it\u2019s scheduled for review further in the future. When you answer incorrectly, it comes back sooner. Over time, questions you\u2019ve mastered fade into the background while difficult questions stay in active rotation.",
      },
      {
        q: "How often should I do SRS reviews?",
        a: "Ideally, every day or at least every time you study. The whole point of spaced repetition is timing \u2014 reviewing a question on the day it\u2019s due is more effective than reviewing it a week late. Your dashboard will show SRS reviews as the first priority in your study plan whenever cards are due.",
      },
      {
        q: "What happens if I skip SRS reviews for a few days?",
        a: "They accumulate. When you come back, you\u2019ll have more cards due. CertBench caps SRS sessions at 20 cards to keep them manageable, and it prioritises the most overdue cards first. Missing a few days isn\u2019t the end of the world \u2014 just get back to it.",
      },
    ],
  },
  {
    id: "practice-exams",
    title: "Practice Exams & Drills",
    description:
      "Full exams, domain drills, and weak point sessions.",
    items: [
      {
        q: "How are practice exam questions selected?",
        a: "CertBench uses a three-bucket priority system. First, it selects questions you\u2019ve never seen. Then questions you\u2019ve seen but answered incorrectly (sorted by worst error rate). Finally, questions you\u2019ve seen and answered correctly (sorted by stalest first). Questions are distributed proportionally across domains based on the real exam blueprint.",
      },
      {
        q: "Can I flag questions during a practice exam?",
        a: "Yes. There\u2019s a flag button on each question during practice exams (not available during the diagnostic). Flagged questions are highlighted so you can review them after the exam alongside your incorrect answers.",
      },
      {
        q: "Will I ever see the same question twice?",
        a: "Yes, intentionally. Spaced repetition means questions you\u2019ve answered incorrectly will come back in future sessions. Questions you\u2019ve mastered will eventually cycle back too, but at longer intervals. This repetition is part of the learning process.",
      },
    ],
  },
  {
    id: "ai-study-materials",
    title: "AI Study Materials",
    description:
      "Generate practice questions from your own notes.",
    items: [
      {
        q: "How does AI question generation work?",
        a: "Paste your notes, textbook excerpts, or upload a file (PDF, DOCX, TXT, or even an image). CertBench uses AI to generate practice questions from your content. You choose how many questions (10, 25, or 50), the question types (multiple choice, true/false, multi-select, ordering, matching), and the difficulty level. The AI also runs a quality check on the generated questions before saving them.",
      },
      {
        q: "What are the limits on AI generation?",
        a: "Free accounts get 3 AI quiz generations per month. Pro accounts ($8/month) get unlimited generations. Each generation can produce up to 50 questions. The input content limit is 200,000 characters.",
      },
      {
        q: "Can I share my AI-generated study sets?",
        a: "Yes. When creating or editing a study set, you can make it public. Public sets appear in the Community section where other users can discover and bookmark them.",
      },
    ],
  },
  {
    id: "pbq",
    title: "Performance-Based Questions",
    description:
      "Hands-on practice beyond multiple choice.",
    items: [
      {
        q: "What are PBQs?",
        a: "Performance-Based Questions (PBQs) are hands-on simulation questions that appear on real CompTIA exams. They test practical skills rather than just knowledge. CertBench includes four PBQ types: ordering (arrange items in the correct sequence), matching (pair terms with definitions), categorisation (sort items into categories), and full simulations with multi-step scenarios.",
      },
      {
        q: "How are PBQ simulations scored?",
        a: "PBQs use partial credit scoring. If a simulation has 10 fields and you get 8 correct, you score 80%. This matches how CompTIA scores PBQs on the real exam. Each field in a simulation is independently scored, so getting one wrong doesn\u2019t cost you the entire question.",
      },
    ],
  },
  {
    id: "account",
    title: "Account & Billing",
    description:
      "Managing your account, certifications, and subscription.",
    items: [
      {
        q: "Can I study for multiple certifications?",
        a: "Yes. You can enroll in as many certifications as you want. Each certification has its own readiness score, study plan, and progress tracking. Use the sidebar to switch between certifications, or add a new one from the \u201cAdd certification\u201d link.",
      },
      {
        q: "How do I change my exam date?",
        a: "Go to your Profile page and update the target exam date for each certification. The study plan engine uses this date to adjust urgency \u2014 when your exam is within 7 days, it prioritises full practice exams. When it\u2019s within 30 days, it adds extra targeted drills.",
      },
      {
        q: "Can I delete my account?",
        a: "Yes. Go to Profile and scroll to the bottom. There\u2019s a \u201cDelete account\u201d option in the danger zone. You\u2019ll need to type \u201cdelete my account\u201d to confirm. This permanently deletes your account, all study data, and all progress. It cannot be undone.",
      },
      {
        q: "How do I cancel my Pro subscription?",
        a: "Go to Profile and click the subscription management link. This takes you to the Stripe customer portal where you can cancel, update your payment method, or view your billing history. When you cancel, you keep Pro access until the end of your current billing period.",
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
      <h2 className="text-[22px] font-bold text-text-primary tracking-tight">
        {section.title}
      </h2>
      <p className="text-[15px] text-text-secondary mt-1 mb-6">
        {section.description}
      </p>
      <div className="flex flex-col gap-5">
        {section.items.map((item, i) => (
          <div
            key={i}
            className="border border-border rounded-lg bg-bg-surface p-5"
          >
            <h3 className="text-[15px] font-semibold text-text-primary">
              {item.q}
            </h3>
            <p className="text-[14px] text-text-secondary mt-2 leading-relaxed">
              {item.a}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-bg-page overflow-x-hidden">
      <MarketingHeader />

      <main className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        {/* Hero */}
        <div className="text-center mb-6">
          <h1 className="text-[28px] sm:text-[36px] md:text-[40px] font-bold text-text-primary tracking-tight">
            Help Centre
          </h1>
          <p className="text-[17px] text-text-secondary mt-3 max-w-xl mx-auto">
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
        <nav className="border border-border rounded-lg bg-bg-surface p-5 mb-12">
          <p className="text-[12px] font-medium text-text-muted uppercase tracking-wider mb-3">
            Jump to
          </p>
          <div className="flex flex-wrap gap-2">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="px-3 py-1.5 text-[13px] text-text-secondary bg-bg-page border border-border rounded-md hover:text-primary hover:border-primary transition-colors duration-150"
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
        <div className="mt-16 border border-border rounded-lg bg-bg-surface p-8 text-center">
          <h2 className="text-[20px] font-bold text-text-primary">
            Still have questions?
          </h2>
          <p className="text-[15px] text-text-secondary mt-2">
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
