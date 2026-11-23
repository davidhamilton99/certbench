// @vitest-environment jsdom
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { OrderingScenario, PbqScenario, SimulationScenario, ThreatHuntScenario } from "@/data/pbq/types";

const track = vi.hoisted(() => vi.fn());
const preloadLab = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track }));
// The early fetch is watched; the loaders the lab player itself uses stay real.
vi.mock("@/components/workspace/pbq-host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/workspace/pbq-host")>()),
  preloadLab,
}));
// The link as an anchor. A press goes nowhere: the test's browser has no pages to open.
vi.mock("next/link", () => ({
  default: ({ children, ...rest }: { children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...rest}>{children}</a>
  ),
}));

import { firstSentence, PbqScenarios } from "../PbqScenarios";

const users: SimulationScenario = {
  type: "simulation",
  id: "sim-users",
  title: "New starters",
  briefing:
    "Contoso Ltd. has hired three new employees for the Marketing department. The IT manager has asked you to create their accounts.",
  domain_number: "2.0",
  domain_title: "Security",
  estimatedMinutes: 8,
  explanation: "Least privilege.",
  tasks: [],
};

const hunt: ThreatHuntScenario = {
  type: "threat-hunt",
  id: "hunt-ssh",
  title: "Compromised SSH server",
  briefing: "It is 02:10 and an alert fired on web-prod-01. Read the log below.",
  domain_number: "4.0",
  domain_title: "Security Operations",
  logSource: "/var/log/auth.log",
  lines: [{ text: "Failed password for root", malicious: true }],
  question: "What does this evidence indicate?",
  options: ["A brute-force attack", "A backup job"],
  correctOption: 0,
  explanation: "A burst of failures and then a sign-in.",
  estimatedMinutes: 1,
};

const dora: OrderingScenario = {
  type: "ordering",
  id: "dora",
  title: "DHCP DORA",
  description: "Put the four DHCP messages in order.",
  domain_number: "1.0",
  domain_title: "Networking Concepts",
  items: ["Discover", "Offer", "Request", "Acknowledge"],
  correct_order: [0, 1, 2, 3],
  explanation: "Discover, Offer, Request, Acknowledge.",
};

const osi: OrderingScenario = {
  ...dora,
  id: "osi",
  title: "OSI layers",
  description: "Put the OSI layers in order, from the lowest.",
  items: ["Physical", "Data link", "Network"],
  correct_order: [0, 1, 2],
};

const all: PbqScenario[] = [users, hunt, dora, osi];

afterEach(() => {
  track.mockClear();
  preloadLab.mockClear();
});

describe("a briefing's first sentence", () => {
  it("is whole: an abbreviation or an address inside it does not end it", () => {
    expect(firstSentence(users.briefing)).toBe(
      "Contoso Ltd. has hired three new employees for the Marketing department."
    );
    expect(firstSentence("The block is 192.168.10.0/24. Divide it into four subnets.")).toBe(
      "The block is 192.168.10.0/24."
    );
    expect(firstSentence("One sentence only.")).toBe("One sentence only.");
    expect(firstSentence("No full stop at the end")).toBe("No full stop at the end");
  });
});

