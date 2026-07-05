import Link from "next/link";

const LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/help", label: "Help" },
  { href: "/contact", label: "Contact" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

const FREE_RESOURCES = [
  { href: "/security-plus-practice-test", label: "Security+ practice test" },
  { href: "/network-plus-practice-test", label: "Network+ practice test" },
  { href: "/a-plus-practice-test", label: "A+ practice test" },
  { href: "/security-plus-pbq-examples", label: "Security+ PBQ examples" },
  { href: "/network-plus-pbq-examples", label: "Network+ PBQ examples" },
  { href: "/tools/port-numbers-quiz", label: "Port numbers quiz" },
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
