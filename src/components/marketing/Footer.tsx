import Link from "next/link";
import {
  SECURITY_PLUS_VERSIONS_PATH,
  SY0_801_AI_PATH,
  SY0_801_PATH,
  SY0_801_PRACTICE_PATH,
} from "@/lib/seo/exam-versions";

const LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/help", label: "Help" },
  { href: "/contact", label: "Contact" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

const FREE_RESOURCES = [
  { href: "/security-plus-practice-test", label: "Security+ practice test" },
  { href: SY0_801_PRACTICE_PATH, label: "SY0-801 practice test" },
  { href: "/network-plus-practice-test", label: "Network+ practice test" },
  { href: "/a-plus-practice-test", label: "A+ practice test" },
  { href: "/best-security-plus-practice-tests", label: "Best Security+ practice tests" },
  { href: "/best-network-plus-practice-tests", label: "Best Network+ practice tests" },
  { href: "/best-a-plus-practice-tests", label: "Best A+ practice tests" },
  { href: "/security-plus-pbq-examples", label: "Security+ PBQ examples" },
  { href: "/network-plus-pbq-examples", label: "Network+ PBQ examples" },
  { href: "/a-plus-core-1-pbq-examples", label: "A+ Core 1 PBQ examples" },
  { href: "/a-plus-core-2-pbq-examples", label: "A+ Core 2 PBQ examples" },
  { href: "/tools/port-numbers-quiz", label: "Port numbers quiz" },
  { href: "/tools/subnetting-practice", label: "Subnetting practice" },
  { href: "/tools/subnet-calculator", label: "Subnet calculator" },
  { href: "/tools/security-plus-acronyms-quiz", label: "Security+ acronyms" },
  { href: "/objectives/security-plus-sy0-701", label: "SY0-701 objectives" },
  { href: SY0_801_PATH, label: "SY0-801 objectives" },
  { href: SY0_801_AI_PATH, label: "SY0-801 AI questions" },
  { href: SECURITY_PLUS_VERSIONS_PATH, label: "SY0-801 vs SY0-701" },
];

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto grid w-full max-w-5xl gap-6 px-6 py-8 text-sm text-muted-foreground">
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          <span className="font-medium text-foreground">Free resources</span>
          {FREE_RESOURCES.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span>© {new Date().getFullYear()} CertBench</span>
          <nav className="flex flex-wrap gap-4">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
