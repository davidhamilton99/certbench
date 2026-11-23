"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Brain,
  FlaskConical,
  LayoutDashboard,
  Library,
  ListChecks,
  Route,
  Table2,
  Users,
} from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { SignOutButton } from "./SignOutButton";
import { Logo } from "@/components/brand/Logo";

export interface ShellCert {
  slug: string;
  name: string;
  examCode: string;
}

/**
 * The study path comes first: it is how CertBench is meant to be studied. The
 * rest of the workspace is the set of Pro tools around it, and the pages used
 * least sit under More.
 */
const TOOLKIT = [
  { href: "/pbq", label: "Hands-on labs", icon: FlaskConical },
  { href: "/recall", label: "Recall", icon: Brain },
  { href: "/review", label: "Review", icon: ListChecks },
  { href: "/reference", label: "Reference", icon: Table2 },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const MORE = [
  { href: "/study-materials", label: "Study sets", icon: Library },
  { href: "/community", label: "Community", icon: Users },
];

const PLAN = { href: "/dashboard", label: "Study plan", icon: LayoutDashboard };

const NAV_ITEMS = [PLAN, ...TOOLKIT, ...MORE];

/**
 * The active certification from `?cert=`, read on the client only. It is `null`
 * on the server and the first client render, so the nav hydrates identically
 * and never mismatches; the cert is applied right after mount and whenever the
 * route changes. Reading `window.location` deliberately avoids Next's
 * `useSearchParams`, which forces its subtree into a Suspense/CSR bailout that
 * produced a hydration mismatch on every workspace page.
 */
function useCertParam(): string | null {
  // usePathname re-renders this on every client navigation, so the external
  // snapshot below is re-read; getServerSnapshot keeps SSR and the first client
  // paint at null, so the nav hydrates identically.
  usePathname();
  return useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("cert"),
    () => null
  );
}

function CertSwitcher({ certs }: { certs: ShellCert[] }) {
  const activeSlug = useCertParam() ?? certs[0]?.slug;

  if (certs.length <= 1) return null;
  return (
    <nav aria-label="Certification" className="flex flex-col gap-1 border-b px-3 pb-3">
      <span aria-hidden className="cb-label px-1 text-muted-foreground">
        Certification
      </span>
      {certs.map((cert) => (
        <Link
          key={cert.slug}
          href={`/dashboard?cert=${cert.slug}`}
          aria-current={cert.slug === activeSlug ? "true" : undefined}
          className={cn(
            "rounded-md px-2 py-1.5 text-sm transition-colors",
            cert.slug === activeSlug
              ? "bg-accent font-medium"
              : "text-muted-foreground hover:bg-accent/50"
          )}
        >
          {cert.name}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Keep the selected certification (?cert=) across navigation. Without this,
 * clicking a nav item drops the query param and cert-scoped pages fall back
 * to the first enrollment.
 */
function withCert(href: string, cert: string | null): string {
  return cert ? `${href}?cert=${cert}` : href;
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      // The page in hand is said, as well as shown by its fill and weight.
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
        active
          ? "bg-accent font-medium"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
    >
      <Icon aria-hidden className={cn("size-4", active ? "text-primary" : "text-muted-foreground")} />
      {label}
    </Link>
  );
}

function DesktopNav({ pathHref }: { pathHref: string | null }) {
  const pathname = usePathname();
  const cert = useCertParam();
  return (
    <nav aria-label="Workspace" className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
      {pathHref && (
        <Link
          href={pathHref}
          className="mb-1.5 flex items-center gap-2.5 rounded-md bg-primary px-2.5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Route aria-hidden className="size-4" />
          Your study path
        </Link>
      )}
      <NavLink {...PLAN} href={withCert(PLAN.href, cert)} active={pathname.startsWith(PLAN.href)} />
      <p className="cb-label mt-4 px-2.5 pb-1 text-muted-foreground">Toolkit</p>
      {TOOLKIT.map((item) => (
        <NavLink key={item.href} {...item} href={withCert(item.href, cert)} active={pathname.startsWith(item.href)} />
      ))}
      <p className="cb-label mt-4 px-2.5 pb-1 text-muted-foreground">More</p>
      {MORE.map((item) => (
        <NavLink key={item.href} {...item} href={withCert(item.href, cert)} active={pathname.startsWith(item.href)} />
      ))}
    </nav>
  );
}

function MobileNav({ pathHref }: { pathHref: string | null }) {
  const pathname = usePathname();
  const cert = useCertParam();
  // On a touch screen each link is 44 pixels tall: this row is the only way
  // around the workspace on a phone. The text size is set once, on the row:
  // the class merger takes the type scale's sizes for colours and would drop
  // one beside a colour on the links themselves.
  const link = "whitespace-nowrap rounded-md px-3 py-1.5 pointer-coarse:py-3";
  return (
    <nav aria-label="Workspace" className="flex gap-1 overflow-x-auto border-b px-3 py-2 text-note md:hidden">
      {pathHref && (
        <Link href={pathHref} className={cn(link, "bg-primary font-medium text-primary-foreground")}>
          Your study path
        </Link>
      )}
      {NAV_ITEMS.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={withCert(href, cert)}
            aria-current={active ? "page" : undefined}
            className={cn(
              link,
              "transition-colors",
              active ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/50"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function WorkspaceShell({
  certs,
  displayName,
  children,
}: {
  certs: ShellCert[];
  displayName: string;
  children: React.ReactNode;
}) {
  const certParam = useCertParam();
  const activeSlug = certs.find((c) => c.slug === certParam)?.slug ?? certs[0]?.slug;
  const pathHref = activeSlug ? `/path/${activeSlug}` : null;

  return (
    // The workspace lies on the desk colour; each panel on it is a sheet of paper.
    <div className="flex min-h-svh aurora-bg text-foreground">
      {/* The side bar, from tablet widths up. */}
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center px-4 py-4">
          <Logo href="/dashboard" />
        </div>
        <CertSwitcher certs={certs} />
        <DesktopNav pathHref={pathHref} />
        <div className="flex items-center justify-between gap-1 border-t px-3 py-2.5">
          <Link
            href="/profile"
            className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          >
            <span
              aria-hidden
              className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-xs uppercase"
            >
              {displayName.trim().charAt(0) || "?"}
            </span>
            <span className="truncate">
              <span className="sr-only">Profile: </span>
              {displayName}
            </span>
          </Link>
          <div className="flex shrink-0 items-center">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* On a phone: a bar at the top, the row of links, then the page. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-2.5 md:hidden">
          <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
            CertBench
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>
        <MobileNav pathHref={pathHref} />
        {/* The skip link at the top of the document leads here (see the root layout). */}
        <main id="main-content" tabIndex={-1} className="flex-1 px-4 py-6 outline-none md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