describe("the workspace's labs", () => {
  it("lists the exam-style labs and the short drills as two tabs, each lab by domain with its kind in words", async () => {
    const user = userEvent.setup();
    render(<PbqScenarios scenarios={all} />);
    const tabs = within(screen.getByRole("tablist", { name: "Kind of lab" }));
    expect(tabs.getByRole("tab", { name: "Exam-style labs (2)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Domain 2: Security" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Domain 4: Security operations" })).toBeInTheDocument();

    const row = screen.getByRole("button", { name: /^New starters/ });
    // The kind and the time in words, and the briefing's first sentence, whole: nothing is cut short.
    expect(row).toHaveTextContent(
      "Simulation, 8 minutes. Contoso Ltd. has hired three new employees for the Marketing department."
    );
    expect(screen.getByRole("button", { name: /^Compromised SSH server/ })).toHaveTextContent("Threat hunt, 1 minute.");
    expect(document.body.textContent).not.toMatch(/…|~/);
    expect(screen.queryByText(/Included with Pro/)).toBeNull();

    await user.click(tabs.getByRole("tab", { name: "Short drills (2)" }));
    expect(screen.getByRole("heading", { name: "Domain 1: Networking concepts" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^DHCP DORA/ })).toHaveTextContent(
      "Ordering drill. Put the four DHCP messages in order."
    );
    expect(screen.queryByRole("button", { name: /^New starters/ })).toBeNull();
  });

  it("starts fetching a large player when its lab's row is hovered or takes the focus", () => {
    render(<PbqScenarios scenarios={all} />);
    fireEvent.pointerEnter(screen.getByRole("button", { name: /^New starters/ }));
    expect(preloadLab).toHaveBeenCalledWith("simulation");
    fireEvent.focus(screen.getByRole("button", { name: /^Compromised SSH server/ }));
    expect(preloadLab).toHaveBeenCalledWith("threat-hunt");
  });

  it("opens the first lab of each kind for a free account, and says in words which labs Pro includes", async () => {
    const user = userEvent.setup();
    render(<PbqScenarios scenarios={all} isPro={false} />);
    expect(screen.getByText("2 more labs are included with Pro.")).toBeInTheDocument();
    // What Pro adds, as the pricing page states it. Nothing here is called unlimited.
    expect(
      screen.getByText(
        "Pro includes every lab on this page, the whole study path and new timed practice exams, with no daily limit on practice questions."
      )
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/unlimited/i);
    expect(screen.getByRole("link", { name: "See what Pro includes" })).toHaveAttribute("href", "/upgrade?reason=pbq");

    expect(screen.getByRole("button", { name: /^New starters/ })).toBeInTheDocument();
    // A lab that Pro includes is a link to where Pro is described, and says so in its name.
    const locked = screen.getByRole("link", { name: /^Compromised SSH server.*Included with Pro$/ });
    expect(locked).toHaveAttribute("href", "/upgrade?reason=pbq");

    await user.click(screen.getByRole("tab", { name: "Short drills (2)" }));
    expect(screen.getByRole("button", { name: /^DHCP DORA/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^OSI layers.*Included with Pro$/ })).toBeInTheDocument();
  });

  it("opens a lab in place of the lists with the focus on its title, and returns the focus to its row", async () => {
    const user = userEvent.setup();
    render(<PbqScenarios scenarios={all} />);
    await user.click(screen.getByRole("tab", { name: "Short drills (2)" }));
    await user.click(screen.getByRole("button", { name: /^OSI layers/ }));

    expect(track).toHaveBeenCalledWith("pbq_started", { scenario_id: "osi", scenario_type: "ordering", surface: "authed" });
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByRole("heading", { name: "OSI layers" })).toHaveFocus();

    // The first move is recorded once, when it is made and not when the lab is shown.
    expect(track).not.toHaveBeenCalledWith("pbq_first_move", expect.anything());
    const choices = within(screen.getByRole("group", { name: "Choices to place" }));
    fireEvent.click(choices.getByRole("button", { name: "Physical" }));
    fireEvent.click(choices.getByRole("button", { name: "Network" }));
    expect(track.mock.calls.filter(([name]) => name === "pbq_first_move")).toEqual([
      ["pbq_first_move", { scenario_id: "osi", scenario_type: "ordering", surface: "authed" }],
    ]);

    await user.click(screen.getByRole("button", { name: "Return to the labs" }));
    // Something has been placed, so the lab asks first; the safe answer comes first and has the focus.
    const dialog = within(screen.getByRole("dialog", { name: "Do you want to leave this lab?" }));
    expect(dialog.getAllByRole("button").map((b) => b.textContent)).toEqual(["Stay in the lab", "Leave the lab"]);
    expect(dialog.getByRole("button", { name: "Stay in the lab" })).toHaveFocus();
    await user.click(dialog.getByRole("button", { name: "Leave the lab" }));
    // The list is back on the tab it was left on, and the focus is on the row that opened the lab.
    expect(screen.getByRole("tab", { name: "Short drills (2)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: /^OSI layers/ })).toHaveFocus();
  });

  it("offers Pro to a free account under the score of a finished lab, in the same words", async () => {
    const user = userEvent.setup();
    render(<PbqScenarios scenarios={all} isPro={false} />);
    await user.click(screen.getByRole("tab", { name: "Short drills (2)" }));
    await user.click(screen.getByRole("button", { name: /^DHCP DORA/ }));
    const choices = within(screen.getByRole("group", { name: "Choices to place" }));
    for (const item of dora.items) fireEvent.click(choices.getByRole("button", { name: item }));
    fireEvent.click(screen.getByRole("button", { name: "Check my order" }));

    expect(screen.getByRole("heading", { name: "You have completed this lab." })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Pro includes all 4 labs for this exam, the whole study path and new timed practice exams, with no daily limit on practice questions."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See what Pro includes" })).toHaveAttribute("href", "/upgrade?reason=pbq");
    expect(track).toHaveBeenCalledWith("upsell_viewed", { context: "authed_pbq" });
  });

  it("shows one list with no tabs when an exam has labs of one kind only", () => {
    render(<PbqScenarios scenarios={[dora, osi]} />);
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByRole("button", { name: /^DHCP DORA/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^OSI layers/ })).toBeInTheDocument();
  });
});
