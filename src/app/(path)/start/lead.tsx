import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/workspace/ThemeToggle";

/**
 * The frame of the page where an exam is chosen: the bar at the top, the
 * column, and the title with its first sentence. The page (page.tsx) draws
 * them from here, around the list of exams.
 */

/** The column that the page draws its contents in. */
export const START_COLUMN =
  "mx-auto grid w-full max-w-2xl flex-1 content-start gap-10 px-4 pb-20 pt-14 outline-none sm:px-6 sm:pt-24";

/** The bar at the top: the name, which leads home, and the theme switch. */
export function StartHeader() {
  return (
    <header className="glass-nav sticky top-0 z-40">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
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
          : "This is the only choice that you need to make. After this, each step is set out for you in order."}
      </p>
    </div>
  );
}
