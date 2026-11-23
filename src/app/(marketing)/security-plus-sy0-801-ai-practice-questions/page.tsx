import Link from "next/link";
import { FaqSection } from "@/components/marketing/FaqSection";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { LanderBlock, LanderPage } from "@/components/marketing/lander/Lander";
import { ArticleBody, ArticleHero, ArticleRow, ArticleSection, CtaBand } from "@/components/marketing/lander/Article";
import { QuestionDeck, type DeckQuestion } from "@/components/marketing/QuestionDeck";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import {
  COMPTIA_URLS,
  SECURITY_PLUS_CERT,
  SECURITY_PLUS_VERSIONS_PATH,
  SY0_801_AI_PATH,
  SY0_801_CERT,
  SY0_801_PATH,
  SY0_801_PRACTICE_PATH,
  SY0_801_PUBLISHED_ISO,
  SY0_801_UPDATED_ISO,
} from "@/lib/seo/exam-versions";
import { SY0_801_AI_QUESTIONS, SY0_801_AI_TOPICS } from "@/data/security-plus-v8";
import { pageMetadata } from "@/lib/seo/metadata";
import { articleData } from "@/lib/seo/structured-data";

const TITLE = "SY0-801 practice questions: AI threats (objective 2.6)";
const DESCRIPTION = `This page has ${SY0_801_AI_QUESTIONS.length} free, original Security+ SY0-801 practice questions on the new AI objective, 2.6. They cover prompt injection, poisoning, jailbreaking, hallucinations and the other topics that CompTIA lists, and each answer is explained.`;

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: SY0_801_AI_PATH,
});

/** The questions for the deck, each tagged with the 2.6 topic it practices. */
const AI_DECK: DeckQuestion[] = SY0_801_AI_QUESTIONS.map((q) => ({
  questionText: q.questionText,
  options: q.options,
  correctIndex: q.correctIndex,
  explanation: q.explanation,
  tag: q.topic,
}));

const FAQS = [
  {
    question: "Is AI on the Security+ exam?",
    answer:
      "Yes, on SY0-801. Objective 2.6 covers the threats and vulnerabilities that come with using AI, and AI also appears in the automation objective. SY0-701, the exam before it, has no AI objective.",
  },
  {
    question: "What is the difference between prompt injection and jailbreaking?",
    answer:
      "Prompt injection is input that overrides the instructions an AI was given, and it can be hidden in content that the AI reads, such as an email or a web page. Jailbreaking is prompting meant to get around a model's safety rules so that it produces what it should refuse. A jailbreak is often done through prompt injection, but the goals differ: prompt injection takes over the task, and jailbreaking defeats the safety rules.",
  },
  {
    question: "What is the difference between poisoning and evasion?",
    answer:
      "The difference is timing. Poisoning corrupts the data that a model learns from, so the damage is built in before the model is used. Evasion leaves the model alone and crafts the input at the time of use, such as malware altered until a detector calls it clean.",
  },
  {
    question: "Are these real exam questions?",
    answer:
      "No. They are original questions written by CertBench to practice the topics that CompTIA lists for objective 2.6. CompTIA's exam questions are confidential, and using leaked ones breaks its exam policies.",
  },
];

export default function Sy0801AiQuestionsPage() {
  return (
    <LanderPage>
      <JsonLd
        data={articleData({
          headline: TITLE,
          description: DESCRIPTION,
          path: SY0_801_AI_PATH,
          published: SY0_801_PUBLISHED_ISO,
          modified: SY0_801_UPDATED_ISO,
        })}
      />
      <ArticleBody>
        <ArticleHero
          eyebrow="CompTIA Security+ SY0-801, objective 2.6"
          title="SY0-801 practice questions: AI threats and vulnerabilities"
        >
          <p>
            <strong>SY0-801 adds a new objective, 2.6, on the threats and vulnerabilities of using AI.</strong>{" "}
            SY0-701 has no objective on AI. This page has {SY0_801_AI_QUESTIONS.length} questions on it, with at least
            one for every topic that CompTIA lists.
          </p>
          <p>
            Choose an answer to see whether it is correct, and why. These are original questions written by CertBench.
            They are not taken from the exam.
          </p>
        </ArticleHero>

        <ArticleSection title="The questions">
          <QuestionDeck
            questions={AI_DECK}
            label="Objective 2.6: AI threats"
            surface="sy0801_ai_page"
            path={`/path/${SY0_801_CERT}`}
            examName="SY0-801"
          />
        </ArticleSection>

        <ArticleSection title={`The ${SY0_801_AI_TOPICS.length} topics of objective 2.6, briefly defined`}>
          <dl className="border-t border-border">
            {SY0_801_AI_TOPICS.map((t) => (
              <ArticleRow key={t.term} term={t.term}>
                <p>{t.gist}</p>
              </ArticleRow>
            ))}
          </dl>
        </ArticleSection>
      </ArticleBody>

      <CtaBand title="Take the whole SY0-801 practice exam">
        {/* Only what holds for whichever exam that page serves: its questions are drawn from the bank when it is built. */}
        <p className="cb-measure text-body text-muted-foreground">
          The free SY0-801 practice exam is timed and follows the exam&apos;s domain weights. It is scored by domain,
          and every answer is explained. Anyone can take it, and a free account shows the score.
        </p>
        <Button asChild size="lg" className="mt-1">
          <Link href={SY0_801_PRACTICE_PATH}>Take the practice exam</Link>
        </Button>
        <p className="cb-measure-sm text-small text-muted-foreground">
          You can also{" "}
          <Link href={SY0_801_PATH} className="cb-link">
            read the SY0-801 exam objectives
          </Link>
          ,{" "}
          <Link href={`/path/${SY0_801_CERT}`} className="cb-link">
            start the SY0-801 study path
          </Link>{" "}
          or, if you are taking SY0-701,{" "}
          <Link href={`/path/${SECURITY_PLUS_CERT}`} className="cb-link">
            start the SY0-701 study path
          </Link>
          .
        </p>
      </CtaBand>

      <LanderBlock>
        <RelatedLinks
          links={[
            {
              href: SY0_801_PRACTICE_PATH,
              label: "SY0-801 practice test",
              note: "A free timed exam, scored by domain",
            },
            {
              href: SY0_801_PATH,
              label: "SY0-801 exam objectives",
              note: "The exam, its five domains and all 27 objectives",
            },
            {
              href: SECURITY_PLUS_VERSIONS_PATH,
              label: "SY0-801 vs SY0-701",
              note: "Which version to take, by exam date",
            },
            {
              href: "/tools/security-plus-acronyms-quiz",
              label: "Security+ acronyms quiz",
              note: "Practice the acronyms that both exams use",
            },
          ]}
        />

        <FaqSection faqs={FAQS} />

        <p className="cb-measure-xs mt-10 text-note text-muted-foreground">
          The topics are from objective 2.6 in CompTIA&apos;s SY0-801 exam objectives, which are linked from its{" "}
          <a href={COMPTIA_URLS.securityV8} target="_blank" rel="noopener noreferrer" className="cb-link">
            Security+ V8 page
          </a>
          . The questions and explanations are written by CertBench.
        </p>
      </LanderBlock>
    </LanderPage>
  );
}
