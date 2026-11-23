import { Logo } from "@/components/brand/Logo";
import {
  SECURITY_PLUS_VERSIONS_PATH,
  SY0_801_AI_PATH,
  SY0_801_PATH,
  SY0_801_PRACTICE_PATH,
} from "@/lib/seo/exam-versions";
import { IntentLink } from "./IntentLink";

/** Every free page, grouped the way people look for them. */
const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Practice tests",
    links: [
      { href: "/security-plus-practice-test", label: "Security+ practice test" },
      { href: SY0_801_PRACTICE_PATH, label: "SY0-801 practice test" },
      { href: "/network-plus-practice-test", label: "Network+ practice test" },
      { href: "/a-plus-practice-test", label: "A+ practice test" },
    ],
  },
  {
    title: "PBQ labs",
    links: [
      { href: "/security-plus-pbq-examples", label: "Security+ PBQ examples" },
      { href: "/network-plus-pbq-examples", label: "Network+ PBQ examples" },
      { href: "/a-plus-core-1-pbq-examples", label: "A+ Core 1 PBQ examples" },
      { href: "/a-plus-core-2-pbq-examples", label: "A+ Core 2 PBQ examples" },
    ],
  },
  {
    title: "Tools",
    links: [
      { href: "/tools/port-numbers-quiz", label: "Port numbers quiz" },
      { href: "/tools/subnetting-practice", label: "Subnetting practice" },
      { href: "/tools/subnet-calculator", label: "Subnet calculator" },
      { href: "/tools/security-plus-acronyms-quiz", label: "Security+ acronyms" },
    ],
  },
  {
    title: "Guides",
    links: [
      { href: "/objectives/security-plus-sy0-701", label: "SY0-701 objectives" },
      { href: SY0_801_PATH, label: "SY0-801 objectives" },
      { href: SY0_801_AI_PATH, label: "SY0-801 AI questions" },
      { href: SECURITY_PLUS_VERSIONS_PATH, label: "SY0-801 vs SY0-701" },
      { href: "/best-security-plus-practice-tests", label: "Best Security+ practice tests" },
      { href: "/best-network-plus-practice-tests", label: "Best Network+ practice tests" },
      { href: "/best-a-plus-practice-tests", label: "Best A+ practice tests" },
    ],
  },
  {
    title: "CertBench",
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/about", label: "About CertBench" },
      { href: "/educators", label: "For educators" },
      { href: "/help", label: "Help" },
      { href: "/contact", label: "Contact" },
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/60">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 pb-10 pt-14 sm:px-6">
        <nav aria-label="Free resources" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {COLUMNS.map((col) => (
            <div key={col.title} className="grid content-start gap-1.5">
              <p className="text-small font-semibold">{col.title}</p>
              <ul className="grid">
                {col.links.map((l) => (
                  <li key={l.href}>
                    {/* The padding is the link's own, so a thumb has 36 pixels
                        of link to land on and the next link begins where this
                        one ends. */}
                    <IntentLink
                      href={l.href}
                      className="inline-block py-1.5 text-small text-muted-foreground transition-colors hover:text-foreground hover:underline hover:underline-offset-4"
                    >
                      {l.label}
                    </IntentLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="grid gap-5 border-t border-border pt-8 text-small text-muted-foreground md:grid-cols-[auto_minmax(0,1fr)] md:gap-10">
          <div className="grid content-start gap-2">
            <Logo className="justify-self-start text-foreground" />
            <span>© {new Date().getFullYear()} CertBench</span>
            <a href="mailto:support@certbench.dev" className="cb-link justify-self-start">
              support@certbench.dev
            </a>
          </div>
          {/* Said on every page, not only in the terms: who this is not. It is
              the paragraph a college's reviewer reads, so it is set at the
              size of a table and no wider than its measure. */}
          <p className="cb-measure-sm md:justify-self-end">
            CertBench is an independent study program. It is not affiliated with, endorsed by or sponsored by CompTIA.
            CompTIA, Security+, Network+ and A+ are trademarks of CompTIA, Inc., and are used here only to identify the
            exams. Every question on CertBench is written for CertBench against the published exam objectives. No
            question is taken from a real exam.
          </p>
        </div>
      </div>
    </footer>
  );
}
