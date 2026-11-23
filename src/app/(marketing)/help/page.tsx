import Link from "next/link";
import { LanderPage } from "@/components/marketing/lander/Lander";
import { ArticleBody, ArticleHero, ArticleSection } from "@/components/marketing/lander/Article";
import { COLUMN } from "@/components/marketing/lander/layout";
import { FREE_LAB_COUNT, LABS_WITHOUT_ACCOUNT } from "@/core/path/free-labs";
import { CHECKPOINT_SIZE, MAX_RESURFACED, PRACTICE_SIZE } from "@/core/path/plan";
import { REVIEW_AGAIN_DAYS } from "@/core/path/progress";
import { REHEARSAL_FORMATS } from "@/core/path/rehearsal";
import { PASS_GUARANTEE_HREF, PASS_GUARANTEE_TERMS } from "@/lib/pricing/guarantee";
import { PRO_PRICES, PRO_PRICE_TERMS, PRO_SCOPE_TERMS } from "@/lib/pricing/terms";
import { READINESS_TARGET } from "@/lib/readiness/band";
import { EXAMS_WITH_FREE_LABS } from "@/lib/seo/cert-pages";
import { pageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";

export const metadata = pageMetadata({
  title: "Help center",
  description:
    "Answers to common questions about CertBench: how the study path works, how the readiness score is calculated, how labs and practice exams work, and how to manage your account.",
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

const FULL = REHEARSAL_FORMATS.full;
const HALF = REHEARSAL_FORMATS.half;

/** A count as a sentence writes it: in words below ten, in figures from ten. */
function count(n: number): string {
  return ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"][n] ?? String(n);
}

// Every answer describes the study path as it is (src/core/path,
// src/components/path), in the words its screens use, and every figure comes
// from the constant the product itself uses. The price and what one plan
// covers are worded once, in src/lib/pricing/terms.ts. A guard test keeps the
// old workspace's claims off this page: src/lib/seo/__tests__/public-copy.test.ts.
const sections: Section[] = [
  {
    id: "getting-started",
    title: "Getting started",
    description: "What CertBench is, what is free, and where to begin.",
    items: [
      {
        q: "What is CertBench?",
        a: "CertBench is a study program for CompTIA exams, set out as a study path. You choose your exam, and each objective becomes a short step. A step begins with short questions and then moves to questions in the wording of the real exam. A readiness checkpoint shows where you stand, and a timed practice exam completes the study path. CertBench covers Security+ (SY0-701 and SY0-801), Network+ (N10-009), and A+ Core 1 and Core 2. The A+ questions are written to 220-1201 and 220-1202, the current A+ exams.",
      },
      {
        q: "Is CertBench free?",
        a: `The first part is free. Without an account you can try the introductory questions for each exam, take the three-minute readiness check, take a full-length practice exam (${FULL.questions} questions in ${FULL.minutes} minutes, or a half-length exam of ${HALF.questions} questions), try the first ${count(LABS_WITHOUT_ACCOUNT)} hands-on labs, use the subnet calculator, and try a first round of the port, subnetting and acronym drills. A free account shows your practice exam score, opens ${count(FREE_LAB_COUNT - LABS_WITHOUT_ACCOUNT)} more hands-on labs so that ${FREE_LAB_COUNT} are free for each of ${EXAMS_WITH_FREE_LABS}, saves your progress, opens your study path up to the readiness checkpoint, and removes the limit on the drills. Pro opens the rest of your study path, covering every objective, with domain practice, every hands-on lab, new timed practice exams that begin with questions you have not seen, and spaced review of the questions that you missed. ${PASS_GUARANTEE_TERMS}`,
        link: { href: "/pricing", label: "View plans and prices" },
      },
      {
        q: "Where do I start?",
        a: "Choose your exam. The first step is a set of introductory questions, and it needs no account. To continue, save your progress with a free account. You then study your first objective and take the readiness checkpoint, which shows where you stand in each domain.",
        link: { href: "/start", label: "Choose your exam" },
      },
      {
        q: "Does CertBench use real exam questions?",
        a: "No. Every question in CertBench is written independently, and none comes from a real certification exam. Exam-style questions have a full explanation of why the correct answer is correct. CertBench is designed to help you understand the material, and not to memorize leaked answers.",
        link: { href: "/about", label: "Read how CertBench is made" },
      },
      {
        q: "Can I use CertBench as my only study resource?",
        a: "CertBench teaches through questions. Most steps work through one objective, every answer shows you the main point to remember, and exam-style questions explain their reasoning in full. CertBench has no video lessons or textbook chapters, so it works best alongside a video course (such as Professor Messer or Jason Dion) or a textbook. Use CertBench to practice, to find the areas where you are weak, and to see when you are ready.",
      },
    ],
  },
  {
    id: "path",
    title: "The study path",
    description: "How the steps are arranged, and what follows them.",
    items: [
      {
        q: "How does the study path work?",
        a: `The study path goes through the exam objectives in order, one domain at a time. Most steps cover one objective, beginning with short questions and ending with one in the wording of the real exam. At the end of each domain, a practice step asks ${PRACTICE_SIZE} exam-style questions from that domain, and with Pro a hands-on lab completes it. The readiness checkpoint follows your first objective, and a timed practice exam is the last step. The course outline on your study path shows the status of each objective, such as “Complete” or “To review”.`,
      },
      {
        q: "Do I have to follow the steps in order?",
        a: "Yes. There is always one next step, so you do not have to decide what to study. With Pro, the section named “Practice at any time” on your study path also lets you start a practice exam, open any lab in the lab library for your exam, or review the questions that you missed.",
      },
      {
        q: "Why does the study path ask for my exam date?",
        a: "Near the beginning, the study path asks when your exam is, or when you expect to take it, and how much time you can study on most days. At the readiness checkpoint it uses your answers to show when you will finish the study path at that pace, and how that date compares with your exam date.",
      },
      {
        q: "What happens after the last step?",
        a: "The study path continues with rounds of further practice. These begin with the questions that you missed and then draw on your weakest domains. You can also take another practice exam at any time.",
      },
    ],
  },
  {
    id: "readiness-score",
    title: "The readiness score",
    description: "How your readiness score is calculated, and what it means.",
    items: [
      {
        q: "What is the readiness checkpoint?",
        a: `The readiness checkpoint is a set of ${CHECKPOINT_SIZE} exam-style questions that covers every domain of your exam. It follows your first objective and is free with an account. It gives you a score that is weighted in the same way as the real exam, a result for each domain, the domain in which you can gain the most, and the date by which you will finish the study path at your pace.`,
      },
      {
        q: "How is my readiness score calculated?",
        a: "The score is calculated from exam-style questions only, weighted in the same way as the domains of the real exam. The checkpoint gives your first result. With Pro, each timed practice exam is scored in the same way and against the same readiness target, so you can follow your progress. Your study path shows your latest result, which comes from the checkpoint or from your last practice exam.",
      },
      {
        q: "What score means that I am ready to book my exam?",
        a: `CertBench sets its readiness target at ${READINESS_TARGET}%. The target is a guide and not a guarantee. Check CompTIA’s passing score for your exam, and bear in mind that the real exam includes performance-based questions, so you should practice the hands-on labs as well.`,
      },
      {
        q: "Why did my score go down?",
        a: `Your score is your latest result and not an average. A full practice exam asks ${FULL.questions} questions across every domain, compared with the ${CHECKPOINT_SIZE} questions of the checkpoint, so its result can be lower. Unanswered questions count as incorrect, as they do in the exam. Each practice exam result shows the change since your previous result and lets you review every answer, so that you know what to study.`,
      },
      {
        q: "How is the free readiness check different?",
        a: "The readiness check is a short public estimate. It has 10 exam-weighted questions, takes about three minutes and needs no account. The checkpoint is part of your study path. It is saved with your progress, and it gives your first result against the readiness target.",
      },
    ],
  },
  {
    id: "spaced-repetition",
    title: "Spaced review",
    description: "Why the questions that you miss are repeated.",
    items: [
      {
        q: "What happens to questions that I answer incorrectly?",
        a: `They are repeated. Most steps begin with up to ${count(MAX_RESURFACED)} questions that you missed earlier, and the course outline marks an objective as “To review” until you answer its question correctly. With Pro, “Questions to review” under “Practice at any time” repeats them ${PRACTICE_SIZE} at a time. A question that you then answer correctly is asked once more ${count(REVIEW_AGAIN_DAYS)} days later, and it leaves review after two correct answers on different days. This spacing helps you to remember the answer.`,
      },
      {
        q: "Will I see the same question twice?",
        a: "Yes, by design. Questions that you miss are repeated until you answer them correctly. Otherwise, new steps and practice exams choose questions that you have not seen first. After the last step, rounds of further practice repeat the questions that you missed and then draw on your weakest domains.",
      },
    ],
  },
  {
    id: "labs-and-rehearsals",
    title: "Labs and practice exams",
    description: "The hands-on labs, and the full-length timed practice exam.",
    items: [
      {
        q: "What are PBQs, and how do the labs work?",
        a: `Performance-based questions (PBQs) are the hands-on tasks in real CompTIA exams. CertBench’s hands-on labs run in your browser. They include simulations, network topologies and threat hunts, and also ordering, matching and sorting tasks. On your study path a lab completes every domain, and Pro opens the whole lab library for your exam. ${EXAMS_WITH_FREE_LABS} each have a PBQ page with ${FREE_LAB_COUNT} labs that are free: ${count(LABS_WITHOUT_ACCOUNT)} with no account, and the rest with a free account.`,
      },
      {
        q: "How are labs scored?",
        a: "Labs are scored with partial credit. Each field, step or match that you complete correctly counts toward your score, so a single mistake does not cost you the whole lab.",
      },
      {
        q: "What is the practice exam?",
        a: `The practice exam is the whole exam in one sitting. It has ${FULL.questions} questions and a time limit of ${FULL.minutes} minutes, which is CompTIA’s limit for Security+, Network+ and A+, or you can take a half-length exam of ${HALF.questions} questions in ${HALF.minutes} minutes. The questions are distributed in the same proportions as the exam domains, beginning with questions that you have not seen, and no answers are shown until you finish. Unanswered questions count as incorrect, as they do in the exam. The practice exam is the last step of your study path, and with Pro you can start a new one at any time. The practice-test page for each exam also has a free full-length practice exam, which is the same for everyone, and a free account shows its score.`,
      },
      {
        q: "Can I flag questions?",
        a: "Yes, in a practice exam. You can flag any question to return to it, and you can move to any question from the question grid, as in the real exam. If you leave during the exam, the clock pauses until you return.",
      },
    ],
  },
  {
    id: "account",
    title: "Account and billing",
    description: "Plans, studying for more than one exam, canceling, and deleting your account.",
    items: [
      {
        q: "What does Pro cost, and what does it include?",
        a: `${PRO_PRICE_TERMS} ${PRO_SCOPE_TERMS} Pro includes the rest of the study path for your exam, covering every objective, with domain practice, every hands-on lab, timed practice exams that are scored against the readiness target, and spaced review of the questions that you missed. ${PASS_GUARANTEE_TERMS} The full terms of the guarantee are in the terms of service. You can cancel at any time.`,
        link: { href: PASS_GUARANTEE_HREF, label: "Read the guarantee terms" },
      },
      {
        q: "Can I study for more than one exam?",
        a: `Yes. Each exam has its own study path, course outline and readiness score. To change exam, use the link “choose another exam” at the foot of your study path. ${PRO_SCOPE_TERMS} To add another exam, open its study path. After the readiness checkpoint for that exam, you are offered it for a single payment of ${PRO_PRICES.quarterly}, which is adjusted by region, and it remains open for as long as you have Pro.`,
      },
      {
        q: "How do I cancel Pro?",
        a: "You can cancel from the billing portal. Sign in, go to certbench.dev/upgrade and choose “Manage billing”. This opens Stripe’s customer portal, where you can cancel. You keep Pro until the end of the period that you have paid for.",
        link: { href: "/upgrade", label: "Go to billing" },
      },
      {
        q: "Can I delete my account?",
        a: "Yes. Pro members can delete their own account. Sign in, go to certbench.dev/profile, and type DELETE in the section named “Delete your account”. This permanently deletes your account, your progress and your history, and it cannot be undone. Deleting your account also cancels your Pro subscription. With any account, free or Pro, you can also ask CertBench to delete it by writing to privacy@certbench.dev, as the privacy policy describes.",
        link: { href: "/privacy", label: "Read the privacy policy" },
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/** A group of questions: its heading, then each question as a heading of its own with the answer under it. */
function SectionBlock({ section }: { section: Section }) {
  return (
    <ArticleSection id={section.id} title={section.title} sub={section.description}>
      <div className="border-t border-border">
        {section.items.map((item) => (
          <div key={item.q} className="grid gap-2 border-b border-border py-5">
            <h3 className="text-body font-semibold">{item.q}</h3>
            <div className="cb-measure grid gap-3 text-body text-muted-foreground">
              <p>{item.a}</p>
              {item.link && (
                <p>
                  <Link href={item.link.href} className="cb-link">
                    {item.link.label}
                  </Link>
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </ArticleSection>
  );
}

export default function HelpPage() {
  return (
    <LanderPage>
      <ArticleBody>
        <ArticleHero title="Help center">
          <p>
            This page answers common questions about CertBench. If you cannot find the answer that you need, please{" "}
            <Link href="/contact" className="cb-link">
              contact support
            </Link>
            . Every message is answered.
          </p>
        </ArticleHero>

        <nav aria-labelledby="help-contents" className={cn(COLUMN, "mt-10 border-t border-border pt-5 sm:mt-12")}>
          <h2 id="help-contents" className="text-small font-semibold">
            Contents
          </h2>
          <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="cb-link inline-block py-1.5 text-small">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {sections.map((section) => (
          <SectionBlock key={section.id} section={section} />
        ))}

        <ArticleSection title="If your question is not answered here">
          <div className="cb-measure grid gap-3 text-body text-muted-foreground">
            <p>
              Please write to CertBench. Every message is read and answered. If something is not working, is unclear
              or is missing, CertBench would like to know.
            </p>
            <p>
              <Link href="/contact" className="cb-link">
                Contact CertBench
              </Link>
            </p>
          </div>
        </ArticleSection>
      </ArticleBody>
    </LanderPage>
  );
}
