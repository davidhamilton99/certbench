import Link from "next/link";
import {
  LanderBlock,
  LanderHero,
  LanderPage,
  LanderSection,
  LanderStage,
} from "@/components/marketing/lander/Lander";
import { FaqSection } from "@/components/marketing/FaqSection";
import { SubnetCalculator } from "@/components/marketing/SubnetCalculator";
import { PathCard } from "@/components/marketing/PathCard";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { NETWORK_PLUS_CERT, usesOfficialObjectiveNumbers } from "@/lib/seo/exam-versions";
import { pageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { calculateSubnet } from "@/lib/tools/subnet-calculator";
import { PORT_ENTRIES } from "@/lib/tools/port-quiz-data";

const TITLE = "Free subnet calculator (IPv4 and CIDR)";

/**
 * What the Network+ study path is said to cover. Network+ is set out by
 * CertBench's own topics, so the page says "topic" until its steps follow
 * CompTIA's objectives.
 */
const COVERED = usesOfficialObjectiveNumbers(NETWORK_PLUS_CERT) ? "objective" : "topic";

export const metadata = pageMetadata({
  title: TITLE,
  description:
    "A free IPv4 subnet calculator. Enter an IP address and a CIDR prefix to see the network address, the broadcast address, the usable host range, the subnet mask, the wildcard mask and the host count. No account is required.",
  path: "/tools/subnet-calculator",
});

/** The reference table, worked once by the same arithmetic as the calculator. */
const REFERENCE = [16, 18, 20, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32].map((p) => calculateSubnet("0.0.0.0", p)!);

const FAQS = [
  {
    question: "How do I calculate a subnet by hand?",
    answer:
      "Use the block-size method, which is also called the magic number method. Find the mask octet that is not 0 or 255, and subtract it from 256 to get the block size. The subnets begin at multiples of the block size, starting from 0. Your address belongs to the subnet that begins at or below it: that is the network address, and the broadcast address is one below the start of the next subnet. For /26 (mask 255.255.255.192), the block size is 256 − 192 = 64, so 192.168.1.130 is in the subnet that begins at 128. The network address is 192.168.1.128 and the broadcast address is 192.168.1.191.",
  },
  {
    question: "How many usable hosts are in a /26?",
    answer:
      "A /26 has 62 usable hosts. It has 32 − 26 = 6 host bits, which gives 2^6 = 64 addresses, and two of them are the network address and the broadcast address. The same calculation gives 254 usable hosts for a /24, 30 for a /27 and 2 for a /30, which is the usual size for a point-to-point link.",
  },
  {
    question: "What is a wildcard mask?",
    answer:
      "A wildcard mask is the bitwise inverse of the subnet mask: where the subnet mask has a 1, the wildcard mask has a 0. The /24 mask 255.255.255.0 has the wildcard mask 0.0.0.255. Cisco access control lists and OSPF network statements use wildcard masks instead of subnet masks, so it is useful to be able to convert between the two.",
  },
  {
    question: "What is the difference between a /31 and a /30?",
    answer:
      "A /30 has four addresses: the network address, two usable hosts and the broadcast address. It is the traditional size for a point-to-point link. A /31 (RFC 3021) has two addresses and no separate network or broadcast address, so both are usable, which saves addresses on point-to-point links. This calculator counts a /31 as two usable hosts with no broadcast address.",
  },
  {
    question: "Is this subnet calculator free?",
    answer:
      "Yes. It is free to use without limit, and no account is required. If you are studying for Network+ or A+, the CertBench study path for your exam is free to start. CertBench Pro opens the whole study path, every hands-on lab and new timed practice exams.",
  },
];

const learningResource = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  name: TITLE,
  description:
    "Calculate the network address, the broadcast address, the usable host range, the subnet mask, the wildcard mask and the host count for any IPv4 address and CIDR prefix.",
  url: "https://certbench.dev/tools/subnet-calculator",
  learningResourceType: "Calculator",
  educationalUse: "Practice",
  isAccessibleForFree: true,
  inLanguage: "en",
  provider: {
    "@type": "Organization",
    name: "CertBench",
    url: "https://certbench.dev",
  },
};

/** A step of the method: what to do, in bold, then how. */
function Step({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <li>
      <span className="font-medium text-foreground">{name}</span> {children}
    </li>
  );
}

