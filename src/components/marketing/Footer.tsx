import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import {
  SECURITY_PLUS_VERSIONS_PATH,
  SY0_801_AI_PATH,
  SY0_801_PATH,
  SY0_801_PRACTICE_PATH,
} from "@/lib/seo/exam-versions";

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
      { href: "/help", label: "Help" },
      { href: "/contact", label: "Contact" },
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 pb-12 pt-16">
        <nav aria-label="Free resources" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {COLUMNS.map((col) => (
            <div key={col.title} className="grid content-start gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground/80">{col.title}</p>
              <ul className="grid gap-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-8 text-sm text-muted-foreground">
          <Logo />
          <span>© {new Date().getFullYear()} CertBench</span>
        </div>
      </div>
    </footer>
  );
}
