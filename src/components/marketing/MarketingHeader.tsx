"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/workspace/ThemeToggle";
import { useSignedIn } from "@/components/auth/useSignedIn";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HeaderAccountLinks } from "./HeaderAccountLinks";
import { IntentLink } from "./IntentLink";

/**
 * Each exam's own page (its free practice exam and outline), then the price,
 * the page for instructors and how CertBench is made. `bar` is the width from
 * which the link has room in the bar itself; below it the link is in the menu.
 */
const NAV: { href: string; label: string; bar: "md" | "lg" }[] = [
  { href: "/security-plus-practice-test", label: "Security+", bar: "md" },
  { href: "/network-plus-practice-test", label: "Network+", bar: "md" },
  { href: "/a-plus-practice-test", label: "A+", bar: "md" },
  { href: "/pricing", label: "Pricing", bar: "md" },
  { href: "/educators", label: "For educators", bar: "lg" },
  { href: "/about", label: "About", bar: "lg" },
];

/** A row of the menu: a full line to press, 44 pixels tall. */
const MENU_ROW =
  "flex min-h-11 w-full items-center text-left text-body text-muted-foreground hover:text-foreground aria-[current=page]:font-semibold aria-[current=page]:text-foreground aria-[current=page]:underline aria-[current=page]:underline-offset-4";

/**
 * The navy band at the top of every public page: the name, the pages a
 * visitor asks for first, and the way in.
 *
 * From the `lg` width every link stands in the bar. Below it a "Menu" button
 * opens the links that do not fit as a plain list under the bar: all of them
 * on a phone, where "Sign in" and the theme switch move into the list as
 * well, and the last two at tablet widths. The list is part of the page and
 * not a dialog, so it takes no focus and traps none: the Escape key closes it
 * and returns to the button, and so does opening a page from it.
 */
export function MarketingHeader() {
  const pathname = usePathname();
  const signedIn = useSignedIn();
  const menuId = useId();
  const header = useRef<HTMLElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  // The page the menu was opened on. Arriving on another page closes it with
  // no effect to run: the two no longer match.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn !== null && openOn === pathname;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenOn(null);
      button.current?.focus();
    };
    // A press anywhere else on the page puts the list away, as a visitor
    // expects of a menu. The keyboard's place is left where the press put it.
    const onPress = (event: PointerEvent) => {
      if (event.target instanceof Node && header.current?.contains(event.target)) return;
      setOpenOn(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPress);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPress);
    };
  }, [open]);

  return (
    <header ref={header} className="glass-nav sticky top-0 z-40">
      <div className="mx-auto flex h-[3.75rem] w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-8">
          <Logo />
          {/* The size is set once, on the list, and each link carries only its
              colour: a size and a colour passed through one cn() call can
              lose the size (the merger reads the site's own sizes as
              colours unless it is told otherwise). */}
          <nav aria-label="Main" className="hidden items-center gap-6 text-small md:flex">
            {NAV.map((item) => (
              <IntentLink
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={cn(
                  // The page you are on is said by colour and an underline
                  // only, so no link changes width from one page to the next.
                  "py-2 text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:text-foreground aria-[current=page]:underline aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8",
                  item.bar === "lg" && "hidden lg:inline"
                )}
              >
                {item.label}
              </IntentLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-1">
          {/* On a phone the bar has room for the name, the way in and the
              menu. The theme switch and "Sign in" are in the menu there. */}
          <span className="hidden sm:inline-flex">
            <ThemeToggle />
          </span>
          <HeaderAccountLinks />
          <Button
            ref={button}
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground aria-expanded:bg-foreground/[0.1] aria-expanded:text-foreground lg:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpenOn(open ? null : pathname)}
          >
            Menu
          </Button>
        </div>
      </div>
      <div id={menuId} hidden={!open} className="border-t border-border lg:hidden">
        {open && (
          <nav aria-label="Menu" className="mx-auto w-full max-w-6xl px-5 py-2 sm:px-6">
            {/* Opening the page you are already on changes no address, so the
                list is also closed by the press itself. */}
            <ul
              className="divide-y divide-border"
              onClick={(event) => {
                if (event.target instanceof Element && event.target.closest("a")) setOpenOn(null);
              }}
            >
              {NAV.map((item) => (
                <li key={item.href} className={cn(item.bar === "md" && "md:hidden")}>
                  <IntentLink
                    href={item.href}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className={MENU_ROW}
                  >
                    {item.label}
                  </IntentLink>
                </li>
              ))}
              {signedIn !== true && (
                <li className="sm:hidden">
                  <Link href="/login" className={MENU_ROW}>
                    Sign in
                  </Link>
                </li>
              )}
              <li className="sm:hidden">
                <ThemeRow />
              </li>
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}

/**
 * The theme switch as a line of the menu. It is drawn only once the menu has
 * been opened, which is after the page has loaded, so the theme is known.
 */
function ThemeRow() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <button type="button" className={MENU_ROW} onClick={() => setTheme(dark ? "light" : "dark")}>
      {dark ? "Switch to light mode" : "Switch to dark mode"}
    </button>
  );
}
