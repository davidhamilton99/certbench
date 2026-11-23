import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";

/**
 * The frame of every public page: the navy band, the page, the footer. It is
 * drawn once here, so it stays in place while the page inside it changes, and
 * the account links in the header keep what they know from one page to the
 * next.
 *
 * A page under this layout renders its content only. It must not render
 * MarketingHeader, Footer or a main region of its own: the one main region is
 * here, and the "Skip to main content" link at the top of the document leads
 * to it. A page that wants the desk-coloured ground wraps its content in
 * `<div className="flex-1 aurora-bg">`.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh flex-col overflow-x-clip bg-background text-foreground">
      <MarketingHeader />
      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        {children}
      </main>
      <Footer />
    </div>
  );
}
