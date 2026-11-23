import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";

// Sign-in and account screens: nothing here should answer a search.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The way in: the wordmark, and one sheet of paper on the desk.
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-muted px-4 pb-10 pt-8 text-foreground">
      {/* The wordmark stands at the top centre as the page's header. The form
          is centred in the space below it, so a tall page (the register page
          and its list of what happens next) does not push it adrift. */}
      <header className="relative mx-auto">
        <Logo />
      </header>
      {/* The page's one main region, where the "Skip to main content" link
          leads. Each page sets its own width, so the register page can widen. */}
      <main
        id="main-content"
        tabIndex={-1}
        className="relative flex w-full flex-1 items-center justify-center py-8 outline-none"
      >
        {children}
      </main>
    </div>
  );
}
