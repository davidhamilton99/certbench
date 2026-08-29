"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Brain,
  FlaskConical,
  LayoutDashboard,
  Library,
  ListChecks,
  Table2,
  Users,
  Zap,
} from "lucide-react";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { SignOutButton } from "./SignOutButton";

export interface ShellCert {
  slug: string;
  name: string;
  examCode: string;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/study-materials", label: "Study sets", icon: Library },
  { href: "/community", label: "Community", icon: Users },
  { href: "/pbq", label: "PBQ lab", icon: FlaskConical },
  { href: "/recall", label: "Recall", icon: Brain },
  { href: "/drills", label: "Drills", icon: Zap },
  { href: "/reference", label: "Reference", icon: Table2 },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/review", label: "Review", icon: ListChecks },
];

function CertSwitcher({ certs }: { certs: ShellCert[] }) {
  const searchParams = useSearchParams();
  const activeSlug = searchParams.get("cert") ?? certs[0]?.slug;

  if (certs.length <= 1) return null;
  return (
    <div className="flex flex-col gap-1 border-b px-3 pb-3">
      <span className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Certification
      </span>
      {certs.map((cert) => (
        <Link
          key={cert.slug}
          href={`/dashboard?cert=${cert.slug}`}
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
    </div>
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

function DesktopNav() {
  const pathname = usePathname();
  const cert = useSearchParams().get("cert");
  return (
    <nav className="flex flex-1 flex-col gap-0.5 p-3">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={withCert(href, cert)}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
              active
                ? "bg-accent font-medium"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            <Icon
              className={cn(
                "size-4",
                active ? "text-primary" : "text-muted-foreground"
              )}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const cert = useSearchParams().get("cert");
  return (
    <nav className="flex gap-1 overflow-x-auto border-b px-3 py-2 md:hidden">
      {NAV_ITEMS.map(({ href, label }) => (
        <Link
          key={href}
          href={withCert(href, cert)}
          className={cn(
            "whitespace-nowrap rounded-full px-3 py-1 text-xs transition-colors",
            pathname.startsWith(href)
              ? "bg-accent font-medium"
              : "text-muted-foreground hover:bg-accent/50"
          )}
        >
          {label}
        </Link>
      ))}
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
  return (
    <div className="flex min-h-svh">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center px-4 py-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 text-base font-semibold tracking-tight"
          >
            <span className="flex size-6 items-center justify-center rounded-md bg-primary font-mono text-[11px] font-bold text-primary-foreground">
              CB
            </span>
            CertBench
          </Link>
        </div>
        <Suspense>
          <CertSwitcher certs={certs} />
        </Suspense>
        <Suspense>
          <DesktopNav />
        </Suspense>
        <div className="flex items-center justify-between gap-1 border-t px-3 py-2.5">
          <Link
            href="/profile"
            className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[11px] uppercase">
              {displayName.trim().charAt(0) || "?"}
            </span>
            <span className="truncate">{displayName}</span>
          </Link>
          <div className="flex shrink-0 items-center">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Mobile top bar + content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-2.5 backdrop-blur md:hidden">
          <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
            CertBench
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>
        <Suspense>
          <MobileNav />
        </Suspense>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
