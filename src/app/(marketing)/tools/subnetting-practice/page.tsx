import {
  LanderBlock,
  LanderHero,
  LanderPage,
  LanderProse,
  LanderSection,
  LanderStage,
} from "@/components/marketing/lander/Lander";
import { ArticleRow } from "@/components/marketing/lander/Article";
import { FaqSection } from "@/components/marketing/FaqSection";
import { SubnettingPractice } from "@/components/marketing/SubnettingPractice";
import { PathCard } from "@/components/marketing/PathCard";
import { ToolEmailCapture } from "@/components/marketing/ToolEmailCapture";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { pageMetadata } from "@/lib/seo/metadata";
import { MODES, type DrillMode } from "@/lib/tools/subnetting";
import { MIXED_MODE_NAME, modeName } from "@/lib/tools/subnet-mode-names";
import { ROUND_SIZE } from "@/core/drill-rounds/drill-rounds";

export const metadata = pageMetadata({
  title: "Free subnetting practice: timed drills",
  description:
    "Practice subnetting in timed drills, one skill at a time: binary, CIDR prefixes and masks, network addresses, broadcast addresses and host counts. Each answer is marked at once, and an incorrect answer shows the worked steps. The first round is free and needs no account.",
  path: "/tools/subnetting-practice",
});

/** What each mode asks, in a sentence. The modes' names are the ones the drill prints, so the two always agree. */
const MODE_TASKS: Record<DrillMode, string> = {
  binary: "Convert an octet between decimal and 8-bit binary.",
  "cidr-mask": "Write the subnet mask for a prefix such as /26, or the prefix for a mask such as 255.255.255.192.",
  "network-id": "Find the network address of an IP address and its prefix.",
  "broadcast-range": "Find the broadcast address, the first usable host or the last usable host of a subnet.",
  "host-math": "Work out the usable hosts for a prefix, or the smallest prefix that fits a number of hosts.",
  "same-subnet": "Decide whether two addresses are in the same subnet.",
};

const FAQS = [
  {
    question: "How do I get faster at subnetting?",
    answer:
      "Practice one conversion at a time until it is automatic, and then add the next. That is why this tool is organized in modes and not in mixed questions. Memorize the mask octets (128, 192, 224, 240, 248, 252, 254 and 255), and then use the block-size method: subtract the mask octet that is not 0 or 255 from 256, and count in blocks of that size. The drill shows your average time for each answer.",
  },
  {
    question: "What is the magic number (block size) method?",
    answer:
      "Take the mask octet that is not 0 or 255 and subtract it from 256. The result is the block size. For /26 (mask 255.255.255.192), 256 − 192 = 64, so the subnets begin at 0, 64, 128 and 192. An address belongs to the subnet that begins at or below it: 192.168.1.154 is in the subnet that begins at 128, so the network address is 192.168.1.128, and the broadcast address is one below the start of the next subnet, 192.168.1.191. You do not need binary once you know the mask octets.",
  },
  {
    question: "Do I need subnetting for Network+ and Security+?",
    answer:
      "Network+ (N10-009) tests subnetting directly, with questions on masks, prefixes and usable hosts, and it appears in performance-based questions. Security+ expects you to read CIDR notation and to recognize network boundaries in firewall rules and logs. CCNA relies on the same skills, so the practice carries over.",
  },
  {
    question: "Should I practice subnetting in binary or with shortcuts?",
    answer:
      "Practice both, in that order. The Binary mode shows why the method works, for example why 192 means two network bits. The block-size method is the one to use under the time limit of the exam. If you can convert octets to binary and you know the block sizes, every subnetting question becomes arithmetic.",
  },
  {
    question: "Is this subnetting practice free?",
    answer: `Yes. Your first round of ${ROUND_SIZE} questions needs no account. A free account then gives you rounds without limit in every mode, saves your progress and begins each round with your weakest skill. CertBench Pro opens the whole Network+ study path, every hands-on lab and new timed practice exams.`,
  },
];

/** A step of the method: what to do, in bold, then how. */
function Step({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <li>
      <span className="font-medium text-foreground">{name}</span> {children}
    </li>
  );
}

