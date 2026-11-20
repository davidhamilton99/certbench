import Link from "next/link";
import { LanderHero, LanderPage, LanderStage } from "@/components/marketing/lander/Lander";
import { FaqSection } from "@/components/marketing/FaqSection";
import { SubnetCalculator } from "@/components/marketing/SubnetCalculator";
import { PathCard } from "@/components/marketing/PathCard";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { pageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { calculateSubnet } from "@/lib/tools/subnet-calculator";

export const metadata = pageMetadata({
  title: "Free Subnet Calculator (IPv4 / CIDR)",
  description:
    "Free IPv4 subnet calculator — enter an IP and CIDR prefix to get the network address, broadcast, usable host range, subnet mask, wildcard mask, and host count instantly. No signup.",
  path: "/tools/subnet-calculator",
});

/** Static CIDR cheat sheet, computed once from the same engine as the tool. */
const CHEAT = [16, 18, 20, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32].map(
  (p) => calculateSubnet("0.0.0.0", p)!
);

const FAQS = [
  {
    question: "How do I calculate a subnet by hand?",
    answer:
      "Use the block-size (magic number) method. Find the interesting mask octet (the one that isn't 0 or 255), subtract it from 256 to get the block size, and the subnets step by that block: 0, block, 2×block… Your address falls in the block at or below it — that's the network address, and the broadcast is one below the next block. For /26 (mask 255.255.255.192): 256 − 192 = 64, so 192.168.1.130 sits in the .128 block → network 192.168.1.128, broadcast 192.168.1.191.",
  },
  {
    question: "How many usable hosts are in a /26?",
    answer:
      "62. Host bits are 32 − 26 = 6, so 2^6 = 64 total addresses, minus the network and broadcast addresses = 62 usable. The same math gives 254 for a /24, 30 for a /27, and 2 for a /30 (the classic point-to-point link).",
  },
  {
    question: "What is a wildcard mask?",
    answer:
      "The bitwise inverse of the subnet mask — where the mask has 1s, the wildcard has 0s. A /24 mask of 255.255.255.0 has a wildcard of 0.0.0.255. Cisco ACLs and OSPF network statements use wildcard masks instead of subnet masks, so it's worth being able to flip between them.",
  },
  {
    question: "What's the difference between a /31 and a /30?",
    answer:
      "A /30 has 4 addresses: network, two usable hosts, and broadcast — the traditional point-to-point link. A /31 (RFC 3021) drops the network/broadcast distinction so both addresses are usable, saving an address on point-to-point links. This calculator counts a /31 as 2 usable hosts with no broadcast.",
  },
  {
    question: "Is this subnet calculator free?",
    answer:
      "Yes — unlimited, no account. If you're studying for Network+ or A+, CertBench Pro adds the full question bank with spaced repetition and a readiness score across every exam domain.",
  },
];

const learningResource = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  name: "Free Subnet Calculator (IPv4 / CIDR)",
  description:
    "Calculate the network address, broadcast, usable host range, subnet mask, wildcard mask, and host count for any IPv4 address and CIDR prefix.",
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

export default function SubnetCalculatorPage() {
  return (
    <LanderPage>
      <JsonLd data={learningResource} />
      <LanderHero
        eyebrow="Free tool"
        title="Subnet calculator"
        sub="Network and broadcast addresses, host range, masks and host count for any IPv4 address."
        specs={["Instant", "Free", "No signup"]}
      />
      <LanderStage width="md">
        <SubnetCalculator />
      </LanderStage>
      <div className="mx-auto w-full max-w-3xl px-5 pt-6 sm:px-6">
        {/* CIDR cheat sheet — content for readers and crawlers alike */}
        <section className="mt-12 grid gap-4">
          <div className="grid gap-1">
            <h2 className="text-xl font-semibold tracking-tight">CIDR cheat sheet</h2>
            <p className="text-sm text-muted-foreground">
              The prefixes you&apos;ll meet most on Network+, A+, and CCNA.
            </p>
          </div>
          <div className="glass overflow-x-auto rounded-3xl p-2 sm:p-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">CIDR</th>
                  <th className="px-3 py-2 font-medium">Subnet mask</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">Wildcard</th>
                  <th className="px-3 py-2 text-right font-medium">Usable hosts</th>
                </tr>
              </thead>
              <tbody>
                {CHEAT.map((r) => (
                  <tr key={r.prefix} className="border-t border-border/60">
                    <td className="px-3 py-2 font-mono text-xs font-medium">/{r.prefix}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.mask}</td>
                    <td className="hidden px-3 py-2 font-mono text-xs text-muted-foreground sm:table-cell">
                      {r.wildcard}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                      {r.usableHosts.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* The method, taught in the open */}
        <section className="glass mt-10 grid gap-4 rounded-3xl p-6 sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight">
            The block-size method in 20 seconds
          </h2>
          <div className="grid gap-3 leading-relaxed text-muted-foreground">
            <p>
              You don&apos;t need binary once the mask octets are memorized —
              128, 192, 224, 240, 248, 252, 254, 255. Every subnet question
              becomes arithmetic:
            </p>
            <ol className="grid gap-2 pl-5" style={{ listStyle: "decimal" }}>
              <li>
                <span className="text-foreground">Find the block size:</span>{" "}
                subtract the interesting mask octet from 256. For /26 (192):
                256 − 192 = <span className="font-mono">64</span>.
              </li>
              <li>
                <span className="text-foreground">Step in blocks:</span> subnets
                start at 0, 64, 128, 192. Your address falls in the block at or
                below it → that&apos;s the network.
              </li>
              <li>
                <span className="text-foreground">Broadcast:</span> one below
                the next block. For 192.168.1.130 /26 → network{" "}
                <span className="font-mono">192.168.1.128</span>, broadcast{" "}
                <span className="font-mono">192.168.1.191</span>.
              </li>
            </ol>
            <p>
              Want to get fast at this?{" "}
              <Link
                href="/tools/subnetting-practice"
                className="text-primary underline underline-offset-4"
              >
                Drill it under a timer
              </Link>{" "}
              until it&apos;s reflex.
            </p>
          </div>
        </section>

        <PathCard
          className="mt-10"
          kicker="Your Network+ path"
          title="Subnetting is one Network+ objective"
          href="/path/network-plus-n10-009"
          label="Start my Network+ path"
          context="subnet_calculator_page"
        >
          The N10-009 exam has five domains. Your Network+ path walks every objective in short rounds, up to a
          readiness checkpoint that shows where you stand.
        </PathCard>

        <RelatedLinks
          links={[
            {
              href: "/tools/subnetting-practice",
              label: "Subnetting practice",
              note: "Rapid CIDR and subnet-mask drills",
            },
            {
              href: "/network-plus-practice-test",
              label: "Network+ practice test",
              note: "Original N10-009 questions with full explanations",
            },
            {
              href: "/tools/port-numbers-quiz",
              label: "Port numbers quiz",
              note: "The ports and protocols N10-009 tests hardest",
            },
          ]}
        />

        <FaqSection faqs={FAQS} />
      </div>
    </LanderPage>
  );
}
