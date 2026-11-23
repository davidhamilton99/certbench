// @vitest-environment jsdom
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track, identifyUser: vi.fn() }));
// A press goes nowhere: the test's browser has no pages to open.
vi.mock("next/link", () => ({
  default: ({
    children,
    onClick,
    prefetch,
    ...rest
  }: { prefetch?: boolean | null; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      data-prefetch={String(prefetch)}
      {...rest}
      onClick={(event) => {
        onClick?.(event);
        event.preventDefault();
      }}
    >
      {children}
    </a>
  ),
  useLinkStatus: () => ({ pending: false }),
}));

import { PathCard } from "@/components/marketing/PathCard";
import { COLUMN, PAGE } from "@/components/marketing/lander/layout";

beforeEach(() => track.mockClear());

function band(props: Partial<Parameters<typeof PathCard>[0]> = {}) {
  return render(
    <PathCard
      kicker="Network+ study path"
      title="Study for Network+ in short steps"
      href="/path/network-plus-n10-009"
      label="Start the Network+ study path"
      context="subnet_calculator"
      {...props}
    >
      The study path covers every exam objective in short steps.
    </PathCard>
  );
}

describe("PathCard", () => {
  it("is the navy band with one heading, one sentence and one button onto the study path", () => {
    const { container } = band();
    const section = container.querySelector("section")!;
    expect(section).toHaveClass("cb-sheet");
    expect(screen.getByRole("heading", { level: 2, name: "Study for Network+ in short steps" })).toHaveClass(
      "cb-subsection",
      COLUMN
    );
    expect(screen.getByText("The study path covers every exam objective in short steps.")).toHaveClass("cb-measure");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Start the Network+ study path" })).toHaveAttribute(
      "href",
      "/path/network-plus-n10-009"
    );
    expect(screen.getByText("Network+ study path")).toBeInTheDocument();
    expect(screen.getByText("It is free, and you do not need an account to start.")).toBeInTheDocument();
  });

  it("is set left on the page's edge and runs the width of what holds it", () => {
    const { container } = band();
    const section = container.querySelector("section")!;
    expect(section.className).not.toMatch(/max-w-|mx-auto|rounded/);
    expect(section.firstElementChild).toHaveClass(...PAGE.split(" "), "justify-items-start", "text-left");
    expect(container.innerHTML).not.toMatch(/text-center|justify-items-center/);
  });

  it("lets a long title or button wrap inside the band on a narrow screen", () => {
    const { container } = band({ label: "Start the Network+ study path for the N10-009 exam" });
    // One column that can shrink, so nothing pushes past the band's edge.
    expect(container.querySelector("section")!.firstElementChild).toHaveClass("grid-cols-[minmax(0,1fr)]");
    const button = screen.getByRole("link");
    expect(button).toHaveClass("h-auto", "min-h-12", "whitespace-normal", "max-w-full");
    expect(button).not.toHaveClass("whitespace-nowrap");
  });

  it("counts a press for the page it is on", () => {
    band();
    fireEvent.click(screen.getByRole("link"));
    expect(track).toHaveBeenCalledWith("upsell_clicked", {
      context: "subnet_calculator",
      href: "/path/network-plus-n10-009",
    });
  });

  it("takes its own note, or none", () => {
    const { rerender } = band({ note: "You do not need an account to start." });
    expect(screen.getByText("You do not need an account to start.")).toBeInTheDocument();
    rerender(
      <PathCard title="Title" href="/start" label="Start" context="x" note={null}>
        Body
      </PathCard>
    );
    expect(screen.queryByText(/account to start/)).toBeNull();
  });
});