export default function SubnettingPracticePage() {
  return (
    <LanderPage>
      <LanderHero
        eyebrow="Network+ N10-009"
        title="Subnetting practice"
        sub="Choose a mode and answer against the clock. An incorrect answer shows the worked steps."
        specs={[
          { label: "First round", value: `${ROUND_SIZE} questions` },
          { label: "Account", value: "Not required for the first round" },
          { label: "Modes", value: MODES.length + 1 },
        ]}
      />
      <LanderStage width="md">
        <SubnettingPractice />
      </LanderStage>

      <LanderProse className="pt-10 sm:pt-12">
        <p>
          Speed comes from practicing one conversion until it is automatic, and not from working through mixed sets
          of questions. Every incorrect answer shows a worked solution that uses the block-size method. A free
          account removes the limit of one round and begins each round with your weakest skill.
        </p>
      </LanderProse>

      {/* What each mode practices, for readers and for search. */}
      <LanderSection title="The modes">
        <dl className="border-t border-border">
          {MODES.map((m) => (
            <ArticleRow key={m.id} term={modeName(m.id)}>
              <p>{MODE_TASKS[m.id]}</p>
            </ArticleRow>
          ))}
          <ArticleRow term={MIXED_MODE_NAME}>
            <p>Every mode, in random order.</p>
          </ArticleRow>
        </dl>
      </LanderSection>

      {/* The method itself: this is what the page teaches. */}
      <LanderSection title="The block-size method">
        <div className="cb-measure grid gap-4 text-body text-muted-foreground">
          <p>
            Memorize the eight mask octets (128, 192, 224, 240, 248, 252, 254 and 255), and every subnetting question
            becomes arithmetic.
          </p>
          <ol className="grid list-decimal gap-2.5 pl-5">
            <Step name="Find the block size.">
              Subtract the mask octet that is not 0 or 255 from 256. For /26 (255.255.255.192), 256 − 192 ={" "}
              <span className="font-mono">64</span>.
            </Step>
            <Step name="Count the blocks.">The subnets begin at 0, 64, 128 and 192.</Step>
            <Step name="Place the address.">
              192.168.1.154 is in the subnet that begins at 128, so the network address is{" "}
              <span className="font-mono">192.168.1.128</span>. The broadcast address is one below the start of the
              next subnet, which is <span className="font-mono">192.168.1.191</span>, and the usable hosts run from{" "}
              <span className="font-mono">192.168.1.129</span> to <span className="font-mono">192.168.1.190</span>.
            </Step>
          </ol>
          <p>
            The {modeName("network-id")} mode and the {modeName("broadcast-range")} mode practice these steps until
            they take only a few seconds.
          </p>
        </div>
      </LanderSection>

      <PathCard
        className="mt-16 sm:mt-24"
        title="Subnetting is one part of the Network+ exam"
        href="/path/network-plus-n10-009"
        label="Start the Network+ study path"
        context="subnetting_page"
      >
        The N10-009 exam has five domains. The Network+ study path covers every objective in short sets of questions
        like these, up to a readiness checkpoint that shows where you stand.
      </PathCard>

      <LanderBlock className="mt-12 sm:mt-16">
        <ToolEmailCapture source="subnetting-practice" />
      </LanderBlock>

      <LanderBlock>
        <RelatedLinks
          links={[
            {
              href: "/tools/subnet-calculator",
              label: "Subnet calculator",
              note: "The network address, the broadcast address and the host range for any IPv4 address",
            },
            {
              href: "/network-plus-practice-test",
              label: "Network+ practice test",
              note: "A free full-length N10-009 exam: 90 questions, 90 minutes",
            },
            {
              href: "/network-plus-pbq-examples",
              label: "Network+ PBQ examples",
              note: "Interactive topology and troubleshooting labs",
            },
            {
              href: "/tools/port-numbers-quiz",
              label: "Port numbers quiz",
              note: "The port numbers that the Network+ exam expects you to know",
            },
          ]}
        />

        <FaqSection faqs={FAQS} />
      </LanderBlock>
    </LanderPage>
  );
}
