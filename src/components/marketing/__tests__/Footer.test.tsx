// @vitest-environment jsdom
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

// The link as an anchor that shows what it was told about fetching its page early.
vi.mock("next/link", () => ({
  default: ({
    prefetch,
    children,
    ...rest
  }: { prefetch?: boolean | null; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a data-prefetch={String(prefetch)} {...rest}>
      {children}
    </a>
  ),
}));

import { Footer } from "@/components/marketing/Footer";

describe("Footer", () => {
  it("lists the free pages in five groups, with the pages about CertBench among them", () => {
    render(<Footer />);
    const nav = screen.getByRole("navigation", { name: "Free resources" });
    for (const title of ["Practice tests", "PBQ labs", "Tools", "Guides", "CertBench"]) {
      expect(within(nav).getByText(title)).toBeInTheDocument();
    }
    const hrefs = within(nav)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    for (const href of ["/pricing", "/about", "/educators", "/help", "/contact", "/terms", "/privacy"]) {
      expect(hrefs).toContain(href);
    }
    // No page is listed twice.
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("gives every link in the lists its own padding, so a thumb has room to land", () => {
    render(<Footer />);
    const links = within(screen.getByRole("navigation", { name: "Free resources" })).getAllByRole("link");
    expect(links.length).toBeGreaterThan(20);
    for (const link of links) {
      expect(link).toHaveClass("inline-block");
      expect(link).toHaveClass("py-1.5");
    }
  });

  it("fetches none of those pages until a visitor shows that they mean to open one", () => {
    render(<Footer />);
    const links = within(screen.getByRole("navigation", { name: "Free resources" })).getAllByRole("link");
    for (const link of links) expect(link).toHaveAttribute("data-prefetch", "false");
  });

  it("says on every page that CertBench is independent of CompTIA, at the width of a line that can be read", () => {
    render(<Footer />);
    const statement = screen.getByText(/CertBench is an independent study program\./);
    expect(statement).toHaveTextContent(
      "It is not affiliated with, endorsed by or sponsored by CompTIA."
    );
    expect(statement).toHaveTextContent("No question is taken from a real exam.");
    expect(statement).toHaveClass("cb-measure-sm");
  });

  it("gives the support address as an underlined link", () => {
    render(<Footer />);
    const mail = screen.getByRole("link", { name: "support@certbench.dev" });
    expect(mail).toHaveAttribute("href", "mailto:support@certbench.dev");
    expect(mail).toHaveClass("cb-link");
  });
});
