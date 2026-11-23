"use client";

import { useState, type ComponentProps } from "react";
import Link from "next/link";

/**
 * A link in a list of links (the header, the footer, a list of objectives)
 * that fetches its page only once the visitor shows that they mean to open it:
 * the pointer enters it, it takes the keyboard, or a finger lands on it.
 *
 * A plain `Link` fetches every page it points at as soon as it scrolls into
 * view. On a page with sixty links that was two to four megabytes of pages
 * nobody had asked for, on the visitor's data and through the proxy each
 * time. The actions a visitor is meant to take next (the exam list, the Start
 * buttons) keep the plain `Link` and its early fetch.
 */
export function IntentLink({
  onPointerEnter,
  onFocus,
  onTouchStart,
  ...props
}: Omit<ComponentProps<typeof Link>, "prefetch">) {
  const [intent, setIntent] = useState(false);
  return (
    <Link
      {...props}
      // `null` is the default behaviour: fetch now that the link is on screen.
      prefetch={intent ? null : false}
      onPointerEnter={(event) => {
        setIntent(true);
        onPointerEnter?.(event);
      }}
      onFocus={(event) => {
        setIntent(true);
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        setIntent(true);
        onTouchStart?.(event);
      }}
    />
  );
}
