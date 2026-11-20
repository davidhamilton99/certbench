"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Marks its block `data-in` once it scrolls into view, so `.cb-rise` children
 * settle into place. With `mount`, the children render only from then on (an
 * instrument that animates on mount starts when it's seen, not off-screen);
 * `placeholder` holds the space until then.
 */
export function InView({
  children,
  className,
  style,
  mount = false,
  placeholder = null,
  rootMargin = "0px 0px -12% 0px",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  mount?: boolean;
  placeholder?: ReactNode;
  rootMargin?: string;
  as?: "div" | "section";
}) {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // No observer to wait on: show it on the next frame.
      const raf = requestAnimationFrame(() => setSeen(true));
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return (
    <Tag
      ref={ref as never}
      className={className}
      style={style}
      data-in={seen ? "" : undefined}
    >
      {mount && !seen ? placeholder : children}
    </Tag>
  );
}