export default function SubnetCalculatorPage() {
  return (
    <LanderPage>
      <JsonLd data={learningResource} />
      <LanderHero
        eyebrow="IPv4 and CIDR"
        title="Subnet calculator"
        sub="This calculator gives the network and broadcast addresses, the host range, the masks and the host count for any IPv4 address."
        specs={[
          { label: "Results", value: "As you type" },
          { label: "Cost", value: "Free" },
          { label: "Account", value: "Not required" },
        ]}
      />
      <LanderStage width="md">
        <SubnetCalculator />
      </LanderStage>

      {/* The reference table is in the open, for readers and for search. */}
      <LanderSection
        title="CIDR reference table"
        sub="The table gives the subnet mask, the wildcard mask and the usable hosts for common prefixes from /16 to /32."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-small">
            <thead>
              <tr className="border-b border-foreground/70 text-left text-note text-muted-foreground">
                <th scope="col" className="py-2 pr-4 font-medium">
                  CIDR
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Subnet mask
                </th>
                <th scope="col" className="hidden px-4 py-2 font-medium sm:table-cell">
                  Wildcard mask
                </th>
                <th scope="col" className="py-2 pl-4 text-right font-medium">
                  Usable hosts
                </th>
              </tr>
            </thead>
            <tbody>
              {REFERENCE.map((r) => (
                <tr key={r.prefix} className="border-b border-border">
                  <th scope="row" className="py-2 pr-4 text-left font-mono font-medium">
                    /{r.prefix}
                  </th>
                  <td className="px-4 py-2 font-mono">{r.mask}</td>
                  <td className="hidden px-4 py-2 font-mono text-muted-foreground sm:table-cell">{r.wildcard}</td>
                  <td className="py-2 pl-4 text-right font-mono tabular-nums">{r.usableHosts.toLocaleString("en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LanderSection>

      {/* The method itself, set out for anyone who wants to do it by hand. */}
      <LanderSection title="The block-size method">
        <div className="cb-measure grid gap-4 text-body text-muted-foreground">
          <p>
            You do not need binary once you know the eight mask octets: 128, 192, 224, 240, 248, 252, 254 and 255.
            Every subnet question then becomes arithmetic.
          </p>
          <ol className="grid list-decimal gap-2.5 pl-5">
            <Step name="Find the block size.">
              Subtract the mask octet that is not 0 or 255 from 256. For /26 the mask octet is 192, and 256 − 192 ={" "}
              <span className="font-mono">64</span>.
            </Step>
            <Step name="Count in blocks.">
              The subnets begin at 0, 64, 128 and 192. Your address belongs to the subnet that begins at or below it,
              and that is the network address.
            </Step>
            <Step name="Find the broadcast address.">
              It is one below the start of the next subnet. For 192.168.1.130 /26, the network address is{" "}
              <span className="font-mono">192.168.1.128</span> and the broadcast address is{" "}
              <span className="font-mono">192.168.1.191</span>.
            </Step>
          </ol>
          <p>
            To practice the method against the clock, use the{" "}
            <Link href="/tools/subnetting-practice" className="cb-link">
              subnetting practice drills
            </Link>
            .
          </p>
        </div>
      </LanderSection>

      <PathCard
        className="mt-16 sm:mt-24"
        title="Subnetting is one topic of the Network+ study path"
        href="/path/network-plus-n10-009"
        label="Start the Network+ study path"
        context="subnet_calculator_page"
      >
        The N10-009 exam has five domains. The Network+ study path covers every {COVERED} in short steps, up to a
        readiness checkpoint that shows where you stand.
      </PathCard>

      <LanderBlock>
        <RelatedLinks
          links={[
            {
              href: "/tools/subnetting-practice",
              label: "Subnetting practice",
              note: "Timed drills on prefixes, masks and addresses",
            },
            {
              href: "/network-plus-practice-test",
              label: "Network+ practice test",
              note: "A free full-length N10-009 exam: 90 questions, 90 minutes",
            },
            {
              href: "/tools/port-numbers-quiz",
              label: "Port numbers quiz",
              note: `A quiz on ${PORT_ENTRIES.length} port numbers and their protocols`,
            },
          ]}
        />

        <FaqSection faqs={FAQS} />
      </LanderBlock>
    </LanderPage>
  );
}
