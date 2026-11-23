import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/workspace/ThemeToggle";

/**
 * The frame of the page where an exam is chosen: the bar at the top, the
 * column, and the title with its first sentence. The page (page.tsx) draws
 * them from here, around the list of exams.
 */

/** The width and the side room of the page's column, which the bar at the top shares: one left edge for the name and the title. */
const COLUMN_WIDTH = "mx-auto w-full max-w-2xl px-4 sm:px-6";

/** The column that the page draws its contents in. */
export const START_COLUMN = `${COLUMN_WIDTH} grid flex-1 content-start gap-10 pb-20 pt-14 outline-none sm:pt-24`;

/** The bar at the top: the name, which leads home, and the theme switch. */
export function StartHeader() {
  return (
    <header className="glass-nav sticky top-0 z-40">
      <div className={`${COLUMN_WIDTH} flex h-14 items-center justify-between`}>
        <Logo />
        <ThemeToggle />
      </div>
    </header>
  );
}

/** The page's title and first sentence. `paid`: the visitor is back from paying and is choosing the exam that Pro opens. */
export function StartLead({ paid }: { paid: boolean }) {
  return (
    <div className="grid gap-4">
      {paid && <p className="cb-label text-muted-foreground">Your payment has been received.</p>}
      <h1 className="cb-title">{paid ? "Which exam is your Pro plan for?" : "Which exam are you preparing for?"}</h1>
      <p className="cb-measure text-lede text-muted-foreground sm:text-xl">
        {paid
          ? "Choose the exam, and its whole study path will open. This includes every step, every hands-on lab and the timed practice exams."
          : "After you choose, your study path sets out each step for you in order."}
      </p>
    </div>
  );
}
